import {forwardRef,useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
type Props={kind:'devotional'|'school';source:any;language:string;onPlay?:()=>void};
export const PreparedAudioPlayer=forwardRef<HTMLAudioElement,Props>(function PreparedAudioPlayer({kind,source,language,onPlay},forwardedRef){
 const hash=source?._preparationSourceHash,prefix=`/api/prepared-audio/${kind}/${source.id}/${language}/${hash}`;
 const manifest=useQuery<{available:boolean;parts?:string[]}>({queryKey:[prefix],enabled:!!hash,retry:false,staleTime:30000,queryFn:async()=>{const r=await fetch(prefix,{credentials:'include'});if(!r.ok)throw new Error('Recording unavailable');const d=await r.json();return d.available===true&&Array.isArray(d.parts)&&d.parts.length<=20&&d.parts.every((p:string,i:number)=>p===`${prefix}/${i}`)?d:{available:false};}});
 const audio=useRef<HTMLAudioElement|null>(null),[index,setIndex]=useState(0),[speed,setSpeed]=useState(language==='ha'?.85:.92),[error,setError]=useState('');const advance=useRef(false);
 useEffect(()=>{audio.current?.pause();setIndex(0);setSpeed(language==='ha'?.85:.92);setError('');advance.current=false;},[hash,language]);
 useEffect(()=>{if(audio.current)audio.current.playbackRate=speed;},[speed,index]);
 useEffect(()=>{if(advance.current){advance.current=false;void audio.current?.play().catch(()=>setError('Tap play to continue the saved recording.'));}},[index]);
 useEffect(()=>{const player=audio.current;return()=>player?.pause();},[manifest.data?.parts,index]);
 const parts=manifest.data?.parts;if(!manifest.data?.available||!parts?.length)return null;
 return <section aria-label="Saved narration" className="my-4 space-y-2 rounded-lg border p-3">
  <audio key={parts[index]} ref={el=>{audio.current=el;if(typeof forwardedRef==='function')forwardedRef(el);else if(forwardedRef)forwardedRef.current=el;}} controls preload="none" src={parts[index]} className="w-full" data-testid="prepared-content-audio" onLoadedMetadata={e=>{e.currentTarget.playbackRate=speed;}} onPlay={()=>{onPlay?.();setError('');}} onError={()=>setError('The saved recording could not play. Refresh and tap play again.')} onEnded={()=>{if(index+1<parts.length){advance.current=true;setIndex(i=>i+1);}}}/>
  <div className="flex flex-wrap items-center gap-3 text-sm"><label>Playback speed <select aria-label="Saved narration speed" className="ml-2 rounded border bg-background p-1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.75,.85,.92,1,1.15,1.25].map(v=><option key={v} value={v}>{v}×</option>)}</select></label>{parts.length>1&&<><button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>Previous part</button><span>{index+1} / {parts.length}</span><button disabled={index+1===parts.length} onClick={()=>setIndex(i=>i+1)}>Next part</button></>}</div>
  {error&&<p role="alert" className="text-sm">{error}</p>}
 </section>;
});

export function PreparedScriptureCredit({source}:{source:any}){return source?._scriptureTranslation?<p className="my-2 text-xs text-muted-foreground">Scripture: {source._scriptureTranslation}. © Biblica. <a className="underline" href={source._scriptureSourceUrls?.[0]} target="_blank" rel="noreferrer">Source</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Devotional translation prepared separately.</p>:null;}
