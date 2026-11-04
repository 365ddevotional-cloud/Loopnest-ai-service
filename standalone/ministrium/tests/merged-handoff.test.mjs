import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {registerMergedHandoff,mergedOrigin} from '../server/merged-handoff.mjs';
test('old ministry address forwards safely and disables its API writes',async()=>{
 assert.throws(()=>mergedOrigin('http://example.com'));assert.throws(()=>mergedOrigin('https://example.com/extra'));
 const app=express();registerMergedHandoff(app,'https://covenanthub-recovery.up.railway.app');
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
 try{
 for(const [path,destination] of [['/','/ministry-account'],['/join','/community/join'],['/workspace/abc/study','/community/workspace/abc/study'],['/unknown?redirect=https://evil.example','/community/workspace']]){const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://covenanthub-recovery.up.railway.app'+destination);assert.equal(response.headers.get('cache-control'),'no-store');}
 assert.equal((await fetch(base+'/api/workspaces',{method:'POST'})).status,410);assert.equal((await(await fetch(base+'/api/health')).json()).mode,'merged');assert.match(await(await fetch(base+'/sw.js')).text(),/unregister/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
