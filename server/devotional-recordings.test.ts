import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {createHash} from 'node:crypto';
import {registerDevotionalRecordings, privateRecordingStore, type RecordingManifest, type RecordingStore} from './devotional-recordings';
import {devotionalRecordingSnapshot} from '../shared/devotional-recording';
import {googleGenerationId} from './devotional-google-voice';
import pilot from './content-translations/2026-11-19-glorious-light.json';

function fixture(language='yo',generation=false) {
  let source:any=structuredClone(pilot.source), translation:any={...pilot.source,...pilot.drafts.find(d=>d.language==='yo'),_translatedTo:'yo'};
  const manifests=new Map<string,{manifest:RecordingManifest;etag:string}>(),audio=new Map<string,Buffer>();
  let sequence=0, signs=0, conflict=false,calls=0,ledger:any=null,failSynthesis=false;
  const generationEnv:NodeJS.ProcessEnv=generation?{DEVOTIONAL_TTS_ENABLED:'true',DEVOTIONAL_TTS_FREE_TIER_CONFIRMED:'true',GEMINI_API_KEY:'fixture',DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT:'10000'}:{};
  const wav=Buffer.alloc(4844);wav.write('RIFF');wav.writeUInt32LE(4836,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(4800,40);
  const store:RecordingStore={
    ...(generation?{generationLedger:{readLedger:async()=>structuredClone(ledger),saveLedger:async(value:any,etag?:string)=>{if(ledger?.etag!==etag)throw Object.assign(new Error('fixture conflict'),{$metadata:{httpStatusCode:412}});ledger={ledger:structuredClone(value),etag:String(++sequence)};}}}:{}),
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
    generationEnv,synthesize:async()=>{calls++;if(failSynthesis)throw new Error('private provider detail');return wav;},
    readSource:async()=>source,translate:async(s,lang)=>lang==='en'?s:translation,today:()=> '2026-11-19',
  });
  if(language==='ig') translation={...translation,_translatedTo:'ig'};
  const base=`/api/admin/devotional-recordings/318/${language}`;
  const version=()=>createHash('sha256').update(devotionalRecordingSnapshot(translation,language)).digest('hex');
  const mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(256)]);
  const upload=(bytes=mp3)=>request(app).post(`${base}?version=${version()}`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').set('Content-Type','audio/mpeg').send(bytes);
  const publish=(audioHash:string,extra:any={})=>request(app).patch(base).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:version(),audioHash,published:true,reviewed:true,rightsConfirmed:true,...extra});
  return {generationEnv,ledger:()=>ledger,setSynthesisFailure:(v:boolean)=>failSynthesis=v,app,base,version,upload,publish,manifests,audio,calls:()=>calls,setSource:(s:any)=>source=s,setTranslation:(s:any)=>translation=s,setConflict:()=>conflict=true,signs:()=>signs};
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
  assert.equal(status.generationEnabled,false);assert.equal(status.storageReady,true);assert.ok(status.script.includes('tọ̀ mí lẹ́yìn'));
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

test('Google generation endpoint requires admin, same origin, and explicit configuration; listener GET stays read-only',async()=>{
  const f=fixture();
  await request(f.app).post(`${f.base}/generate`).send({version:f.version()}).expect(401);
  await request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','https://other.invalid').send({version:f.version()}).expect(403);
  await request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:f.version()}).expect(503);
  assert.equal(f.audio.size,0);
});

test('enabled Sola generation is private, concurrency safe, reused and requires exact full-recording review',async()=>{
  const f=fixture('yo',true);
  const generate=()=>request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:f.version()});
  const results=await Promise.all([generate(),generate()]);
  assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,409].includes(r.status)));
  assert.equal(f.calls(),1);assert.equal(f.audio.size,1);
  const status=(await request(f.app).get(f.base).set('x-admin','fixture')).body;
  assert.equal(status.generationVoice,'Sola');assert.equal(status.recording.published,false);
  const path=`/api/devotional-recordings/318/yo/${f.version()}`;
  await request(f.app).get(`${path}/audio`).expect(404);
  await generate().expect(200);assert.equal(f.calls(),1);
  await f.publish(status.recording.audioHash,{reviewed:false}).expect(400);
  await f.publish(status.recording.audioHash).expect(200);
  for(let i=0;i<4;i++)await request(f.app).get(`${path}/audio`).expect(302);
  assert.equal(f.calls(),1);
});

test('Sola replacement requires an explicit private replacement and can never overwrite a published recording',async()=>{
  const f=fixture('yo',true);const old=(await f.upload()).body.audioHash;
  const generate=(replacePrivate=false)=>request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:f.version(),replacePrivate});
  await generate().expect(409);assert.equal(f.calls(),0);
  await f.publish(old).expect(200);await generate(true).expect(409);assert.equal(f.calls(),0);
  await f.publish(old,{published:false}).expect(200);
  await generate(true).expect(200);assert.equal(f.calls(),1);
  const status=(await request(f.app).get(f.base).set('x-admin','fixture')).body;
  assert.equal(status.recording.provider,'google-sola');assert.equal(status.recording.published,false);assert.notEqual(status.recording.audioHash,old);
  assert.equal(f.audio.size,2,'earlier private bytes are retained');
});

test('one specifically authorized manual recovery keeps old reservation, prevents duplicate recovery and reuses saved audio',async()=>{
  const f=fixture('yo',true);
  const generate=()=>request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:f.version()});
  f.setSynthesisFailure(true);const failed=await generate().expect(503);assert.match(failed.body.message,/PROVIDER_REQUEST/);assert.doesNotMatch(failed.body.message,/private provider detail/);
  const reserved=f.ledger().ledger.days[new Date().toISOString().slice(0,10)];
  f.setSynthesisFailure(false);await generate().expect(409);assert.equal(f.calls(),1);
  const id=googleGenerationId(`devotional-recordings/318/yo/${f.version()}`);
  f.generationEnv.DEVOTIONAL_TTS_MANUAL_RECOVERY_IDS=id;
  const results=await Promise.all([generate(),generate()]);assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>r.status===200||r.status===409));assert.equal(f.calls(),2);
  assert.ok(f.ledger().ledger.claims[id]);assert.ok(f.ledger().ledger.claims[`${id}:manual-recovery-1`]);
  assert.equal(f.ledger().ledger.days[new Date().toISOString().slice(0,10)],reserved*2);
  assert.equal((await generate().expect(200)).body.reused,true);assert.equal(f.calls(),2);
});

test('delegated publication needs the explicit owner policy and a saved Sola recording; no listening attestation is fabricated',async()=>{
 const f=fixture('yo',true),extra={reviewed:false,rightsConfirmed:false,reviewMethod:'owner-authorized-automated-review'};
 await request(f.app).post(`${f.base}/generate`).set('x-admin','fixture').set('Origin','http://127.0.0.1').set('Host','127.0.0.1').send({version:f.version()}).expect(200);
 const status=(await request(f.app).get(f.base).set('x-admin','fixture')).body;
 await f.publish(status.recording.audioHash,extra).expect(400);
 f.generationEnv.CONTENT_PREPARATION_OWNER_AUTHORIZED='true';
 await f.publish(status.recording.audioHash,extra).expect(200);
 assert.equal([...f.manifests.values()][0].manifest.reviewMethod,'owner-authorized-automated-review');
 const uploaded=fixture('yo',true);uploaded.generationEnv.CONTENT_PREPARATION_OWNER_AUTHORIZED='true';
 const file=(await uploaded.upload()).body;
 await uploaded.publish(file.audioHash,extra).expect(400);
});
