#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function getUrl(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        }).on('error', (err) => {
            resolve({ error: err.message });
        });
    });
}

async function run() {
    console.log('# Pixel Ecosystem Status Report');
    console.log(`Generated on: ${new Date().toLocaleString()}`);
    console.log('');

    // 1. System Resources
    console.log('## 💻 System Resources');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    console.log(`- **CPU Load**: ${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)} (${cpus.length} cores)`);
    console.log(`- **Memory**: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB (${memPercent}%)`);
    console.log(`- **Uptime**: ${(os.uptime() / 3600 / 24).toFixed(1)} days`);
    console.log('');

    // 2. PM2 Services
    console.log('## 🔄 Service Status (PM2)');
    try {
        const pm2List = JSON.parse(execSync('pm2 jlist').toString());
        console.log('| Service | Status | CPU | Memory | Restarts | Uptime |');
        console.log('|---------|--------|-----|--------|----------|--------|');
        pm2List.forEach(app => {
            const uptime = app.pm2_env.status === 'online' 
                ? ((Date.now() - app.pm2_env.pm_uptime) / 1000 / 3600).toFixed(1) + 'h'
                : '0';
            const mem = (app.monit.memory / 1024 / 1024).toFixed(1) + 'MB';
            console.log(`| ${app.name} | ${app.pm2_env.status} | ${app.monit.cpu}% | ${mem} | ${app.pm2_env.restart_time} | ${uptime} |`);
        });
    } catch (e) {
        console.log('Error fetching PM2 status: ' + e.message);
    }
    console.log('');

    // 3. API & Database
    console.log('## 📊 API & Database');
    const apiHealth = await getUrl('http://127.0.0.1:3000/health');
    if (apiHealth.error) {
        console.log(`- **LNPixels API**: ❌ Offline (${apiHealth.error})`);
    } else {
        console.log(`- **LNPixels API**: ✅ Online (v${apiHealth.env || 'unknown'})`);
        console.log(`- **Total Pixels**: ${apiHealth.pixels || 0}`);
    }
    console.log('');

    // 4. Project Configuration Sanity
    console.log('## 🛠️ Configuration Sanity');
    const agentPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'pixel-agent', 'package.json')));
    const agentChar = path.join(__dirname, 'pixel-agent', 'src', 'character', 'settings.ts');
    
    console.log(`- **Agent Version**: ${agentPackage.version}`);
    
    if (fs.existsSync(agentChar)) {
        const charContent = fs.readFileSync(agentChar, 'utf8');
        const hasDeepseek = charContent.includes('deepseek/deepseek-r1:free');
        console.log(`- **Default Model**: ${hasDeepseek ? '✅ deepseek-r1:free' : '⚠️ Non-standard'}`);
    }

    console.log('\n---');
    console.log('*Keep painting. Keep coding. Keep surviving.*');
}

run().catch(console.error);
