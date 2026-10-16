import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createElement } from 'react';
import { create, act } from 'react-test-renderer';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { startMusicPlayback, usesSystemMusicVolume } from '../client/src/lib/music-volume';

// Run the real provider with a controllable media element, without Firebase.
const dir = await mkdtemp(new URL('../.music-test-', import.meta.url).pathname);
const featuredSource = await readFile('client/src/components/SongOfTheWeek.tsx', 'utf8');
const featuredHook = featuredSource.slice(featuredSource.indexOf('function useAudioPlayer('), featuredSource.indexOf('// ── Lyrics Modal'));
await build({ stdin: {contents: `import {useRef,useCallback} from 'react';
  import {useMusicPlayer} from './client/src/contexts/MusicPlayerContext';
  export {MusicPlayerProvider,useMusicPlayer} from './client/src/contexts/MusicPlayerContext';
  ${featuredHook}
  export {useAudioPlayer};`, resolveDir: process.cwd(), loader: 'tsx'}, bundle: true,
  platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', outfile: `${dir}/provider.cjs`,
  plugins: [{ name: 'signed-out-user', setup(b) {
    b.onResolve({filter: /^@\/contexts\/UserContext$/}, () => ({path:'user', namespace:'stub'}));
    b.onLoad({filter: /.*/, namespace:'stub'}, () => ({contents:'export const useUser = () => ({user:null,emailVerified:false,getIdToken:async()=>null});'}));
  }}],
});
const { MusicPlayerProvider, useMusicPlayer, useAudioPlayer } = createRequire(import.meta.url)(`${dir}/provider.cjs`);

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = ''; currentTime = 0; duration = 240; volume = 1; playbackRate = 1;
  paused = true; error: any = null; plays = 0; loads = 0;
  constructor() { super(); FakeAudio.instances.push(this); }
  play() { this.plays++; this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
  pause() { if (!this.paused) { this.paused = true; this.dispatchEvent(new Event('pause')); } }
  load() { this.loads++; }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}
