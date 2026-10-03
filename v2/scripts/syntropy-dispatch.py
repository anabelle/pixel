#!/usr/bin/env python3
"""Bounded Syntropy task dispatch. Inbox is append-only; SQLite owns acknowledgement."""
import argparse, fcntl, hashlib, json, os, pathlib, re, signal, sqlite3, subprocess, sys, time

def open_db(path):
    c=sqlite3.connect(path);c.row_factory=sqlite3.Row
    c.execute('PRAGMA journal_mode=WAL');c.execute('PRAGMA synchronous=FULL')
    c.execute('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, entry TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pending", attempts INTEGER NOT NULL DEFAULT 0, next_at REAL NOT NULL DEFAULT 0, outcome TEXT, session TEXT, updated REAL NOT NULL DEFAULT 0)')
    return c

def ingest(db, inbox):
    if not inbox.exists(): return
    # Producers append complete JSONL records. Never rename/truncate their file.
    with inbox.open('rb') as f:
        for raw in f:
            if not raw.endswith(b'\n'): break
            try:
                entry=json.loads(raw)
                if not isinstance(entry,dict) or not (entry.get('message') or entry.get('summary')): continue
            except (ValueError,UnicodeDecodeError): continue
            task_id=hashlib.sha256(raw.strip()).hexdigest()
            db.execute('INSERT OR IGNORE INTO tasks(id,entry) VALUES (?,?)',(task_id,json.dumps(entry)))
    db.commit()

def completion(events, task_id):
    if any(e.get('type')=='error' for e in events): return None
    finishes=[e for e in events if e.get('type')=='step_finish']
    if not finishes or finishes[-1].get('part',{}).get('reason')!='stop': return None
    final_id=finishes[-1].get('part',{}).get('messageID')
    # OpenCode attaches the assistant message ID to text and its finish event.
    text='\n'.join(e.get('part',{}).get('text','') for e in events if e.get('type')=='text' and e.get('part',{}).get('messageID')==final_id)
    results=[]
    for line in text.splitlines():
        if not line.startswith('SYNTROPY_RESULT '): continue
        try: result=json.loads(line[len('SYNTROPY_RESULT '):])
        except ValueError: continue
        if result.get('taskId')==task_id and result.get('status') in ('completed','blocked','abandoned') and result.get('outcome'):
            results.append(result)
    return results[-1] if results else None

def record_failure(db, task_id, why, now=None):
    now=time.time() if now is None else now
    row=db.execute('select attempts from tasks where id=?',(task_id,)).fetchone()
    attempts=row['attempts']+1
    db.execute('update tasks set status=?,attempts=?,next_at=?,outcome=?,updated=? where id=?',('held' if attempts>=2 else 'pending',attempts,now+3600,why,now,task_id));db.commit()

def recover(db):
    # A crashed process may have already made external changes: never replay blindly.
    db.execute("update tasks set status='held',outcome='Interrupted run: inspect evidence before requeue' where status='running'");db.commit()

def parse_output(path):
    text=path.read_text(errors='replace');events=[]
    for line in text.splitlines():
        try:
            e=json.loads(line)
            if isinstance(e,dict):events.append(e)
        except ValueError: pass
    return text,events

def stop_group(process):
    # This group was created by us; never touch unrelated OpenCode/Pixel processes.
    try: os.killpg(process.pid,signal.SIGTERM)
    except ProcessLookupError: return
    try: process.wait(timeout=3)
    except subprocess.TimeoutExpired: pass
    try: os.killpg(process.pid,signal.SIGKILL)
    except ProcessLookupError: pass
    process.wait()

