import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import React,{act,useState} from 'react';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://365dailydevotional.com/feedback?source=menu#reply'});
for(const name of ['window','document','navigator','HTMLElement','localStorage','Event'])Object.defineProperty(globalThis,name,{configurable:true,value:(dom.window as any)[name]});
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
const {applyAppLanguage,getCurrentLang,getUIText,APP_LANGUAGE_CODES,isAppLanguage}=await import('../utils/i18n');
const {useI18n}=await import('./useI18n');
const {ContentLanguageNotice}=await import('../components/ContentLanguageNotice');

test('reader translations have complete keys and preserve interpolation placeholders',()=>{
 const locales=Object.fromEntries(APP_LANGUAGE_CODES.map(code=>[code,JSON.parse(readFileSync(new URL(`../locales/${code}.json`,import.meta.url),'utf8'))]));
 const keys=Object.keys(locales.en).filter(key=>key.startsWith('ui_'));
 assert.ok(keys.length>=87);
 for(const code of APP_LANGUAGE_CODES)for(const key of keys){
  assert.equal(typeof locales[code][key],'string',`${code}.${key}`);
  assert.ok(locales[code][key].trim(),`${code}.${key}`);
  assert.deepEqual(locales[code][key].match(/\{\w+\}/g)||[],locales.en[key].match(/\{\w+\}/g)||[],`${code}.${key}`);
 }
});

test('language changes update mounted controls and notices while preserving an unsent draft',async()=>{
 function Reader(){const {t}=useI18n();const[draft,setDraft]=useState('Private unsent message');return React.createElement('div',null,
  React.createElement('button',{onClick:()=>setDraft('Edited private message')},t('ui_send')),
  React.createElement('textarea',{value:draft,readOnly:true}),React.createElement(ContentLanguageNotice),React.createElement(ContentLanguageNotice,{translatedTo:'fr'}),React.createElement(ContentLanguageNotice,{translatedTo:'fr',publicationApproved:true}));}
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await act(async()=>root.render(React.createElement(Reader)));
 await act(async()=>container.querySelector('button')!.click());
 const before=window.history.length;
 await act(async()=>applyAppLanguage('fr'));
 assert.equal(container.querySelector('button')!.textContent,getUIText('ui_send','fr'));
 assert.equal(container.querySelector('textarea')!.value,'Edited private message');
 assert.equal(container.querySelectorAll('[data-testid="content-language-notice"]').length,1);
 assert.ok(!container.textContent!.includes(getUIText('ui_savedTranslation','fr')));
 assert.ok(!container.textContent!.includes(getUIText('ui_approvedTranslation','fr')));
 assert.ok(container.textContent!.includes(getUIText('ui_originalContent','fr')));
 assert.equal(document.documentElement.lang,'fr');assert.equal(window.history.length,before);
 assert.equal(new URL(window.location.href).searchParams.get('source'),'menu');assert.equal(window.location.hash,'#reply');
 // Another open tab can change the preference despite a stale query parameter.
 localStorage.setItem('devotionalLang','ha');
 await act(async()=>window.dispatchEvent(new dom.window.StorageEvent('storage',{key:'devotionalLang',newValue:'ha'})));
 assert.equal(getCurrentLang(),'ha');assert.equal(container.querySelector('button')!.textContent,getUIText('ui_send','ha'));
 await act(async()=>applyAppLanguage('en'));
 assert.equal(new URL(window.location.href).searchParams.has('lang'),false);
 assert.equal(container.querySelectorAll('[data-testid="content-language-notice"]').length,0);
 await act(async()=>root.unmount());container.remove();
});

test('invalid language codes and unavailable storage safely fall back to English',()=>{
 assert.equal(isAppLanguage('constructor'),false);assert.equal(isAppLanguage('__proto__'),false);
 window.history.replaceState(null,'','/?lang=constructor');localStorage.clear();assert.equal(getCurrentLang(),'en');
 const storage=globalThis.localStorage;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked storage');}});
 try{assert.equal(getCurrentLang(),'en');applyAppLanguage('yo');assert.equal(getCurrentLang(),'yo');assert.equal(document.documentElement.lang,'yo');assert.equal(getUIText('ui_send','constructor'),getUIText('ui_send','en'));}
 finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});}
});

test('an in-flight English request cannot overwrite the newly selected language or save translated text offline',async()=>{
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {useTodayDevotional}=await import('./use-devotionals');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:60000}}});
 const originalFetch=globalThis.fetch;
 const requests:Array<{url:string;resolve:(value:Response)=>void}>=[];
 let offlineWrites=0;
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open(){offlineWrites++;throw new Error('test storage unavailable');}}});
 globalThis.fetch=(async(input:any)=>new Promise<Response>(resolve=>requests.push({url:String(input),resolve}))) as typeof fetch;
 applyAppLanguage('en');
 function Reader(){const query=useTodayDevotional();return React.createElement('output',null,query.data?.content||'loading');}
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 try{
  await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(Reader))));
  assert.equal(requests.length,1);assert.equal(new URL(requests[0].url,window.location.href).searchParams.has('lang'),false);
  await act(async()=>applyAppLanguage('fr'));
  assert.equal(requests.length,2);assert.equal(new URL(requests[1].url,window.location.href).searchParams.get('lang'),'fr');
  const response=(content:string)=>new Response(JSON.stringify({id:1,date:'2026-11-19',content}),{status:200,headers:{'Content-Type':'application/json'}});
  await act(async()=>{requests[1].resolve(response('Texte enregistré'));await new Promise(r=>setTimeout(r,20));});
  assert.equal(container.textContent,'Texte enregistré');assert.equal(offlineWrites,0,'saved translations must not replace the English offline store');
  await act(async()=>{requests[0].resolve(response('Original teaching'));await new Promise(r=>setTimeout(r,20));});
  assert.equal(container.textContent,'Texte enregistré');assert.equal(offlineWrites,1,'English remains the only offline write');
  await act(async()=>applyAppLanguage('en'));
  assert.equal(container.textContent,'Original teaching');
 }finally{await act(async()=>root.unmount());client.clear();container.remove();globalThis.fetch=originalFetch;}
});
