import importlib.util, json, pathlib, tempfile, unittest, subprocess, sys, time, os
helper=pathlib.Path(__file__).parent/'syntropy-dispatch.py'
if not helper.exists():helper=pathlib.Path(__file__).parents[1]/'syntropy-dispatch.py'
spec=importlib.util.spec_from_file_location('dispatch',helper)
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
class QueueTests(unittest.TestCase):
 def test_append_only_ingestion_dedup_partial_and_arrivals(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp); box=root/'mailbox'; db=d.open_db(root/'state.db')
   old=json.dumps({'timestamp':'a','message':'old'})+'\n'
   box.write_text(old+'{"message":"partial')
   d.ingest(db,box);self.assertEqual(db.execute('select count(*) from tasks').fetchone()[0],1)
   with box.open('a') as f:f.write('"}\n'+json.dumps({'timestamp':'b','message':'new'})+'\n')
   d.ingest(db,box);d.ingest(db,box)
   self.assertEqual(db.execute('select count(*) from tasks').fetchone()[0],3)
   self.assertTrue(box.read_text().startswith(old))
 def test_completion_requires_terminal_marker_and_correct_agent(self):
  task='abc';marker={'taskId':task,'status':'completed','outcome':'verified'}
  events=[{'type':'text','part':{'messageID':'m','text':'SYNTROPY_RESULT '+json.dumps(marker)}},{'type':'step_finish','sessionID':'ses_test','part':{'messageID':'m','reason':'tool-calls'}}]
  self.assertIsNone(d.completion(events,task))
  events[-1]['part']['reason']='stop'
  self.assertEqual(d.completion(events,task)['outcome'],'verified')
  events.append({'type':'error','error':'oops'});self.assertIsNone(d.completion(events,task))
 def test_stale_marker_from_prior_turn_is_not_completion(self):
  marker='SYNTROPY_RESULT '+json.dumps({'taskId':'a','status':'completed','outcome':'old'})
  events=[{'type':'text','part':{'messageID':'old','text':marker}},{'type':'step_finish','part':{'messageID':'old','reason':'tool-calls'}},{'type':'text','part':{'messageID':'new','text':'still investigating'}},{'type':'step_finish','part':{'messageID':'new','reason':'stop'}}]
  self.assertIsNone(d.completion(events,'a'))
 def test_partial_outbox_is_quarantined_and_republished(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);db=d.open_db(root/'state.db');db.execute("insert into tasks(id,entry,status,outcome) values ('a','{}','completed','verified')");db.commit()
   path=root/'syntropy-results.jsonl';path.write_text('{"taskId":"a"')
   d.publish_results(db,root);d.publish_results(db,root)
   entries=[json.loads(l) for l in path.read_text().splitlines()];self.assertEqual(len(entries),1);self.assertEqual(entries[0]['taskId'],'a')
   self.assertTrue((root/'syntropy-results.jsonl.partial').exists())
 def test_retry_hold_and_restart_do_not_repeat_forever(self):
  with tempfile.TemporaryDirectory() as tmp:
   db=d.open_db(pathlib.Path(tmp)/'state.db');db.execute('insert into tasks(id,entry) values (?,?)',('a','{}'));db.commit()
   d.record_failure(db,'a','timeout',10);r=db.execute('select * from tasks').fetchone()
   self.assertEqual((r['status'],r['attempts'],r['next_at']),('pending',1,3610))
   d.record_failure(db,'a','timeout',4000);r=db.execute('select * from tasks').fetchone()
   self.assertEqual((r['status'],r['attempts']),('held',2))
   db.execute("update tasks set status='running'");db.commit();d.recover(db)
   self.assertEqual(db.execute('select status from tasks').fetchone()[0],'held')
 def test_owned_process_group_is_killed_on_timeout(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'out'; pidfile=pathlib.Path(tmp)/'pid'
   code="import subprocess,time,pathlib,sys; p=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); pathlib.Path(sys.argv[1]).write_text(str(p.pid)); time.sleep(60)"
   result=d.run_command([sys.executable,'-c',code,str(pidfile)],pathlib.Path(tmp),out,timeout=.5,idle_timeout=2,max_input=100000)
   self.assertEqual(result['code'],124)
   pid=int(pidfile.read_text());status=pathlib.Path(f'/proc/{pid}/stat')
   # Signals are asynchronous; allow the owned descendant to reach exit/zombie.
   deadline=time.monotonic()+2
   while status.exists() and status.read_text().split()[2]!='Z' and time.monotonic()<deadline:time.sleep(.02)
   self.assertTrue(not status.exists() or status.read_text().split()[2]=='Z')
 def test_subprocess_pwd_matches_project_not_cron_home(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'out';r=d.run_command([sys.executable,'-c','import os; print(os.getcwd()); print(os.environ["PWD"])'],pathlib.Path(tmp),out,timeout=2)
   self.assertEqual(out.read_text().splitlines(),[tmp,tmp])
 def test_wrong_agent_banner_and_token_budget_fail_closed(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'out'
   r=d.run_command([sys.executable,'-c','print(\'agent "syntropy-admin" not found. Falling back to default agent\')'],pathlib.Path(tmp),out,timeout=2,idle_timeout=2,max_input=100000)
   self.assertEqual(r['failure'],'agent_mismatch')
   e={'type':'step_finish','part':{'tokens':{'input':2,'cache':{'read':120000}},'reason':'stop'}}
   r=d.run_command([sys.executable,'-c','print('+repr(json.dumps(e))+')'],pathlib.Path(tmp),out,timeout=2,idle_timeout=2,max_input=100000)
   self.assertEqual(r['failure'],'context_budget')
 def test_dispatch_completed_once_and_preserves_new_arrival(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);data=root/'data';data.mkdir();box=data/'syntropy-mailbox.jsonl'
   box.write_text(json.dumps({'timestamp':'a','message':'read-only smoke'})+'\n');calls=[]
   def runner(argv,cwd,out,**kw):
    calls.append((argv,cwd));task=json.loads(argv[-1].split('TASK_RECORD\n')[1].split('\nEND_TASK_RECORD')[0])['taskId']
    with box.open('a') as f:f.write(json.dumps({'timestamp':'b','message':'second arrival'})+'\n')
    return {'code':0,'failure':None,'text':'','events':[{'type':'text','part':{'messageID':'m','text':'SYNTROPY_RESULT '+json.dumps({'taskId':task,'status':'completed','outcome':'real evidence'})}},{'type':'step_finish','sessionID':'ses_fixture','part':{'messageID':'m','reason':'stop'}}]}
   self.assertEqual(d.dispatch_once(root,data,runner=runner,verify=lambda *a:True),0)
   self.assertEqual(len(calls),1);self.assertEqual(calls[0][1],root)
   self.assertFalse(any(x.startswith('--session') for x in calls[0][0]))
   self.assertIn('second arrival',box.read_text())
   db=d.open_db(data/'syntropy-dispatch-state.db');self.assertEqual(db.execute('select status from tasks').fetchone()[0],'completed')
   box.write_text(json.dumps({'timestamp':'a','message':'read-only smoke'})+'\n')
   d.dispatch_once(root,data,runner=runner,verify=lambda *a:True);self.assertEqual(len(calls),1)
 def test_partial_work_is_held_not_automatically_replayed(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);data=root/'data';data.mkdir();box=data/'syntropy-mailbox.jsonl';box.write_text('{"message":"task"}\n')
   runner=lambda *a,**k:{'code':124,'failure':'timeout','text':'','events':[{'type':'tool_use'}]}
   d.dispatch_once(root,data,runner=runner,verify=lambda *a:True)
   db=d.open_db(data/'syntropy-dispatch-state.db');self.assertEqual(db.execute('select status from tasks').fetchone()[0],'held')
   self.assertEqual(box.read_text(),'{"message":"task"}\n')
class V2RouteTests(unittest.TestCase):
 def test_v2_persisted_assistant_route_and_rejections(self):
  import sqlite3
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as tmp:
   home=pathlib.Path(tmp); db=home/'.local/share/opencode/opencode.db';db.parent.mkdir(parents=True)
   with sqlite3.connect(db) as c:
    c.execute('create table session_message (id text, session_id text, type text, seq integer, data text)')
    msg={'agent':'developero','model':{'providerID':'zai-coding-plan','id':'glm-5.3'},'finish':'stop','time':{'completed':1}}
    c.execute('insert into session_message values (?,?,?,?,?)',('m','s','assistant',1,json.dumps(msg)))
   with patch.object(pathlib.Path,'home',return_value=home):
    self.assertTrue(d.verify_route('s','developero','zai-coding-plan/glm-5.3'))
    self.assertFalse(d.verify_route('s','build','zai-coding-plan/glm-5.3'))
    self.assertFalse(d.verify_route('s','developero','zai/glm-5.3'))
    self.assertFalse(d.verify_route('missing','developero','zai-coding-plan/glm-5.3'))
class V2CompletionTests(unittest.TestCase):
 def test_missing_message_ids_cannot_reuse_a_prior_marker(self):
  marker='SYNTROPY_RESULT '+json.dumps({'taskId':'task','status':'completed','outcome':'old'})
  events=[{'type':'text','part':{'text':marker}}, {'type':'step_finish','part':{'reason':'tool-calls'}}, {'type':'text','part':{'text':'still working'}}, {'type':'step_finish','part':{'reason':'stop'}}]
  self.assertIsNone(d.completion(events,'task'))
 def test_missing_finish_requires_matching_persisted_completed_and_idle_turn(self):
  import sqlite3
  from contextlib import closing
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as tmp:
   home=pathlib.Path(tmp);db=home/'.local/share/opencode/opencode.db';db.parent.mkdir(parents=True)
   marker='SYNTROPY_RESULT '+json.dumps({'taskId':'task','status':'completed','outcome':'actual probe'})
   msg={'agent':'developero','model':{'id':'glm-5.3','providerID':'zai-coding-plan'},'time':{'completed':1},'finish':'stop','content':[{'type':'text','text':marker}]}
   events=[{'type':'text','sessionID':'s','part':{'messageID':'m','text':marker}}]
   with closing(sqlite3.connect(db)) as c:
    c.execute('create table session_message (id text, session_id text, type text, seq integer, data text)')
    c.execute('insert into session_message values (?,?,?,?,?)',('m','s','assistant',1,json.dumps(msg)))
    c.execute('insert into session_message values (?,?,?,?,?)',('idle','s','idle',2,json.dumps({'outcome':'succeeded'})));c.commit()
    with patch.object(pathlib.Path,'home',return_value=home):
     self.assertIsNotNone(d.completion(events,'task'))
     self.assertEqual(d.completion(events,'task')['outcome'],'actual probe')
     self.assertIsNone(d.completion(events+[{'type':'error'}],'task'))
     self.assertIsNone(d.completion([{'type':'text','sessionID':'s','part':{'messageID':'stale','text':marker}}],'task'))
     for field,value in [('finish','tool-calls'),('time',{}),('content',[{'type':'text','text':'still working'}])]:
      changed=dict(msg);changed[field]=value;c.execute('update session_message set data=? where id=?',(json.dumps(changed),'m'));c.commit()
      self.assertIsNone(d.completion(events,'task'))
     c.execute('update session_message set data=? where id=?',(json.dumps(msg),'m'))
     c.execute('update session_message set data=? where id=?',(json.dumps({'outcome':'failed'}),'idle'));c.commit()
     self.assertIsNone(d.completion(events,'task'))
     c.execute('delete from session_message where id=?',('idle',));c.commit()
     self.assertIsNone(d.completion(events,'task'))
if __name__=='__main__':unittest.main()
