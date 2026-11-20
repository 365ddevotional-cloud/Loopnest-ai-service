import express, {type Express, type RequestHandler} from 'express';
import {createHash, randomUUID} from 'node:crypto';
import {S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {z} from 'zod';
import {GoogleNarrationError,googleVoiceConfig,createGoogleDevotionalNarrator,googleRecordingLanguages,reserveGoogleRecording,googleGenerationId,isPcmWave,type GenerationLedgerStore} from './devotional-google-voice';
import {devotionalRecordingScript, devotionalRecordingSnapshot, type RecordingText} from '../shared/devotional-recording';

const langInput = z.enum(['en','es','fr','yo','pcm','ha','ig']);
const hashInput = z.string().regex(/^[a-f0-9]{64}$/);
const manifestInput = z.object({audioHash:hashInput, key:z.string(), bytes:z.number().int().positive(), published:z.boolean(),format:z.enum(['mp3','wav']).optional(),provider:z.literal('google-sola').optional()});
export type RecordingManifest = z.infer<typeof manifestInput>;
export interface RecordingStore {
  generationLedger?:GenerationLedgerStore;
  read(key:string):Promise<{manifest:RecordingManifest;etag:string}|null>;
  saveAudio(key:string, bytes:Buffer, format?:'mp3'|'wav'):Promise<void>;
  saveManifest(key:string, manifest:RecordingManifest, etag?:string):Promise<void>;
  signAudio(key:string):Promise<string>;
}
class RecordingGenerationError extends Error {
  constructor(stage:string){super(`Recording generation failed at ${stage}. No automatic retry was made.`);}
}
async function generationStep<T>(stage:string,action:()=>Promise<T>):Promise<T> {
  try{return await action();}catch(e){if(e instanceof GoogleNarrationError)throw e;throw new RecordingGenerationError(stage);}
}
const sha = (s:string|Buffer) => createHash('sha256').update(s).digest('hex');
export function privateRecordingStore(env:NodeJS.ProcessEnv = process.env):RecordingStore|null {
  const accessKeyId=env.SHOP_R2_ACCESS_KEY_ID ?? env.SHOP_IMPORT_R2_ACCESS_KEY_ID;
  const secretAccessKey=env.SHOP_R2_SECRET_ACCESS_KEY ?? env.SHOP_IMPORT_R2_SECRET_ACCESS_KEY;
  const bucket=env.SHOP_R2_PRIVATE_BUCKET;
  if(!bucket || bucket===env.R2_BUCKET_NAME || !env.R2_ACCOUNT_ID || !accessKeyId || !secretAccessKey) return null;
  const s3=new S3Client({region:'auto',endpoint:`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED'});
  return {
    generationLedger:{
      async readLedger(){
        try {const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:'devotional-recordings/google-generation-ledger.json'}));
          if(!obj.Body||!obj.ETag||(obj.ContentLength??Infinity)>2*1024*1024)throw new Error('Invalid generation ledger');
          return {ledger:JSON.parse(await obj.Body.transformToString()),etag:obj.ETag};
        }catch(e:any){if(e?.$metadata?.httpStatusCode===404||e?.name==='NoSuchKey')return null;throw e;}
      },
      async saveLedger(ledger,etag){await s3.send(new PutObjectCommand({Bucket:bucket,Key:'devotional-recordings/google-generation-ledger.json',Body:JSON.stringify(ledger),ContentType:'application/json',...(etag?{IfMatch:etag}:{IfNoneMatch:'*'})}));},
    },
    async read(key) {
      try {
        const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
        if(!obj.Body || !obj.ETag || (obj.ContentLength ?? Infinity)>4096) throw new Error('Invalid recording manifest');
        return {manifest:manifestInput.parse(JSON.parse(await obj.Body.transformToString())),etag:obj.ETag};
      } catch(e:any) {if(e?.$metadata?.httpStatusCode===404 || e?.name==='NoSuchKey')return null;throw e;}
    },
    async saveAudio(key,bytes,format='mp3') {await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:format==='wav'?'audio/wav':'audio/mpeg',IfNoneMatch:'*'}));},
    async saveManifest(key,manifest,etag) {await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:JSON.stringify(manifest),ContentType:'application/json',...(etag?{IfMatch:etag}:{IfNoneMatch:'*'})}));},
    async signAudio(key) {
      const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));
      if(!head.ContentLength || !['audio/mpeg','audio/wav'].includes(head.ContentType??''))throw new Error('Recording unavailable');
      return getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:key,ResponseContentType:head.ContentType}),{expiresIn:120});
    },
  };
}
// Listener requests only reuse saved recordings. Generation is a separate
// administrator-only POST, with permanent claims and a reserved daily allowance.
export function registerDevotionalRecordings(app:Express, deps:{
  requireAdmin:RequestHandler; store:RecordingStore|null;
  generationEnv?:NodeJS.ProcessEnv; synthesize?:(script:string)=>Promise<Buffer>;
  readSource:(id:number)=>Promise<(RecordingText & {isDeleted?:boolean|null})|undefined>;
  translate:(source:any,lang:string)=>Promise<any>; today:()=>string;
}) {
  const env=deps.generationEnv??process.env;
  const synthesize=deps.synthesize??createGoogleDevotionalNarrator(env);
  const guard:RequestHandler=(req,res,next)=>{res.set('Cache-Control','private, no-store');next();};
  const sameOrigin:RequestHandler=(req,res,next)=>{
    try {if(new URL(req.get('origin') || '').host===req.get('host'))return next();}catch{}
    res.status(403).json({message:'Open the admin dashboard to change recordings.'});
  };
  const route=(fn:RequestHandler):RequestHandler=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch((e:any)=>{
    if(e instanceof GoogleNarrationError || e instanceof RecordingGenerationError){res.status(503).json({message:e.message});return;}
    const code=e instanceof z.ZodError?400:e?.$metadata?.httpStatusCode===412?409:503;
    res.status(code).json({message:code===409?'The recording changed. Refresh and review it again.':code===400?'Check the recording and language.':'Saved recording storage is temporarily unavailable.'});
  });
  async function current(req:express.Request, admin=false) {
    const id=z.coerce.number().int().positive().parse(req.params.id);
    const lang=langInput.parse(req.params.lang);
    const original=await deps.readSource(id);
    if(!original || original.isDeleted || (!admin && original.date>deps.today()))return null;
    const text=await deps.translate(original,lang);
    if(lang!=='en' && text._translatedTo!==lang)return null;
    const version=sha(devotionalRecordingSnapshot(text,lang));
    const prefix=`devotional-recordings/${id}/${lang}/${version}`;
    return {version,prefix,script:devotionalRecordingScript(text,lang)};
  }
  async function read(prefix:string) {
    const saved=await deps.store!.read(`${prefix}/manifest.json`);
    // A corrupted manifest cannot sign another book, upload or arbitrary key.
    if(saved && (!saved.manifest.key.startsWith(`${prefix}/`) || !/^audio-[a-f0-9-]{36}\.(mp3|wav)$/.test(saved.manifest.key.slice(prefix.length+1))))throw new Error('Invalid recording path');
    return saved;
  }
  const publicBase='/api/devotional-recordings/:id/:lang/:version';
  app.get(publicBase,guard,route(async(req,res)=>{
    hashInput.parse(req.params.version);const item=await current(req);
    if(!item || item.version!==req.params.version || !deps.store)return void res.json({available:false});
    const saved=await read(item.prefix);
    res.json({available:saved?.manifest.published===true,...(saved?.manifest.published?{audioPath:`/api/devotional-recordings/${req.params.id}/${req.params.lang}/${item.version}/audio`}:{})});
  }));
  app.get(`${publicBase}/audio`,guard,route(async(req,res)=>{
    hashInput.parse(req.params.version);const item=await current(req,!!req.session?.isAdmin);
    if(!item || item.version!==req.params.version || !deps.store)return void res.sendStatus(404);
    const saved=await read(item.prefix);
    if(!saved || (!saved.manifest.published && !req.session?.isAdmin))return void res.sendStatus(404);
    res.redirect(302,await deps.store.signAudio(saved.manifest.key));
  }));
  const adminBase='/api/admin/devotional-recordings/:id/:lang';
  app.get(adminBase,guard,deps.requireAdmin,route(async(req,res)=>{
    const item=await current(req,true);
    if(!item)return void res.status(404).json({message:'No saved text is available for this language.'});
    const saved=deps.store?await read(item.prefix):null;
    res.json({version:item.version,script:item.script,storageReady:!!deps.store,generationEnabled:!!googleVoiceConfig(env)&&!!deps.store?.generationLedger&&googleRecordingLanguages.includes(req.params.lang as any),generationProvider:'Google Gemini',generationVoice:'Sola',generationDailyCharacterLimit:googleVoiceConfig(env)?.cap??0,recording:saved?{audioHash:saved.manifest.audioHash,published:saved.manifest.published,bytes:saved.manifest.bytes,provider:saved.manifest.provider,audioPath:`/api/devotional-recordings/${req.params.id}/${req.params.lang}/${item.version}/audio`}:null});
  }));
  app.post(adminBase,guard,deps.requireAdmin,sameOrigin,express.raw({type:['audio/mpeg','audio/wav'],limit:'20mb'}),route(async(req,res)=>{
    const item=await current(req,true);
    if(!item || item.version!==hashInput.parse(req.query.version))return void res.status(409).json({message:'The text changed. Refresh before uploading.'});
    if(!deps.store)return void res.sendStatus(503);
    const bytes=req.body;
    const format=req.is('audio/wav')?'wav':'mp3';
    if(!Buffer.isBuffer(bytes) || bytes.length<128 || bytes.length>20*1024*1024 ||
      !(format==='wav'?isPcmWave(bytes):(bytes.subarray(0,3).toString()==='ID3' || (bytes[0]===0xff && (bytes[1]&0xe0)===0xe0))))return void res.status(400).json({message:'Upload a valid MP3 or 24 kHz mono PCM WAV recording, up to 20 MB.'});
    const previous=await read(item.prefix);
    if(previous?.manifest.published)return void res.status(409).json({message:'Unpublish the current recording before replacing it.'});
    const audioHash=sha(bytes);
    if(previous?.manifest.audioHash===audioHash)return void res.json({saved:true,audioHash});
    const key=`${item.prefix}/audio-${randomUUID()}.${format}`;
    await deps.store.saveAudio(key,bytes,format);
    await deps.store.saveManifest(`${item.prefix}/manifest.json`,{key,audioHash,bytes:bytes.length,published:false,format},previous?.etag);
    res.json({saved:true,audioHash});
  }));
  app.post(`${adminBase}/generate`,guard,deps.requireAdmin,sameOrigin,route(async(req,res)=>{
    const input=z.object({version:hashInput,replacePrivate:z.boolean().optional()}).strict().parse(req.body);
    const item=await current(req,true);
    if(!item||item.version!==input.version)return void res.sendStatus(409);
    const config=googleVoiceConfig(env);
    if(!config||!deps.store?.generationLedger||!googleRecordingLanguages.includes(req.params.lang as any))return void res.status(503).json({message:'Google narration is off. Configure the server key, confirm the free-tier project and set a daily character allowance first.'});
    if(item.script.length>6000)return void res.status(400).json({message:'This recording exceeds the single-generation limit. Prepare a reviewed recording manually.'});
    const previous=await read(item.prefix);
    if(previous?.manifest.provider==='google-sola')return void res.json({saved:true,reused:true});
    if(previous&&(previous.manifest.published||!input.replacePrivate))return void res.status(409).json({message:'Unpublish a public recording first. Explicitly choose a Sola replacement for an existing private recording.'});
    const claimId=googleGenerationId(item.prefix);
    const day=new Date().toISOString().slice(0,10);
    let result=await generationStep('ALLOWANCE_RESERVATION',()=>reserveGoogleRecording(deps.store!.generationLedger!,claimId,item.script.length,config.cap,day));
    // An operator may authorize ONE manual recovery for a specific failed script.
    // The original claim and character reservation are retained. Concurrent or
    // repeated clicks cannot obtain another recovery claim, and public GETs never generate.
    const recoveryIds=(env.DEVOTIONAL_TTS_MANUAL_RECOVERY_IDS??'').split(',').map(v=>v.trim()).filter(v=>/^[a-f0-9]{64}$/.test(v));
    if(result==='claimed' && recoveryIds.includes(claimId))result=await generationStep('ALLOWANCE_RESERVATION',()=>reserveGoogleRecording(deps.store!.generationLedger!,`${claimId}:manual-recovery-1`,item.script.length,config.cap,day));
    if(result!=='reserved')return void res.status(409).json({message:result==='capacity'?'Daily narration allowance exhausted. Saved recordings still play.':'This script already has a generation claim. Check the saved recording or failed request before any manual repair.'});
    const bytes=await generationStep('PROVIDER_REQUEST',()=>synthesize(item.script));
    if(!isPcmWave(bytes)||bytes.length>20*1024*1024)throw new Error('Invalid generated audio');
    // A concurrent manual upload wins. Never replace a reviewed recording.
    const latest=await read(item.prefix);
    if(latest?.etag!==previous?.etag)return void res.status(409).json({message:'The recording changed during generation. The newer recording was retained; no automatic retry was made.'});
    const key=`${item.prefix}/audio-${randomUUID()}.wav`,audioHash=sha(bytes);
    await generationStep('PRIVATE_AUDIO_SAVE',()=>deps.store!.saveAudio(key,bytes,'wav'));
    await generationStep('MANIFEST_SAVE',()=>deps.store!.saveManifest(`${item.prefix}/manifest.json`,{key,audioHash,bytes:bytes.length,published:false,format:'wav',provider:'google-sola'},previous?.etag));
    res.json({saved:true,reviewRequired:true});
  }));
  app.patch(adminBase,guard,deps.requireAdmin,sameOrigin,route(async(req,res)=>{
    const input=z.object({version:hashInput,audioHash:hashInput,published:z.boolean(),reviewed:z.boolean(),rightsConfirmed:z.boolean()}).strict().parse(req.body);
    const item=await current(req,true);
    if(!item || item.version!==input.version || !deps.store)return void res.sendStatus(409);
    const saved=await read(item.prefix);
    if(!saved || saved.manifest.audioHash!==input.audioHash)return void res.status(409).json({message:'The recording changed. Review the current recording.'});
    if(input.published && (!input.reviewed || !input.rightsConfirmed))return void res.status(400).json({message:'Listen to the full recording and confirm publication rights first.'});
    await deps.store.saveManifest(`${item.prefix}/manifest.json`,{...saved.manifest,published:input.published},saved.etag);
    res.json({published:input.published});
  }));
}
