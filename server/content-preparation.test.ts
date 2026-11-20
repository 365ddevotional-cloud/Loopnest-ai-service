import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {createContentPreparation,preparationSourceHash,preparationPrefix,splitPreparationScript,translatedFields,validatePreparedFields,createPreparationTranslator,PreparationProviderError,type ArtifactStore} from './content-preparation';
import type {RecordingStore} from './devotional-recordings';
import preparedToday from './content-translations/prepared-2026-11-20.json';
import catalog from './content-translations/verified-scriptures-2026-11-20.json';
function fixture(){
 let sequence=0,textCalls=0,audioCalls=0,failAudio:Error|null=null,failText:Error|null=null;
 const json=new Map<string,{value:any;etag:string}>(),audio=new Map<string,Buffer>();
 const store:ArtifactStore={async read<T>(key:string){return structuredClone(json.get(key)??null) as {value:T;etag:string}|null;},async write(key,value,etag){if(json.get(key)?.etag!==etag)throw Object.assign(new Error('conflict'),{$metadata:{httpStatusCode:412}});json.set(key,{value:structuredClone(value),etag:String(++sequence)});}};
 let ledger:any=null;
 const recordings:RecordingStore={generationLedger:{readLedger:async()=>structuredClone(ledger),saveLedger:async(value,etag)=>{if(ledger?.etag!==etag)throw Object.assign(new Error('conflict'),{$metadata:{httpStatusCode:412}});ledger={ledger:structuredClone(value),etag:String(++sequence)};}},read:async()=>null,saveManifest:async()=>{},saveAudio:async(key,bytes)=>{assert.ok(!audio.has(key));audio.set(key,bytes);},signAudio:async key=>{assert.ok(audio.has(key));return 'https://private.example.invalid/signed';}};
 const devotional:any={id:319,date:'2026-11-20',title:'A source',scriptureReference:'Acts 16:25',scriptureText:'source quote',content:'One paragraph.\n\nAnother paragraph.',prayerPoints:['Prayer'],faithDeclarations:['Declaration'],christianQuotes:null,propheticDeclaration:null,author:'Moses Afolabi'};
 const school:any={id:7,date:'2026-11-22',title:'A lesson',scriptureReferences:'Acts 16:25',scriptureText:'source quote',lessonContent:'First outline.\n\nSecond outline.',discussionQuestions:['Question'],prayerFocus:'Prayer',weeklyAssignment:'Assignment'};
 const env:NodeJS.ProcessEnv={CONTENT_PREPARATION_ENABLED:'true',CONTENT_PREPARATION_OWNER_AUTHORIZED:'true',DEVOTIONAL_TTS_ENABLED:'true',DEVOTIONAL_TTS_FREE_TIER_CONFIRMED:'true',GEMINI_API_KEY:'fixture',DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT:'50000'};
 const deps={env,store,recordings,today:()=> '2026-11-20',read:async(kind:any,id:number)=>kind==='devotional'&&id===devotional.id?devotional:kind==='school'&&id===school.id?school:undefined,list:async(kind:any)=>[kind==='devotional'?devotional:school],translate:async(kind:any,source:any,language:any)=>{textCalls++;if(failText)throw failText;const fields=translatedFields(kind,source);for(const key of Object.keys(fields)){const v=fields[key];fields[key]=Array.isArray(v)?v.map(x=>language+' '+x):v===null?null:language+' '+v;}return {sourceHash:preparationSourceHash(kind,source),fields,translationHash:(await import('node:crypto')).createHash('sha256').update(JSON.stringify(fields)).digest('hex'),approval:{method:'owner-authorized-automated-review' as const,date:'2026-11-20'},parts:['A complete recording.']};},synthesize:async()=>{audioCalls++;if(failAudio)throw failAudio;return Buffer.from('fixture audio');}};
 const service=createContentPreparation(deps);const app=express();app.use(express.json());service.register(app,(q,r,n)=>q.get('x-admin')==='fixture'?n():void r.sendStatus(401));
 return {service,second:()=>createContentPreparation(deps),app,env,devotional,school,json,audio,textCalls:()=>textCalls,audioCalls:()=>audioCalls,failText:(e:Error)=>failText=e,failAudio:(e:Error)=>failAudio=e};
}
test('five-month plan covers both kinds, four languages; read-only requests never generate',async()=>{
 const f=fixture();await f.service.plan('2026-11-20','2027-04-20');assert.equal((await f.service.status()).total,8);
 await request(f.app).get('/api/admin/content-preparation').expect(401);await request(f.app).post('/api/admin/content-preparation/step').expect(401);
 await request(f.app).post('/api/admin/content-preparation/step').set('x-admin','fixture').set('Origin','https://other.example').expect(403);
 for(let i=0;i<16;i++)await f.service.step();assert.equal((await f.service.status()).audioReady,8);assert.equal(f.audio.size,8);
 const translated=await f.service.overlay('devotional',f.devotional,'pcm');assert.equal(translated._translatedTo,'pcm');assert.match(translated.content,/pcm/);
 const hash=preparationSourceHash('devotional',f.devotional),base=`/api/prepared-audio/devotional/319/pcm/${hash}`;
 for(let i=0;i<3;i++){const info=(await request(f.app).get(base).expect(200)).body;assert.equal(info.available,true);assert.deepEqual(info.parts,[`${base}/0`]);await request(f.app).get(`${base}/0`).expect(302);}
 assert.equal(f.textCalls(),8);assert.equal(f.audioCalls(),8);await request(f.app).get(`${base}/1`).expect(404);
 assert.equal((await request(f.app).get(base.replace(hash,'0'.repeat(64))).expect(200)).body.available,false);
});
test('source edits invalidate saved translation and audio; future devotional recordings are not exposed early',async()=>{
 const f=fixture();f.devotional.date='2026-11-21';await f.service.plan('2026-11-20','2027-04-20');await f.service.step();await f.service.step();const hash=preparationSourceHash('devotional',f.devotional),base=`/api/prepared-audio/devotional/319/yo/${hash}`;
 assert.equal((await request(f.app).get(base)).body.available,false);await request(f.app).get(base+'/0').expect(404);
 f.devotional.content+=' Changed.';const after=await f.service.overlay('devotional',f.devotional,'yo');assert.equal(after._translatedTo,undefined);
});
test('two instances cannot claim the same work; ambiguous failures stay blocked',async()=>{
 const f=fixture();await f.service.plan('2026-11-20','2027-04-20');await Promise.all([f.service.step(),f.second().step()]);assert.equal(f.textCalls(),1);
 f.failAudio(new Error('unknown provider result'));await f.service.step();assert.equal((await f.service.status()).blocked,1);
 await f.service.step();assert.equal(f.audioCalls(),1);
});
test('daily audio cap pauses generation but permits text preparation; disabled config cannot start',async()=>{
 const f=fixture();f.env.CONTENT_PREPARATION_AUDIO_REQUEST_LIMIT='1';await f.service.plan('2026-11-20','2027-04-20');for(let i=0;i<8;i++)await f.service.step();assert.equal(f.audioCalls(),1);assert.ok(f.textCalls()>1);
 const disabled=fixture();disabled.env.CONTENT_PREPARATION_OWNER_AUTHORIZED='false';await assert.rejects(()=>disabled.service.plan('2026-11-20','2027-04-20'),/DISABLED/);assert.equal((await disabled.service.step()).result,'disabled-or-busy');
});
test('known free quota failures wait until a later day; no request loop and no text publication on rejection',async()=>{
 const f=fixture();f.failAudio(new PreparationProviderError(429));await f.service.plan('2026-11-20','2027-04-20');await f.service.step();await f.service.step();for(let i=0;i<4;i++)await f.service.step();assert.equal(f.audioCalls(),1);assert.equal((await f.service.status()).blocked,0);
});
test('structural checks reject changed lists, untranslated text and dropped paragraphs',()=>{
 const input={title:'Source',content:'First.\n\nSecond.',prayerPoints:['a','b'],christianQuotes:null};
 assert.throws(()=>validatePreparedFields(input,{...input,title:'Translated'}),/UNTRANSLATED/);
 assert.throws(()=>validatePreparedFields(input,{...input,content:'Translated.'}),/PARAGRAPH/);
 assert.throws(()=>validatePreparedFields(input,{...input,content:'One new.\n\nTwo new.',prayerPoints:['one']}),/LIST/);
 assert.deepEqual(splitPreparationScript('ab\n\ncd\n\nef',6),['ab\n\ncd','ef']);assert.throws(()=>splitPreparationScript('abcdef',5),/TOO_LONG/);
});
test('official Yoruba and Igbo quotations are pinned; all scheduled references have licensed source URLs',()=>{
 assert.equal(Object.keys(catalog).length,165);for(const row of Object.values(catalog)){for(const lang of ['yo','ig'] as const){assert.ok(row.quotes[lang].text.length>5);assert.ok(row.quotes[lang].urls.every(u=>u.startsWith(`https://ebible.org/${lang==='yo'?'yor':'ibo'}/`)));}}
 assert.match(catalog['Acts 16:25'].quotes.yo.text,/Paulu àti Sila/);assert.match(catalog['Acts 16:25'].quotes.ig.text,/Pọl na Saịlas/);
});
test('translation client uses only the server key and free model; rejected review never publishes',async()=>{
 const f=fixture();let calls=0;const translate=createPreparationTranslator(f.env,(async(url:any,opts:any)=>{assert.match(url,/gemini-3.8-flash:generateContent$/);assert.equal(opts.headers['x-goog-api-key'],'fixture');calls++;const fields={...translatedFields('devotional',f.devotional),title:'Taken',content:'Changed paragraph.\n\nSecond changed paragraph.',prayerPoints:['changed'],faithDeclarations:['changed']};return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(calls===1?fields:{approved:false,issues:['MEANING_CHANGED']})}]}}]}));}) as typeof fetch);
 await assert.rejects(()=>translate('devotional',f.devotional,'pcm'),/LANGUAGE_REVIEW_FAILED/);assert.equal(calls,2);
});


