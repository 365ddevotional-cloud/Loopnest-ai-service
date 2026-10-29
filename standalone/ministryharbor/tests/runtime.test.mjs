import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('standalone preview serves UI while isolating data and payment APIs',async()=>{
 const env={...process.env,PORT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('MINISTRYHARBOR_'))delete env[key];
 env.DATABASE_URL='postgres://must-never-connect.invalid/production';
 const child=spawn(process.execPath,['dist/server.cjs'],{env,stdio:['ignore','pipe','pipe']});
 try{
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Server startup timed out')),10000);
   child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}`));});
   child.stdout.on('data',chunk=>{const match=String(chunk).match(/listening on (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
  });
  const base=`http://127.0.0.1:${port}`;
  const health=await fetch(`${base}/api/health`).then(r=>r.json());
  assert.equal(health.mode,'preview');assert.equal(health.paymentsEnabled,false);
  for(const path of ['/api/music','/api/admin/churches','/api/unknown'])assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(`${base}/api/churches`)).status,503);
  assert.equal((await fetch(`${base}/api/churches/123/giving/create-session`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  const page=await fetch(`${base}/preview`);assert.equal(page.status,200);assert.match(await page.text(),/MinistryHarbor/);
 }finally{child.kill();}
});
