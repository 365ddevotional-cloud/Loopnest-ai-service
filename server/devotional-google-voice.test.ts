import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleVoiceConfig,reserveGoogleRecording,createGoogleDevotionalNarrator,isPcmWave,normalizePcmWave,type GenerationLedgerStore} from './devotional-google-voice';
import {narrationScripture} from '../shared/devotional-narration-scripture';
import {devotionalRecordingScript,devotionalRecordingSnapshot} from '../shared/devotional-recording';
import pilot from './content-translations/2026-11-19-glorious-light.json';
const env={DEVOTIONAL_TTS_ENABLED:'true',DEVOTIONAL_TTS_FREE_TIER_CONFIRMED:'true',GEMINI_API_KEY:'fixture',DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT:'10000'};
function ledger(){let value:any=null,seq=0;return {store:{readLedger:async()=>structuredClone(value),saveLedger:async(next:any,etag?:string)=>{if(value?.etag!==etag)throw Object.assign(new Error('conflict'),{$metadata:{httpStatusCode:412}});value={ledger:structuredClone(next),etag:String(++seq)};}} satisfies GenerationLedgerStore,get:()=>value};}
test('Google configuration defaults off and requires a separate key, free-tier confirmation and bounded allowance',()=>{
  assert.equal(googleVoiceConfig({}),null);
  assert.equal(googleVoiceConfig({...env,DEVOTIONAL_TTS_FREE_TIER_CONFIRMED:'false'}),null);
  assert.equal(googleVoiceConfig({...env,GEMINI_API_KEY:''}),null);
  assert.equal(googleVoiceConfig({...env,DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT:'0'}),null);
  assert.equal(googleVoiceConfig({...env,DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT:'50001'}),null);
  assert.equal(googleVoiceConfig(env)?.cap,10000);
});
test('simultaneous requests reserve one exact recording once, claims persist across days and total allowance cannot overshoot',async()=>{
  const f=ledger();
  const results=await Promise.all(Array.from({length:5},()=>reserveGoogleRecording(f.store,'same-script',4000,10000,'2026-11-20')));
  assert.equal(results.filter(x=>x==='reserved').length,1);
  assert.equal(f.get().ledger.days['2026-11-20'],4000);
  assert.equal(await reserveGoogleRecording(f.store,'same-script',4000,10000,'2026-11-21'),'claimed');
  const others=await Promise.all(['second','third'].map(id=>reserveGoogleRecording(f.store,id,4000,10000,'2026-11-20')));
  assert.equal(others.filter(x=>x==='reserved').length,1);assert.equal(others.filter(x=>x==='capacity').length,1);
  assert.equal(f.get().ledger.days['2026-11-20'],8000);
});
test('exact Sola config, verbatim accent marks and complete PCM response; key stays in server header',async()=>{
  let calls=0;
  const narrator=createGoogleDevotionalNarrator(env,(async(url:any,opts:any)=>{
    calls++;assert.match(url,/gemini-3.8-flash-tts:generateContent$/);assert.equal(opts.headers['x-goog-api-key'],'fixture');
    const body=JSON.parse(opts.body);assert.equal(body.contents[0].parts[0].text,'## Transcript:\nÈmi ni ìmọ́lẹ̀ ayé.');
    assert.equal(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Sola');
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:Buffer.alloc(4800).toString('base64')}}]}}]}));
  }) as typeof fetch);
  assert.ok(isPcmWave(await narrator('Èmi ni ìmọ́lẹ̀ ayé.')));assert.equal(calls,1);
});
test('provider failures, truncated output and unsupported format are rejected without retries',async()=>{
  for(const response of [new Response('quota',{status:429}),new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS'}]})),new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{mimeType:'audio/mpeg',data:'AAAA'}}]}}]}))]){
    let calls=0;const narrator=createGoogleDevotionalNarrator(env,(async()=>{calls++;return response;}) as typeof fetch);
    await assert.rejects(()=>narrator('script'));assert.equal(calls,1);
  }
});
test('verified Yoruba and Igbo quotes affect recording identity; English and unverified references retain source',()=>{
  const original=pilot.source;
  assert.ok(devotionalRecordingScript(original,'yo').includes('tọ̀ mí lẹ́yìn'));
  assert.ok(devotionalRecordingScript(original,'ig').includes('Onye ọbụla na-eso m'));
  assert.ok(devotionalRecordingScript(original,'en').includes(original.scriptureText));
  assert.equal(narrationScripture('John 8:13','yo','original'),'original');
  assert.notEqual(devotionalRecordingSnapshot(original,'yo'),devotionalRecordingSnapshot(original,'en'));
});

test('diagnostics expose only a safe status or known finish reason, never provider content',async()=>{
  const invoke=(response:Response)=>createGoogleDevotionalNarrator(env,(async()=>response) as typeof fetch)('script');
  await assert.rejects(()=>invoke(new Response('SECRET PROVIDER BODY',{status:429})),/Google narration http \(429\)/);
  await assert.rejects(()=>invoke(new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS'}]}))),/incomplete \(MAX_TOKENS\)/);
  await assert.rejects(()=>invoke(new Response(JSON.stringify({candidates:[{finishReason:'SECRET PROVIDER BODY'}]}))),/NO_COMPLETE_CANDIDATE/);
});

test('valid provider WAV with optional chunks and extended fmt is normalized without losing PCM',()=>{
  const pcm=Buffer.alloc(4800,13);
  const fmt=Buffer.alloc(26);fmt.write('fmt ');fmt.writeUInt32LE(18,4);fmt.writeUInt16LE(1,8);fmt.writeUInt16LE(1,10);fmt.writeUInt32LE(24000,12);fmt.writeUInt32LE(48000,16);fmt.writeUInt16LE(2,20);fmt.writeUInt16LE(16,22);
  const metadata=Buffer.from('LIST\x04\x00\x00\x00INFO','binary');
  const data=Buffer.alloc(8);data.write('data');data.writeUInt32LE(pcm.length,4);
  const header=Buffer.alloc(12);header.write('RIFF');header.write('WAVE',8);
  const wave=Buffer.concat([header,fmt,metadata,data,pcm]);wave.writeUInt32LE(wave.length-8,4);
  const normalized=normalizePcmWave(wave);assert.ok(isPcmWave(normalized));assert.deepEqual(normalized.subarray(44),pcm);
  assert.throws(()=>normalizePcmWave(wave.subarray(0,-2)),/INVALID_WAV/);
  const wrongRate=Buffer.from(wave);wrongRate.writeUInt32LE(44100,24);assert.throws(()=>normalizePcmWave(wrongRate),/UNSUPPORTED_PCM/);
});
