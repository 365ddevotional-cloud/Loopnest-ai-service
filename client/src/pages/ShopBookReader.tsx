import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import type { ReaderEdition } from "@shared/shop-audiobook";

export default function ShopBookReader() {
  useI18n();
  const [,params]=useRoute('/shop/read/:editionId');
  const {user,getIdToken}=useUser();
  const editionId=params?.editionId??'';
  const audio=useRef<HTMLAudioElement>(null);
  const requestVersion=useRef(0);
  const timer=useRef<ReturnType<typeof setTimeout>>();
  const resumeSeconds=useRef(0);
  const nextRecording=useRef<{index:number;url:string;expires:number;preload:HTMLAudioElement}>();
  const playing=useRef(false);
  const [index,setIndex]=useState(0);
  const [speed,setSpeed]=useState(1);
  const [active,setActive]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function call(path:string,method='GET',body?:object) {
    const token=await getIdToken();
    if(!token) throw new Error('Sign in to open this book.');
    const response=await fetch(`/api/ministry-shop/reader/${editionId}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message??'Book unavailable.');
    return data;
  }
  const reader=useQuery<ReaderEdition>({queryKey:['shop-reader',user?.uid,editionId],enabled:!!user && !!editionId,retry:false,queryFn:()=>call('')});
  const book=reader.data;
  const latest=useRef({index,speed,book}); latest.current={index,speed,book};
  const save=async () => {
    const state=latest.current;
    const paragraph=state.book?.paragraphs[state.index];
    if(paragraph) await call('/position','PUT',{paragraphId:paragraph.id,seconds:audio.current?.currentTime??0,speed:state.speed});
  };
  useEffect(()=> {
    if(!book) return;
    const restored=book.position && book.paragraphs.findIndex(p=>p.id===book.position?.paragraphId);
    setIndex(typeof restored==='number' && restored>=0 ? restored : 0);
    setSpeed(book.position?.speed??1); resumeSeconds.current=book.position?.seconds??0;
  },[book?.id]);
  useEffect(()=> {
    const saveTimer=setInterval(()=>{void save().catch(()=>{});},15000);
    return ()=>clearInterval(saveTimer);
  },[editionId,user?.uid]);
  useEffect(()=>()=>{requestVersion.current++;clearTimeout(timer.current);audio.current?.pause();},[editionId,user?.uid]);
  useEffect(()=>{if(audio.current) audio.current.playbackRate=speed;},[speed]);
  useEffect(()=>{const player=audio.current;return ()=>{player?.pause();nextRecording.current=undefined;};},[book?.id,user?.uid]);

  async function start(nextIndex:number,seconds=0,attempt=0,version?:number) {
    if(!book?.audioOwned || !book.paragraphs[nextIndex]) return;
    const current=version ?? ++requestVersion.current;
    clearTimeout(timer.current);timer.current=undefined;
    audio.current?.pause(); playing.current=false;
    setIndex(nextIndex);
    document.getElementById(`passage-${nextIndex}`)?.scrollIntoView({behavior:"smooth",block:"center"});
    setBusy(true);setError('');setActive(false);
    try {
      const prepared=nextRecording.current;
      const result=prepared?.index===nextIndex && prepared.expires>Date.now() ? {url:prepared.url} : await call('/audio','POST',{paragraphId:book.paragraphs[nextIndex].id});
      if(current!==requestVersion.current) return;
      if(result.pending) {
        if(attempt>=15) throw new Error('The recording is still being prepared. Please try this passage again shortly.');
        timer.current=setTimeout(()=>void start(nextIndex,seconds,attempt+1,current),2000);return;
      }
      if(!audio.current) return;
      audio.current.src=result.url;
      resumeSeconds.current=seconds;
      audio.current.playbackRate=speed;
      // Mobile browsers may require a second tap after the first recording loads.
      // Keep the prepared source so that tap can play it without another request.
      await audio.current.play();
      if(current!==requestVersion.current) {audio.current.pause();return;}
      playing.current=true;setActive(true);
      // Prepare at most one passage ahead. This reuses the same server cache,
      // and avoids a new synthesis wait at every paragraph boundary.
      if(book.paragraphs[nextIndex+1])void call('/audio','POST',{paragraphId:book.paragraphs[nextIndex+1].id}).then(next=>{
        if(current!==requestVersion.current || !next.url)return;
        const preload=new Audio();preload.preload='auto';preload.src=next.url;
        nextRecording.current={index:nextIndex+1,url:next.url,expires:Date.now()+90000,preload};
      }).catch(()=>{});
    } catch(err) {
      if(current!==requestVersion.current) return;
      setError(err instanceof Error && err.name==='NotAllowedError' ? 'Your passage is ready. Tap Play to listen.' : err instanceof Error ? err.message : 'Unable to play this passage.');
    } finally {if(current===requestVersion.current && !timer.current) setBusy(false);}
  }
  async function toggle() {
    if(active || busy) {
      requestVersion.current++;clearTimeout(timer.current);timer.current=undefined;
      audio.current?.pause();playing.current=false;setActive(false);setBusy(false);void save().catch(()=>{});return;
    }
    if(audio.current?.src) {
      try {await audio.current.play();playing.current=true;setActive(true);setError('');} catch {setError(tx("Tap the audio player’s Play button to continue."));}
    } else await start(index,resumeSeconds.current);
  }
  if(!user) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">{tx("Your book reader")}</h1><Button asChild className="mt-5"><Link href={`/signin?return=${encodeURIComponent('/shop/read/'+editionId)}`}>{tx("Sign in to read")}</Link></Button></main>;
  return <main className="mx-auto max-w-3xl px-4 py-7 pb-44">
    <Link href="/shop/purchases" className="text-primary underline">{tx("← Your purchases")}</Link>
    {reader.isLoading && <p className="mt-5">{tx("Opening your book…")}</p>}
    {reader.error && <p role="alert" className="mt-5">{reader.error.message}</p>}
    {book && <>
      <h1 className="mt-5 font-serif text-3xl font-bold">{book.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{book.author??tx("Moses Afolabi")} {tx("· Your reading position saves automatically.")}</p>
      <nav className="mt-5"><label className="text-sm font-semibold">{tx("Go to a section")}<select className="mt-2 block min-h-11 w-full rounded-md border bg-background p-2" value={book.paragraphs[index]?.id} onChange={e=>{
        const next=book.paragraphs.findIndex(p=>p.id===e.target.value);if(next<0)return;
        if(book.audioOwned)void start(next);else setIndex(next);
        document.getElementById(`passage-${next}`)?.scrollIntoView({behavior:'smooth',block:'center'});
      }}>{book.paragraphs.map((p,i)=><option key={p.id} value={p.id}>{p.heading?'§ ':''}{p.page?`Page ${p.page} · `:''}{p.text.slice(0,90)}</option>)}</select></label></nav>
      <article className="mt-7 space-y-5 text-[19px] leading-9">
        {book.paragraphs.map((p,i)=><div id={`passage-${i}`} key={p.id} className={`scroll-mt-28 rounded-lg border-l-4 p-3 ${i===index?'border-orange-500 bg-orange-500/10':'border-transparent'} ${p.heading?'pt-7 text-2xl font-bold':''}`}>
          {book.audioOwned ? <button type="button" className="w-full whitespace-pre-wrap text-left" aria-label={`Listen: ${p.text.slice(0,75)}`} aria-current={i===index?'true':undefined} onClick={()=>void start(i)}>{p.text}</button> : <p className="whitespace-pre-wrap">{p.text}</p>}
        </div>)}
      </article>
      <section aria-label={tx("Audiobook player")} className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-3 shadow-lg">
        <div className="mx-auto max-w-3xl space-y-2">
          {book.audioOwned ? <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={index===0} onClick={()=>void start(index-1)}>{tx("Previous")}</Button>
              <Button onClick={()=>void toggle()}>{busy?tx("Cancel preparation"):active?tx("Pause"):tx("Play")}</Button>
              <Button variant="outline" disabled={index>=book.paragraphs.length-1} onClick={()=>void start(index+1)}>{tx("Next")}</Button>
              <label className="ml-auto text-sm">{tx("Speed")} <select className="rounded border bg-background p-2" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.75,1,1.25,1.5,1.75,2].map(s=><option key={s} value={s}>{s}×</option>)}</select></label>
            </div>
            <audio ref={audio} controls className="h-9 w-full" onLoadedMetadata={()=>{if(audio.current){audio.current.currentTime=Math.min(resumeSeconds.current,Number.isFinite(audio.current.duration)?Math.max(0,audio.current.duration-.1):resumeSeconds.current);audio.current.playbackRate=speed;}resumeSeconds.current=0;}} onPlay={()=>{playing.current=true;setActive(true);setBusy(false);}} onPause={()=>{playing.current=false;setActive(false);void save().catch(()=>{});}} onEnded={()=>{if(index+1<book.paragraphs.length)void start(index+1);else{setActive(false);void save().catch(()=>{});}}} onError={()=>{setBusy(false);setActive(false);setError(tx("This recording could not load. Tap the passage to request a fresh link."));}} />
            <p className="text-xs text-muted-foreground">{tx("Audiobook · Digitally narrated ·")} {book.voice} {tx("· Passage")} {index+1} {tx("of")} {book.paragraphs.length}</p>
          </> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm">{tx("Read your book here. Available audiobook upgrades appear on its product page.")}</p><Button asChild variant="outline"><Link href={`/shop/${book.productId}`}>{tx("Book details")}</Link></Button></div>}
          {error && <p role="status" className="text-sm">{error}</p>}
        </div>
      </section>
    </>}
  </main>;
}
