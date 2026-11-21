import {useEffect,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Volume2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useI18n} from '@/hooks/useI18n';
import {api} from '@shared/routes';
import {PreparedAudioPlayer} from './PreparedAudioPlayer';

type Result={state:'ready'|'preparing'|'quota'|'review';hash:string;textReady:boolean};
export function TodayLanguageListen({source,language,onPlay,onStarted,kind='devotional'}:{kind?:'devotional'|'school';source:any;language:string;onPlay:()=>void;onStarted?:()=>void}){
 const {t}=useI18n(), client=useQueryClient();
 const endpoint=`/api/${kind==='school'?'sunday-school':'devotionals'}/${source.id}/listen/${language}`;
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const audio=useRef<HTMLAudioElement>(null),active=useRef(true),played=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{
  if(result?.textReady && source._translatedTo!==language)void client.invalidateQueries({queryKey:kind==='school'?['/api/sunday-school',String(source.id),language]:[api.devotionals.getToday.path]});
 },[result?.textReady,language,client,source._translatedTo,source.id,kind]);
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
    if(next.state==='ready')void client.invalidateQueries({queryKey:[`/api/prepared-audio/${kind}/${source.id}/${language}/${next.hash}`]});
    if(next.state==='preparing')timer=setTimeout(poll,3500);
   }catch{if(!controller.signal.aborted)setError('Could not check the recording. Tap Listen to try again.');}
  }
  timer=setTimeout(poll,4000);
  return()=>{clearTimeout(timer);controller.abort();};
 },[endpoint,result?.state,sending]);
 async function listen(){
  if(audio.current){void audio.current.play().catch(()=>setError('Tap play in the audio player.'));return;}
  if(sending || (result?.state==='preparing'&&!error))return;
  setSending(true);setError('');

  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({timezoneOffset:new Date().getTimezoneOffset()})});
   if(!response.ok)throw new Error();
   const next:Result=await response.json();if(active.current){setResult(next);if(next.state==='ready')void client.invalidateQueries({queryKey:[`/api/prepared-audio/${kind}/${source.id}/${language}/${next.hash}`]});}
  }catch{if(active.current)setError('This recording is unavailable right now. Please try again later.');}
  finally{if(active.current)setSending(false);}
 }
 const hash=result?.hash??(source._translatedTo===language?source._preparationSourceHash:undefined);
 const waiting=sending||(result?.state==='preparing'&&!error);
 const notice=({ig:'Anyị na-akwadebe olu a. Biko chere ntakịrị.',yo:'A ń pèsè ohùn náà. Ẹ jọ̀wọ́, ẹ dúró díẹ̀.',ha:'Muna shirya sautin. Don Allah a ɗan jira.',pcm:'We dey prepare the audio. Abeg wait small.'} as Record<string,string>)[language]??'Preparing your recording. Please wait.';
 function playbackStarted(){
  if(played.current)return;
  played.current=true;
  onStarted?.();
  void fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'play',timezoneOffset:new Date().getTimezoneOffset()})}).catch(()=>{});
 }
 return <div className="space-y-1">
  <Button type="button" size="sm" className="rounded-full" disabled={waiting} aria-busy={waiting} onClick={()=>void listen()} data-testid={kind==='school'?'button-listen-lesson':'button-listen-devotional'}><Volume2 className="mr-1 h-4 w-4"/>{t('listen')}</Button>
  <div role="status" className={waiting?"rounded-lg border bg-background p-3 text-sm shadow-sm":"text-sm"}>{error || (waiting?notice:result?.state==='quota'?'Your request is saved. Audio preparation will resume when capacity returns.':result?.state==='review'?'This edition needs a language review before it can be heard.':'')}</div>
  {hash&&<PreparedAudioPlayer ref={audio} kind={kind} language={language} source={{...source,_preparationSourceHash:hash}} autoStart={result?.state==='ready'} onPlay={onPlay} onPlaying={playbackStarted}/>}
 </div>;
}

