import {useEffect,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Volume2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useI18n} from '@/hooks/useI18n';
import {api} from '@shared/routes';
import {PreparedAudioPlayer} from './PreparedAudioPlayer';

type Result={state:'ready'|'preparing'|'quota'|'review';hash:string;textReady:boolean};
export function TodayLanguageListen({source,language,onPlay,onStarted}:{source:any;language:string;onPlay:()=>void;onStarted?:()=>void}){
 const {t}=useI18n(), client=useQueryClient();
 const endpoint=`/api/devotionals/${source.id}/listen/${language}`;
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const audio=useRef<HTMLAudioElement>(null),active=useRef(true),played=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{
  if(result?.textReady && source._translatedTo!==language)void client.invalidateQueries({queryKey:[api.devotionals.getToday.path]});
 },[result?.textReady,language,client,source._translatedTo]);
 useEffect(()=>{
  if(result?.state!=='preparing')return;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>;
  async function poll(){
   try{
    const response=await fetch(endpoint,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error();
    const next:Result=await response.json();
    if(controller.signal.aborted)return;
    setResult(next);
    if(next.state==='preparing')timer=setTimeout(poll,8000);
   }catch{if(!controller.signal.aborted)setError('Could not check the recording. Tap Listen to try again.');}
  }
  timer=setTimeout(poll,4000);
  return()=>{clearTimeout(timer);controller.abort();};
 },[endpoint,result?.state,sending]);
 async function listen(){
  if(sending)return;
  setSending(true);setError('');
  if(audio.current)void audio.current.play().catch(()=>setError('Tap play in the audio player.'));
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({timezoneOffset:new Date().getTimezoneOffset()})});
   if(!response.ok)throw new Error();
   const next:Result=await response.json();if(active.current)setResult(next);
  }catch{if(active.current)setError('This recording is unavailable right now. Please try again later.');}
  finally{if(active.current)setSending(false);}
 }
 const hash=result?.hash??source._preparationSourceHash;
 function playbackStarted(){
  if(played.current)return;
  played.current=true;
  onStarted?.();
  void fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'play',timezoneOffset:new Date().getTimezoneOffset()})}).catch(()=>{});
 }
 return <div className="space-y-1">
  <Button type="button" size="sm" className="rounded-full" disabled={sending} onClick={()=>void listen()} data-testid="button-listen-devotional"><Volume2 className="mr-1 h-4 w-4"/>{t('listen')}</Button>
  <div role="status" className="text-sm">{error || (result?.state==='preparing'?'Preparing your recording. The player will appear here.':result?.state==='quota'?'Your request is saved. Audio preparation will resume when capacity returns.':result?.state==='review'?'This edition needs a language review before it can be heard.':'')}</div>
  {result?.state==='ready'&&hash&&<PreparedAudioPlayer ref={audio} kind="devotional" language={language} source={{...source,_preparationSourceHash:hash}} autoStart onPlay={onPlay} onPlaying={playbackStarted}/>}
 </div>;
}