test('today uses the exact source-checked seed with full paragraphs, prayers and licensed quotes without provider text requests',async()=>{
 assert.equal(preparationSourceHash('devotional',preparedToday.source),preparedToday.sourceHash);
 const env=fixture().env;
 const translate=createPreparationTranslator(env,async()=>{throw new Error('no provider needed for checked seed');});
 for(const language of ['yo','ha','ig','pcm'] as const){
  const d=await translate('devotional',preparedToday.source,language);
  assert.equal(d.sourceHash,preparedToday.sourceHash);assert.equal(d.fields.prayerPoints.length,7);assert.equal(d.fields.faithDeclarations.length,4);
  assert.equal(d.fields.content.split('\n\n').length,4);assert.ok(d.parts.join('\n\n').includes('Moses Afolabi'));assert.equal(d.parts.length,1);
  if(language==='yo'||language==='ig')assert.equal(d.fields.scriptureText,catalog['Acts 16:25'].quotes[language].text);
 }
});
test('known text 503 gets a bounded backoff; audio is never repeated as a text retry',async()=>{
 const f=fixture();await f.service.plan('2026-11-20','2027-04-20');f.failText(new PreparationProviderError(503));
 const first=await f.service.step();assert.equal(first.error,'GOOGLE_503_RETRY_WAIT');assert.equal(f.textCalls(),1);
 await f.service.step();assert.equal(f.textCalls(),1);assert.equal(f.audioCalls(),0);
 const plan=f.json.get('content-preparation/plan.json')!;plan.value.textBlockedUntil='2000-01-01';plan.value.jobs[0].textFailures=3;
 assert.equal((await f.service.step()).result,'blocked');assert.equal(f.textCalls(),2);assert.equal(f.audioCalls(),0);
});