def run_command(argv,cwd,output,timeout=900,idle_timeout=180,max_input=100000):
    start=time.monotonic();last=start;size=0;failure=None;events=[]
    with output.open('wb') as stream:
        env=os.environ.copy();env['PWD']=str(cwd)
        process=subprocess.Popen(argv,cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
        try:
            while True:
                now=time.monotonic();newsize=output.stat().st_size
                if newsize!=size:size=newsize;last=now
                text,events=parse_output(output)
                if 'not found. Falling back to default agent' in text:failure='agent_mismatch'
                for e in events:
                    t=e.get('part',{}).get('tokens',{});cache=t.get('cache',{})
                    if t.get('input',0)+cache.get('read',0)+cache.get('write',0)>max_input:failure='context_budget'
                if failure:stop_group(process);break
                if process.poll() is not None:break
                if now-start>timeout or now-last>idle_timeout:
                    failure='timeout' if now-start>timeout else 'inactivity';stop_group(process);break
                time.sleep(.1)
        finally:
            if process.poll() is None:stop_group(process)
    text,events=parse_output(output)
    return {'code':124 if failure in ('timeout','inactivity') else process.returncode,'failure':failure,'events':events,'text':text}

def verify_route(session,agent,model):
    path=pathlib.Path.home()/'.local/share/opencode/opencode.db'
    try:
        with sqlite3.connect(f'file:{path}?mode=ro',uri=True) as db:
            rows=db.execute('select data from message where session_id=?',(session,)).fetchall()
        assistants=[json.loads(r[0]) for r in rows if json.loads(r[0]).get('role')=='assistant']
        return bool(assistants) and all(m.get('agent')==agent and m.get('modelID')==model.split('/',1)[1] and m.get('providerID')==model.split('/',1)[0] for m in assistants)
    except (sqlite3.Error,ValueError,IndexError):return False

def log(data,msg):
    with (data/'syntropy-dispatch.log').open('a') as f:f.write(time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' [dispatch] '+msg+'\n')

def publish_results(db,data):
    path=data/'syntropy-results.jsonl';seen=set()
    if path.exists():
        raw=path.read_bytes()
        if raw and not raw.endswith(b'\n'):
            end=raw.rfind(b'\n')+1;tail=raw[end:]
            with path.with_name(path.name+'.partial').open('ab') as f:f.write(tail+b'\n');f.flush();os.fsync(f.fileno())
            # Only dispatcher writes this outbox, under the stable dispatch lock.
            with path.open('r+b') as f:f.truncate(end);f.flush();os.fsync(f.fileno())
        for line in path.read_text().splitlines():
            try:seen.add(json.loads(line).get('taskId'))
            except ValueError:pass
    for r in db.execute("select * from tasks where status in ('completed','blocked','abandoned','held')"):
        if r['id'] in seen:continue
        entry=json.loads(r['entry']);message=entry.get('message',entry.get('summary',''))
        project=re.search(r'^PROJECT_ID:\s*(\S+)',message,re.M);title=re.search(r'^PROJECT:\s*(.+)',message,re.M)
        result={'taskId':r['id'],'timestamp':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'status':'blocked' if r['status']=='held' else r['status'],'outcome':r['outcome'],'session':r['session']}
        if project:result['projectId']=project.group(1)
        if title:result['title']=title.group(1)
        with path.open('a') as f:f.write(json.dumps(result)+'\n');f.flush();os.fsync(f.fileno())
        seen.add(r['id'])

def dispatch_once(root,data,runner=run_command,verify=verify_route,timeout=900):
    data.mkdir(parents=True,exist_ok=True)
    with (data/'.syntropy-dispatch.lock').open('a+') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return 0
        db=open_db(data/'syntropy-dispatch-state.db');recover(db)
        ingest(db,data/'syntropy-mailbox.jsonl');publish_results(db,data)
        row=db.execute("select * from tasks where status='pending' and next_at<=? order by rowid limit 1",(time.time(),)).fetchone()
        if row is None:db.close();return 0
        task_id=row['id'];entry=json.loads(row['entry']);message=entry.get('message',entry.get('summary',''))
        agent='developero' if message.startswith('[for-developero]') else 'syntropy-admin'
        cwd=root if agent=='syntropy-admin' else pathlib.Path('/home/pixel/developero')
        model='zai-coding-plan/glm-5.3'
        record={'taskId':task_id,'entry':entry}
        prompt=('BOUNDED MAILBOX TASK. Fresh session; keep evidence on disk, not old chat. Handle only this task. '
                'Inspect relevant state before changes; preserve Pixel identity, keys, relay, blackout protections, and other agents. '
                'Do not touch or clear any mailbox, result queue, or dispatcher ledger. No broad process kills or unrelated commits. '
                'No subagents/workers. Vague co-admin or governance requests mean scoped runbooks and read-only verification of existing duties, not production deployments, credential changes, or modifying unrelated services. '
                'Commit only your changed files if useful, never automatic staging of unrelated work. '
                'Verify actual outcome with tools. If blocked, report it honestly and stop. Historical agent instructions about clearing mailbox or appending /app/data results are obsolete. '
                'This dispatcher owns results publication. Finish with ONE line: SYNTROPY_RESULT {"taskId":"'+task_id+'","status":"completed|blocked|abandoned","outcome":"actual evidence and remaining work"}. '
                'Choose exactly one status. Never claim completed from intentions.\nTASK_RECORD\n'+json.dumps(record)+'\nEND_TASK_RECORD')
        if len(prompt)>24000:
            db.execute("update tasks set status='held',outcome='Oversized task briefing; split into bounded tasks',updated=? where id=?",(time.time(),task_id));db.commit();publish_results(db,data);return 1
        db.execute("update tasks set status='running',updated=? where id=?",(time.time(),task_id));db.commit()
        output=data/('syntropy-task-'+task_id[:16]+'-'+str(row['attempts']+1)+'.jsonl')
        log(data,'START '+task_id[:16]+' agent='+agent+' model='+model+' fresh_session=true')
        try:
            result=runner(['/home/pixel/.opencode/bin/opencode','run','--agent='+agent,'--model='+model,'--title=Syntropy bounded task '+task_id[:12],'--format=json',prompt],cwd,output,timeout=timeout)
            sessions=[e.get('sessionID') for e in result['events'] if e.get('sessionID')];session=sessions[-1] if sessions else None
            final=completion(result['events'],task_id)
            verified=bool(session and verify(session,agent,model))
            if result['code']==0 and not result['failure'] and final and verified:
                db.execute('update tasks set status=?,attempts=attempts+1,outcome=?,session=?,updated=? where id=?',(final['status'],final['outcome'],session,time.time(),task_id));db.commit()
                log(data,'RESULT '+task_id[:16]+' '+final['status']+' session='+session)
                code=0
            else:
                why='exit='+str(result['code'])+' reason='+str(result['failure'])+' completion='+str(bool(final))+' route_verified='+str(verified)+'; evidence='+str(output)
                touched=any(e.get('type')=='tool_use' for e in result['events'])
                if touched or result['failure'] in ('agent_mismatch','context_budget') or (final and not verified):
                    db.execute("update tasks set status='held',attempts=attempts+1,outcome=?,session=?,updated=? where id=?",(why,session,time.time(),task_id));db.commit()
                else:record_failure(db,task_id,why)
                log(data,'FAILED '+task_id[:16]+' '+why);code=1
        except (Exception,KeyboardInterrupt) as exc:
            db.execute("update tasks set status='held',outcome=?,updated=? where id=?",('Interrupted/error: '+str(exc)[:500],time.time(),task_id));db.commit();code=1
        publish_results(db,data);db.close();return code

def main():
    p=argparse.ArgumentParser();p.add_argument('--data-dir',type=pathlib.Path,default=pathlib.Path('/home/pixel/pixel/v2/data'));p.add_argument('--timeout',type=int,default=900)
    args=p.parse_args()
    signal.signal(signal.SIGTERM,lambda *_: (_ for _ in ()).throw(KeyboardInterrupt('SIGTERM')))
    return dispatch_once(pathlib.Path('/home/pixel/pixel'),args.data_dir,timeout=args.timeout)
if __name__=='__main__':sys.exit(main())
