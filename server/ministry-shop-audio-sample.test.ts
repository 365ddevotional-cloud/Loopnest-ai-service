import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {generateKeyPairSync} from 'node:crypto';
import {PgDialect} from 'drizzle-orm/pg-core';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
process.env.DATABASE_URL='postgres://fixture:fixture@localhost/unused';
const {db,pool}=await import('./db');
const {registerShopAudiobooks}=await import('./ministry-shop-audio');
test('small voice-test budget reserves only its excerpt, caches replay and cannot enable sales',async()=> {
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 Object.assign(process.env,{SHOP_AUDIO_ENABLED:'true',SHOP_AUDIO_SAMPLE_ONLY:'true',SHOP_AUDIO_CHARACTER_BUDGET:'2000',SHOP_AUDIO_GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'fixture@example.com',project_id:'fixture',private_key:privateKey.export({type:'pkcs8',format:'pem'})})});
 const edition={id:'edition',product_id:'book',asset_sha256:'a'.repeat(64),title:'Book',reviewed:true,audio_reviewed:true,paragraphs:[{id:'sample',text:'a'.repeat(500)},{id:'b',text:'b'.repeat(1800)},{id:'c',text:'c'.repeat(3000)}]};
 const budgets=new Map<string,number>();const segments=new Map<string,any>();let generated=0;
 const dialect=new PgDialect();
 const execute=async(query:any)=> {
  const {sql:q,params:p}=dialect.sqlToQuery(query);
  if(q.includes('FROM ministry_shop_reader_editions WHERE id='))return {rows:[edition]};
  if(q.includes('pg_advisory_xact_lock'))return {rows:[]};
  if(q.includes('SELECT cache_id FROM ministry_shop_audio_budgets'))return {rows:budgets.has(p[0] as string)?[{cache_id:p[0]}]:[]};
  if(q.includes('SUM(characters)'))return {rows:[{total:String([...budgets.values()].reduce((a,b)=>a+b,0))}]};
  if(q.includes('INSERT INTO ministry_shop_audio_budgets')){budgets.set(p[0] as string,Number(p[1]));return {rows:[]};}
  if(q.includes('SELECT status,object_key'))return {rows:segments.has(p[0] as string)?[segments.get(p[0] as string)]:[]};
  if(q.includes('INSERT INTO ministry_shop_audio_segments')){if(segments.has(p[0] as string))return {rows:[]};segments.set(p[0] as string,{status:'generating'});return {rows:[{id:p[0]}]};}
  if(q.includes("SET status='ready'")){segments.set(p[1] as string,{status:'ready',object_key:p[0]});return {rows:[]};}
  if(q.includes('SET sample_ready=true'))return {rows:[]};
  throw new Error('Unexpected fixture query '+q);
 };
 const dbMock=mock.method(db,'execute',execute);const txMock=mock.method(db,'transaction',async(fn:any)=>fn({execute}));
 const storage=mock.method(S3Client.prototype,'send',async(command:any)=>{assert.ok(command instanceof PutObjectCommand);return {};});
 const app=express();app.use(express.json());
 const api=registerShopAudiobooks(app,{viewer:async()=>({uid:'fixture'}),confirm:async o=>o,requireAdmin:(req,res,next)=>req.get('x-admin')==='fixture'?next():res.sendStatus(401),r2:new S3Client({region:'auto',endpoint:'https://fixture.r2.cloudflarestorage.com',credentials:{accessKeyId:'fixture',secretAccessKey:'fixture'}}),bucket:'private-fixture',synthesize:async()=>{generated++;return Buffer.from('ID3fixture');}});
 const sample=(paragraphId:string)=>request(app).post('/api/admin/ministry-shop/audiobooks/edition/sample').set('x-admin','fixture').send({paragraphId});
 try {
  assert.equal(api.ready(edition),false,'sample-only setup must not advertise paid audio');
  const first=await sample('sample');assert.equal(first.status,200);assert.match(first.body.url,/shop-audio/);assert.equal(generated,1);
  assert.equal([...budgets.values()].reduce((a,b)=>a+b,0),500,'must not reserve the whole 5,300-character book');
  assert.equal((await sample('sample')).status,200);assert.equal(generated,1,'replay must not cost another synthesis');
  assert.equal((await sample('b')).status,409,'another passage exceeding the remaining budget is refused before generation');assert.equal(generated,1);
  assert.equal((await request(app).post('/api/admin/ministry-shop/audiobooks/edition/sample').send({paragraphId:'sample'})).status,401);
 }finally{dbMock.mock.restore();txMock.mock.restore();storage.mock.restore();await pool.end();}
});