test('text model selection is limited to verified free-tier Flash models',async()=>{
 const f=fixture(),env={...f.env,CONTENT_PREPARATION_TEXT_MODEL:'gemini-3.6-flash'};
 let calls=0;const translator=createPreparationTranslator(env,async url=>{calls++;assert.match(String(url),/gemini-3\.6-flash:generateContent$/);throw new PreparationProviderError(503);});
 await assert.rejects(()=>translator('devotional',f.devotional,'ha'),PreparationProviderError);assert.equal(calls,1);
 env.CONTENT_PREPARATION_TEXT_MODEL='paid-model';await assert.rejects(()=>translator('devotional',f.devotional,'ha'),/FREE_TEXT_MODEL_REQUIRED/);assert.equal(calls,1);
});

test('an interrupted text job reuses its saved reviewed document without another provider request',async()=>{
 const f=fixture();
 await f.service.plan('2026-11-20','2027-04-20');
 await f.service.step();
 const plan=f.json.get('content-preparation/plan.json')!.value;
 Object.assign(plan.jobs[0],{status:'blocked',error:'INTERRUPTED_CHECK_SAVED_FILES',textReady:false});
 await f.service.step();
 assert.equal(f.textCalls(),1);
 assert.equal((await f.service.status()).textReady,1);
 assert.equal(f.audioCalls(),0);
});