function storage() { const data = new Map(); return {getItem:(k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}; }
const song = (id: number) => ({id,title:`Song ${id}`,slug:`song-${id}`,labelName:'SpiritTone',audioUrl:`song-${id}.mp3`,isActive:true});
async function mount(withFeatured = false) {
  FakeAudio.instances = [];
  Object.assign(globalThis, {Audio:FakeAudio,window:new EventTarget(),localStorage:storage(),sessionStorage:storage(),
    fetch:async()=>({ok:true,json:async()=>[song(1),song(2),song(3)]})});
  let player: any, featured: any; function Probe(){ player=useMusicPlayer(); featured=useAudioPlayer(withFeatured ? song(1) : undefined); return null; }
  let tree: any;
  await act(async()=> {tree=create(createElement(MusicPlayerProvider,null,createElement(Probe)));});
  return {get player(){return player;},get featured(){return featured;},tree,audio:FakeAudio.instances[0]};
}

test('one persistent audio element across 100 progress updates; play starts within tap', async()=>{
  const m=await mount();
  act(()=>m.player.playSong(song(1)));
  assert.equal(m.audio.plays,1); // no canplay/metadata event needed
  for(let i=1;i<=100;i++) act(()=>{m.audio.currentTime=i; m.audio.dispatchEvent(new Event('timeupdate'));});
  assert.equal(FakeAudio.instances.length,1);
  assert.equal(m.audio.loads,0);
  assert.equal(m.player.currentTime,100);
  assert.equal(m.player.isPlaying,true);
  act(()=>m.tree.unmount());
});
test('pause/resume keeps the source and position',async()=>{
  const m=await mount(); act(()=>m.player.playSong(song(1)));
  m.audio.currentTime=42;
  act(()=>m.player.togglePlay()); assert.equal(m.player.isPlaying,false);
  act(()=>m.player.togglePlay()); assert.equal(m.player.isPlaying,true);
  assert.equal(m.audio.currentTime,42); assert.equal(m.audio.src,'/api/songs/1/audio');
  act(()=>m.tree.unmount());
});
test('rapid track changes and close cancel the old pending resume',async()=>{
  const m=await mount();
  act(()=>m.player.playSong(song(1))); m.audio.currentTime=90;
  act(()=>m.player.playSong(song(2)));
  act(()=>m.player.playSong(song(1))); // pending seek to 90
  act(()=>m.player.playSong(song(3))); // supersedes it
  m.audio.currentTime=0; act(()=>m.audio.dispatchEvent(new Event('loadedmetadata')));
  assert.equal(m.audio.currentTime,0);
  act(()=>m.player.closePlayer());
  act(()=>m.audio.dispatchEvent(new Event('loadedmetadata')));
  assert.equal(m.player.currentSong,null); assert.equal(m.audio.paused,true);
  act(()=>m.tree.unmount());
});
test('storage quota errors do not interrupt playback; media errors allow retry',async()=>{
  const m=await mount();
  localStorage.setItem=()=>{throw new Error('QuotaExceededError');};
  act(()=>m.player.playSong(song(1))); act(()=>m.player.togglePlay()); act(()=>m.player.togglePlay());
  assert.equal(m.player.isPlaying,true);
  m.audio.error={code:2}; act(()=>m.audio.dispatchEvent(new Event('error')));
  assert.match(m.player.playbackError,/Play to retry/);
  const before=m.audio.plays;
  act(()=>m.player.togglePlay()); assert.equal(m.audio.plays,before+1);
  act(()=>m.tree.unmount());
});
test('service worker passes streams/ranges through without caching or buffering',async()=>{
  const handlers: Record<string,Function>={}; let intercepted=false;
  vm.runInNewContext(await readFile('client/public/service-worker.js','utf8'),{
    self:{addEventListener:(n:string,fn:Function)=>handlers[n]=fn}, URL,
  });
  for(const [path,destination,range] of [
    ['/api/songs/1/audio','audio',false], ['/objects/uploads/video','video',false],
    ['/objects/uploads/file','',true], ['/objects/uploads/file','',false],
  ] as const){
    intercepted=false;
    handlers.fetch({request:{method:'GET',url:`https://365dailydevotional.com${path}`,destination,headers:{has:()=>range}},respondWith:()=>intercepted=true});
    assert.equal(intercepted,false,path);
  }
});
test('route pages remain mounted during playback updates and still navigate', async()=>{
  const source=await readFile('client/src/App.tsx','utf8');
  const router=source.slice(source.indexOf('const Router ='),source.indexOf('function AppContent()'));
  const names=new Set([...router.matchAll(/<([A-Z]\w*)|component=\{([A-Z]\w*)/g)].map(m=>m[1]||m[2]));
  ['Route','Switch','Suspense'].forEach(n=>names.delete(n));
  const code=`import React, {memo,Suspense,useEffect} from 'react';
    import {Route,Switch,Router as WRouter} from 'wouter';
    import {memoryLocation} from 'wouter/memory-location';
    export const mounts={};
    ${[...names].map(n=>`function ${n}(){useEffect(()=>{mounts['${n}']=(mounts['${n}']||0)+1},[]);return null;}`).join('\n')}
    ${router}
    export {Router,WRouter,memoryLocation};`;
  await writeFile(`${dir}/routes.tsx`,code);
  await build({entryPoints:[`${dir}/routes.tsx`],bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:`${dir}/routes.mjs`});
  const {Router,WRouter,memoryLocation,mounts}=await import(`${dir}/routes.mjs`);
  const location=memoryLocation({path:'/music'});
  function Shell({tick}:{tick:number}){return createElement('div',{'data-tick':tick},createElement(Router));}
  let tree:any;
  const view=(tick:number)=>createElement(WRouter,{hook:location.hook},createElement(Shell,{tick}));
  act(()=>{tree=create(view(0));});
  for(let i=1;i<=100;i++) act(()=>tree.update(view(i)));
  assert.equal(mounts.Music,1,'artwork/filter state must not be destroyed by timer ticks');
  act(()=>location.navigate('/music/song-1')); assert.equal(mounts.SongDetail,1);
  for(let i=101;i<=120;i++) act(()=>tree.update(view(i)));
  assert.equal(mounts.SongDetail,1,'player detail must remain mounted');
  act(()=>location.navigate('/music')); assert.equal(mounts.Music,2);
  act(()=>tree.unmount());
});
test('iPhone requests music playback at full app gain before starting audio', async()=>{
  const browser={userAgent:'iPhone',audioSession:{type:'play-and-record'}};
  let played=false;
  const audio={volume:0.6,play:()=>{
    assert.equal(browser.audioSession.type,'playback');
    assert.equal(audio.volume,1); played=true; return Promise.resolve();
  }};
  await startMusicPlayback(audio as any,browser);
  assert.equal(played,true);
  assert.equal(usesSystemMusicVolume({platform:'MacIntel',maxTouchPoints:5}),true);
});
test('desktop volume preference and unsupported session browsers still work', async()=>{
  let plays=0;
  const audio={volume:0.6,play:()=>{plays++;return Promise.resolve();}};
  await startMusicPlayback(audio as any,{userAgent:'Desktop'});
  assert.equal(audio.volume,0.6);
  const browser={userAgent:'Desktop',get audioSession(){throw new Error('Unavailable');}};
  await startMusicPlayback(audio as any,browser);
  assert.equal(plays,2);
});
test('Today’s Message and SpiritTone share audio, volume, position and controls', async()=>{
  const m=await mount(true);
  act(()=>m.featured.togglePlay());
  assert.equal(m.player.currentSong.id,1);
  assert.equal(m.audio.src,'/api/songs/1/audio');
  assert.equal(FakeAudio.instances.length,1);
  act(()=>m.player.setVolume(0.8)); assert.equal(m.featured.volume,0.8);
  m.audio.currentTime=37; act(()=>m.audio.dispatchEvent(new Event('timeupdate')));
  assert.equal(m.featured.currentTime,37);
  act(()=>m.player.togglePlay()); assert.equal(m.featured.isPlaying,false);
  act(()=>m.featured.togglePlay()); assert.equal(m.player.isPlaying,true);
  assert.equal(m.audio.currentTime,37);
  act(()=>m.player.playSong(song(2)));
  assert.equal(m.featured.isPlaying,false);
  const otherPosition=m.audio.currentTime;
  act(()=>m.featured.seek(12)); assert.equal(m.audio.currentTime,otherPosition);
  act(()=>m.featured.togglePlay()); assert.equal(m.player.currentSong.id,1);
  assert.equal(FakeAudio.instances.length,1);
  act(()=>m.tree.unmount());
});
test.after(async()=>rm(dir,{recursive:true,force:true}));
