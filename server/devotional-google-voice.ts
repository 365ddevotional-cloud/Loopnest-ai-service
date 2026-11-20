import {createHash} from 'node:crypto';
import {z} from 'zod';

export const DEVOTIONAL_GOOGLE_VOICE='Sola';
export const DEVOTIONAL_GOOGLE_MODEL='gemini-3.8-flash-tts';
export class GoogleNarrationError extends Error {
  constructor(public readonly reason:'http'|'incomplete'|'format'|'response',public readonly detail:string) {
    // detail is an application-generated enum/status, never provider text or a key.
    super(`Google narration ${reason} (${detail}). No automatic retry was made.`);
  }
}
export const googleRecordingLanguages=['yo','ha','ig','pcm'] as const;
export function googleVoiceConfig(env:NodeJS.ProcessEnv=process.env) {
  const cap=Number(env.DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT??0);
  if(env.DEVOTIONAL_TTS_ENABLED!=='true' || env.DEVOTIONAL_TTS_FREE_TIER_CONFIRMED!=='true' ||
    !env.GEMINI_API_KEY?.trim() || !Number.isSafeInteger(cap) || cap<1 || cap>50000)return null;
  return {key:env.GEMINI_API_KEY,cap};
}
const ledgerSchema=z.object({days:z.record(z.number().int().nonnegative()),claims:z.record(z.object({day:z.string(),characters:z.number().int().positive()}))});
export type GenerationLedger=z.infer<typeof ledgerSchema>;
export interface GenerationLedgerStore {
  readLedger():Promise<{ledger:GenerationLedger;etag:string}|null>;
  saveLedger(ledger:GenerationLedger,etag?:string):Promise<void>;
}
// One permanent claim per exact script/model/voice. Failed/ambiguous requests
// retain both the claim and reservation: no automatic retry, including tomorrow.
export async function reserveGoogleRecording(store:GenerationLedgerStore,id:string,characters:number,cap:number,day:string) {
  if(!Number.isSafeInteger(characters)||characters<1||characters>6000||!Number.isSafeInteger(cap)||cap<1||cap>50000)throw new Error('Invalid narration allowance');
  for(let attempt=0;attempt<5;attempt++) {
    const current=await store.readLedger();
    const ledger=current?ledgerSchema.parse(current.ledger):{days:{},claims:{}};
    if(Object.hasOwn(ledger.claims,id))return 'claimed' as const;
    if((ledger.days[day]??0)+characters>cap)return 'capacity' as const;
    ledger.days[day]=(ledger.days[day]??0)+characters;
    ledger.claims[id]={day,characters};
    try {await store.saveLedger(ledger,current?.etag);return 'reserved' as const;}
    catch(e:any){if(e?.$metadata?.httpStatusCode!==412)throw e;}
  }
  return 'busy' as const;
}
export const googleGenerationId=(prefix:string)=>createHash('sha256').update(JSON.stringify([prefix,DEVOTIONAL_GOOGLE_MODEL,DEVOTIONAL_GOOGLE_VOICE])).digest('hex');
export function isPcmWave(bytes:Buffer) {
  return bytes.length>=44 && bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WAVE' &&
    bytes.subarray(12,16).toString()==='fmt ' && bytes.readUInt32LE(16)===16 && bytes.readUInt16LE(20)===1 &&
    bytes.readUInt16LE(22)===1 && bytes.readUInt32LE(24)===24000 && bytes.readUInt16LE(34)===16 &&
    bytes.subarray(36,40).toString()==='data' && bytes.readUInt32LE(40)===bytes.length-44 &&
    bytes.readUInt32LE(4)===bytes.length-8 && (bytes.length-44)%2===0;
}
function pcmWave(pcm:Buffer) {
  const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(36+pcm.length,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length,40);return Buffer.concat([b,pcm]);
}
export function createGoogleDevotionalNarrator(env:NodeJS.ProcessEnv=process.env,request:typeof fetch=fetch) {
  return async(script:string)=>{
    const config=googleVoiceConfig(env);
    if(!config||!script.trim()||script.length>6000)throw new Error('Google narration is not configured');
    // Match the approved AI Studio Get code configuration. Never retry a request
    // whose audio may already have been generated. No prompt text is logged.
    const res=await request(`https://generativelanguage.googleapis.com/v1beta/models/${DEVOTIONAL_GOOGLE_MODEL}:generateContent`,{
      method:'POST',signal:AbortSignal.timeout(120000),headers:{'x-goog-api-key':config.key,'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:`## Transcript:\n${script}`}]}],generationConfig:{temperature:1,maxOutputTokens:8192,responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:DEVOTIONAL_GOOGLE_VOICE}}}}}),
    });
    if(!res.ok)throw new GoogleNarrationError('http',String(res.status));
    if(Number(res.headers.get('content-length')??0)>28*1024*1024)throw new Error('Narration response too large');
    const raw=await res.text();if(raw.length>28*1024*1024)throw new Error('Narration response too large');
    const data=JSON.parse(raw);
    if(data.candidates?.length!==1||data.candidates[0].finishReason!=='STOP'){
      const finish=data.candidates?.[0]?.finishReason;
      throw new GoogleNarrationError('incomplete',['MAX_TOKENS','SAFETY','RECITATION','OTHER','STOP'].includes(finish)?finish:'NO_COMPLETE_CANDIDATE');
    }
    const parts=data.candidates[0].content?.parts;
    if(!Array.isArray(parts)||parts.length!==1)throw new GoogleNarrationError('response','PARTS');
    const audio=parts[0].inlineData;
    if(typeof audio?.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data))throw new GoogleNarrationError('response','NO_AUDIO');
    let bytes=Buffer.from(audio.data,'base64');
    if(/^audio\/L16;.*rate=24000/i.test(audio.mimeType??''))bytes=pcmWave(bytes);
    else if(!/^audio\/wav$/i.test(audio.mimeType??''))throw new GoogleNarrationError('format','UNSUPPORTED');
    if(!isPcmWave(bytes)||bytes.length<4800||bytes.length>20*1024*1024)throw new GoogleNarrationError('format','INVALID_PCM');
    return bytes;
  };
}