test('targeted review edits retain unaffected text and enforce unique matches and locked quotations',async()=>{
 const {applyReviewEdits}=await import('./content-preparation');
 const draft={content:'One paragraph.\n\nDone in the past.',prayerPoints:['First','Second'],scriptureText:'Exact verse.'};
 const edit={field:'content',index:-1,original:'Done in the past',replacement:'That followed'};
 assert.deepEqual(applyReviewEdits(draft,[edit,{field:'prayerPoints',index:1,original:'Second',replacement:'Next'}],true),
  {...draft,content:'One paragraph.\n\nThat followed.',prayerPoints:['First','Next']});
 assert.throws(()=>applyReviewEdits({...draft,content:'Done in the past. Done in the past.'},[edit],true),/INVALID_REVIEW_EDIT/);
 assert.throws(()=>applyReviewEdits(draft,[{...edit,field:'scriptureText',original:'Exact'}],true),/INVALID_REVIEW_EDIT/);
 assert.equal(draft.prayerPoints[1],'Second');
});

test('funded text resumes past the free request limit while retaining the provider pause',async()=>{
 const f=fixture();
 await f.service.plan('2026-11-20','2027-04-20');
 const plan=f.json.get('content-preparation/plan.json')!.value;
 plan.days[new Date().toISOString().slice(0,10)]={text:80,audio:10};
 assert.equal((await f.service.step()).result,'daily-limit-or-finished');
 f.env.CONTENT_PREPARATION_TEXT_API_KEY='prepaid-fixture';
 await f.service.step();
 assert.equal(f.textCalls(),1);
 const current=f.json.get('content-preparation/plan.json')!.value;
 current.textBlockedUntil='2099-01-01';
 assert.equal((await f.service.step()).result,'daily-limit-or-finished');
 assert.equal(f.audioCalls(),0);
});

test('on-demand mode generates only a requested devotional, reuses audio, and reports taps',async()=>{
 const f=fixture();await f.service.plan('2026-11-20','2027-04-20');
 f.env.CONTENT_PREPARATION_MODE='on-demand';f.env.CONTENT_PREPARATION_ENABLED='false';
 assert.equal((await f.service.step()).result,'daily-limit-or-finished');
 const path='/api/devotionals/319/listen/ig';
 await request(f.app).get(path).expect(200);
 await request(f.app).post(path).set('Origin','https://other.example').expect(403);
 assert.equal(f.textCalls(),0);
 function tap(){return request(f.app).post(path).set('Host','fixture.test').set('Origin','https://fixture.test').send({});}
 await tap().expect(200);
 await f.service.step();
 assert.equal((await request(f.app).get(path)).body.state,'ready');
 await tap().expect(200);
 assert.equal(f.textCalls(),1);assert.equal(f.audioCalls(),1);
 assert.equal((await f.service.step()).result,'daily-limit-or-finished');
 await request(f.app).post(path).set('Host','fixture.test').set('Origin','https://fixture.test').send({event:'play'}).expect(204);
 const admin=await request(f.app).get('/api/admin/content-preparation').set('x-admin','fixture');
 assert.deepEqual(admin.body.listenerDemand.find((x:any)=>x.language==='ig'),{language:'ig',editions:1,taps:2,plays:1});
});
