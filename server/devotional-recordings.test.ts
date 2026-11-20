import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {createHash} from 'node:crypto';
import {registerDevotionalRecordings, privateRecordingStore, type RecordingManifest, type RecordingStore} from './devotional-recordings';
import {devotionalRecordingSnapshot} from '../shared/devotional-recording';
import pilot from './content-translations/2026-11-19-glorious-light.json';

function fixture(language='yo') {
  let source:any=structuredClone(pilot.source), translation:any={...pilot.source,...pilot.drafts.find(d=>d.language==='yo'),_translatedTo:'yo'};
  const manifests=new Map<string,{manifest:RecordingManifest;etag:string}>(),audio=new Map<string,Buffer>();
  let sequence=0, signs=0, conflict=false;
  const store:RecordingStore={
    read:async key=>structuredClone(manifests.get(key)??null),
    saveAudio:async(key,bytes)=>{audio.set(key,bytes);},
    saveManifest:async(key,manifest,etag)=>{
      if(conflict || manifests.get(key)?.etag!==etag)throw Object.assign(new Error('fixture conflict'),{$metadata:{httpStatusCode:412}});
      manifests.set(key,{manifest,etag:String(++sequence)});
    },
    signAudio:async key=>{assert.ok(audio.has(key));signs++;return 'https://private.example.invalid/recording?expires=120';},
  };
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{(req as any).session={isAdmin:req.get('x-admin')==='fixture'};next();});
  registerDevotionalRecordings(app,{
    requireAdmin:(req,res,next)=>req.session.isAdmin?next():void res.sendStatus(401),store,
    readSource:async()=>source,translate:async(s,lang)=>lang==='en'?s:translation,today:()=> '2026-11-19',
  });
  if(language==='ig') translation={...translation,_translatedTo:'ig'};
  const base=`/api/admin/devotional-recordings/318/${language}`;
  const version=()=>createHash('sha256').update(devotionalRecordingSnapshot(translation,language)).digest('hex');
  const mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(256)]);
  const upload=(bytes=mp3)=>request(app).post(`${base}?version=${version()}`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').set('Content-Type','audio/mpeg').send(bytes);
  const publish=(audioHash:string,extra:any={})=>request(app).patch(base).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:version(),audioHash,published:true,reviewed:true,rightsConfirmed:true,...extra});
  return {app,base,version,upload,publish,manifests,audio,setSource:(s:any)=>source=s,setTranslation:(s:any)=>translation=s,setConflict:()=>conflict=true,signs:()=>signs};
}

test('Igbo uses the same private recording and exact review gates, then reuses saved audio',async()=>{
  const f=fixture('ig');
  const path=`/api/devotional-recordings/318/ig/${f.version()}`;
  const upload=(await f.upload().expect(200)).body;
  assert.equal((await request(f.app).get(path)).body.available,false);
  await request(f.app).get(`${path}/audio`).expect(404);
  await f.publish(upload.audioHash,{reviewed:false}).expect(400);
  await f.publish(upload.audioHash).expect(200);
  for(let i=0;i<4;i++) await request(f.app).get(`${path}/audio`).expect(302);
  assert.equal(f.audio.size,1);
});
test('recordings require admin and same origin for writes; public requests never upload or generate',async()=>{
  const f=fixture();
  await request(f.app).get(f.base).expect(401);
  await request(f.app).post(f.base).expect(401);
  await request(f.app).patch(f.base).set('x-admin','fixture').set('Origin','https://other.invalid').expect(403);
  const publicPath=`/api/devotional-recordings/318/yo/${f.version()}`;
  assert.deepEqual((await request(f.app).get(publicPath).expect(200)).body,{available:false});
  await request(f.app).get(`${publicPath}/audio`).expect(404);
  assert.equal(f.audio.size,0);assert.equal(f.signs(),0);
});
test('private upload, audition, exact recording review and reusable public delivery',async()=>{
  const f=fixture();
  const status=(await request(f.app).get(f.base).set('x-admin','fixture').expect(200)).body;
  assert.equal(status.generationEnabled,false);assert.equal(status.storageReady,true);assert.ok(status.script.includes(pilot.source.scriptureText));
  const uploaded=(await f.upload().expect(200)).body;
  const path=`/api/devotional-recordings/318/yo/${f.version()}`;
  assert.equal((await request(f.app).get(path)).body.available,false);
  await request(f.app).get(`${path}/audio`).expect(404);
  await request(f.app).get(`${path}/audio`).set('x-admin','fixture').expect(302);
  await f.publish(uploaded.audioHash,{reviewed:false}).expect(400);
  await f.publish(uploaded.audioHash,{rightsConfirmed:false}).expect(400);
  await f.publish('a'.repeat(64)).expect(409);
  await f.publish(uploaded.audioHash).expect(200);
  for(let i=0;i<3;i++) {
    assert.deepEqual((await request(f.app).get(path).expect(200)).body,{available:true,audioPath:`${path}/audio`});
    const delivery=await request(f.app).get(`${path}/audio`).expect(302);
    assert.equal(delivery.headers.location,'https://private.example.invalid/recording?expires=120');
    assert.equal(delivery.headers['cache-control'],'private, no-store');
  }
  assert.equal(f.audio.size,1,'all listeners reuse the same saved bytes');
  await f.upload().expect(409);
  await f.publish(uploaded.audioHash,{published:false,reviewed:false,rightsConfirmed:false}).expect(200);
  await request(f.app).get(`${path}/audio`).expect(404);
});
test('source changes, deleted/future text and wrong language/version never deliver stale audio',async()=>{
  const f=fixture();const hash=(await f.upload()).body.audioHash;await f.publish(hash).expect(200);
  const path=`/api/devotional-recordings/318/yo/${f.version()}`;
  f.setTranslation({...pilot.source,_translatedTo:'yo',content:'Corrected text'});
  await request(f.app).get(`${path}/audio`).expect(404);
  f.setTranslation({...pilot.source,_translatedTo:'en'});
  assert.equal((await request(f.app).get(path)).body.available,false);
  f.setSource({...pilot.source,isDeleted:true});await request(f.app).get(`${path}/audio`).expect(404);
  f.setSource({...pilot.source,date:'2026-11-20'});await request(f.app).get(`${path}/audio`).expect(404);
  await request(f.app).get('/api/devotional-recordings/318/yo/not-a-hash').expect(400);
});
test('invalid uploads and conditional-write conflicts retain the previous manifest',async()=>{
  const f=fixture();await f.upload(Buffer.from('not mp3')).expect(400);
  await f.upload().expect(200);await f.upload().expect(200);assert.equal(f.audio.size,1,'identical upload is reused');
  const previous=structuredClone([...f.manifests.values()]);f.setConflict();
  await f.upload(Buffer.concat([Buffer.from('ID3new'),Buffer.alloc(256)])).expect(409);
  assert.deepEqual([...f.manifests.values()],previous);
});
test('private storage cannot silently fall back to the public media bucket',()=>{
  assert.equal(privateRecordingStore({}),null);
  assert.equal(privateRecordingStore({SHOP_R2_PRIVATE_BUCKET:'public',R2_BUCKET_NAME:'public',R2_ACCOUNT_ID:'fixture',SHOP_R2_ACCESS_KEY_ID:'fixture',SHOP_R2_SECRET_ACCESS_KEY:'fixture'}),null);
});
