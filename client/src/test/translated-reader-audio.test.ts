import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import pilot from '../../../server/content-translations/2026-11-19-glorious-light.json';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'https://example.invalid/devotional/2026-11-19?lang=yo'});
for (const key of ['window','document','navigator','location','history','HTMLElement','Element','Node','Event','MutationObserver','CustomEvent','localStorage','getComputedStyle'])
  Object.defineProperty(globalThis,key,{configurable:true,value:(dom.window as any)[key]});
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:class{observe(){}unobserve(){}disconnect(){}}});
const spoken:any[]=[];
(dom.window as any).speechSynthesis={getVoices:()=>[{name:'English',voiceURI:'english',lang:'en-US'}],addEventListener(){},removeEventListener(){},cancel(){},resume(){},pause(){},speak(u:any){spoken.push(u);u.onstart?.();}};
(globalThis as any).SpeechSynthesisUtterance=class{constructor(public text:string){}};
let fetches=0;
globalThis.fetch=(async (url:any)=>{assert.equal(String(url),'/api/devotionals/date/2026-11-19?lang=en');fetches++;return new Response(JSON.stringify(pilot.source),{status:200,headers:{'Content-Type':'application/json'}});}) as typeof fetch;
const fixtures:Record<string,string>={
  '@/hooks/use-scripture':`export const useScriptureText=(ref,text)=>({text,isLoading:false,isFallback:false});`,
  '@/components/ScriptureReading':`export const ScriptureLinks=()=>null;`,
  '@/contexts/TranslationContext':`export const useTranslation=()=>({translation:'KJV'});`,
  '@/contexts/FontSizeContext':`export const useFontSize=()=>({fontSize:'medium'});`,
  '@/contexts/ThemeContext':`export const useTheme=()=>({resolvedTheme:'light',setTheme:()=>{}});`,
  '@/hooks/useDevotionalAccount':`const noop=()=>{};export const useDevotionalAccount=()=>({isSignedIn:false,isSaved:false,savePending:false,toggleSave:noop,noteText:'',setNoteText:noop,notePending:false,noteLoaded:true,saveNote:noop,deleteNote:noop,recordRead:noop,NOTE_MAX:1000});`,
  '@/components/ShareButton':`export const ShareButton=()=>null;`,
};
const dir=path.resolve('node_modules/.cache/translated-reader-audio');mkdirSync(dir,{recursive:true});const outfile=path.join(dir,'screen.mjs');
await build({stdin:{contents:`export {DevotionalCard} from '@/components/DevotionalCard';export {AudioMiniPlayer} from '@/components/AudioMiniPlayer';export {stopAudioOnNavigate} from '@/hooks/useAudioReader';export {getUIText} from '@/utils/i18n';`,resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,format:'esm',platform:'node',jsx:'automatic',tsconfig:'tsconfig.json',external:['react','react/*','react-dom','react-dom/*','@tanstack/react-query'],banner:{js:"import {createRequire} from 'node:module';const require=createRequire(import.meta.url);"},plugins:[{name:'fixtures',setup(builder){builder.onResolve({filter:/.*/},args=>args.path in fixtures?{path:args.path,namespace:'fixture'}:undefined);builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:fixtures[args.path],loader:'js'}));}}]});
const screen=await import(pathToFileURL(outfile).href);
const {createRoot}=await import('react-dom/client');
const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
test('translated reading has no AI notice, reports missing device voice, and starts the English original from a second tap',async()=>{
  const translated=pilot.drafts.find(d=>d.language==='yo')!;
  const devotional={...pilot.source,...translated,_translatedTo:'yo',_translationApproval:'ministry-approved'};
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  try{
    await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(React.Fragment,null,React.createElement(screen.DevotionalCard,{devotional}),React.createElement(screen.AudioMiniPlayer)))));
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
    assert.equal(container.querySelector('[data-testid="content-language-notice"]'),null);
    assert.ok(!container.textContent?.includes(screen.getUIText('ui_approvedTranslation','yo')));
    assert.ok(container.textContent?.includes(translated.title));
    await act(async()=>container.querySelector<HTMLButtonElement>('[data-testid="button-listen-devotional"]')!.click());
    assert.equal(spoken.length,0,'do not silently use an English voice to claim Yoruba narration');
    assert.ok(container.querySelector('[data-testid="audio-reader-error"]')?.textContent?.includes('yo-NG'));
    const fallback=container.querySelector<HTMLButtonElement>('[data-testid="devotional-english-audio-fallback"] button')!;
    assert.ok(fallback);assert.equal(fallback.disabled,false);
    await act(async()=>fallback.click());
    assert.equal(spoken.length,1);assert.equal(spoken[0].lang,'en-US');
    assert.ok(spoken[0].text.startsWith(pilot.source.title));assert.ok(!spoken[0].text.includes(translated.title));
    assert.equal(fetches,1,'reuse the prefetched saved English text');
    assert.equal(container.querySelector('[data-testid="audio-reader-error"]'),null);
    assert.ok(container.querySelector('[data-testid="audio-mini-player"]'));
  }finally{await act(async()=>{screen.stopAudioOnNavigate();root.unmount();});client.clear();container.remove();}
});
after(()=>dom.window.close());
