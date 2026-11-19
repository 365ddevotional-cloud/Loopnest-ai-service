import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import React, {act} from "react";
import { JSDOM } from "jsdom";

const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://365dailydevotional.com/signin?return=%2Fshop%2Fbook-1"});
for(const key of ["window","document","navigator","location","history","DocumentFragment","HTMLElement","HTMLInputElement","HTMLTextAreaElement","Element","Node","NodeFilter","MutationObserver","CustomEvent","Event","localStorage","getComputedStyle"])
  Object.defineProperty(globalThis,key,{configurable:true,value:(dom.window as any)[key]});
Object.assign(globalThis,{addEventListener:dom.window.addEventListener.bind(dom.window),removeEventListener:dom.window.removeEventListener.bind(dom.window),dispatchEvent:dom.window.dispatchEvent.bind(dom.window),ResizeObserver:class {observe(){} unobserve(){} disconnect(){}},React,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:(fn:()=>void)=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout});
const fixtures:Record<string,string>={
  "@/contexts/UserContext":`let user=null;export const setUser=(next)=>user=next;export function useUser(){return {user,loading:false,emailVerified:!!user,getIdToken:async()=>"fixture-token",signIn:async()=>({success:false,error:"Incorrect email or password."}),signUp:async()=>({success:false,error:"Could not create account."}),resetPassword:async()=>({success:true}),signUserOut:async()=>{},resendVerification:async()=>({sent:false}),checkEmailVerified:async()=>false};}`,
  "@/lib/firebase":`export const auth={currentUser:null};`,
  "@/contexts/FontSizeContext":`export function useFontSize(){return {fontSize:"medium",setFontSize:()=>{}};}`,
  "@/contexts/ThemeContext":`export function useTheme(){return {theme:"light",setTheme:()=>{}};}`,
  "@/contexts/MusicPlayerContext":`export function useMusicPlayer(){return {recentlyPlayed:[]};}`,
  "./MusicPurchasePanel":`export function useDeviceMusicCountry(){return {deviceCountry:"US",locationResolved:true,retryDeviceLocation:()=>{}};}`,
};
const cacheDir=path.resolve("node_modules/.cache/stage-two-tests");mkdirSync(cacheDir,{recursive:true});const bundle=path.join(cacheDir,"screens.mjs");
await build({stdin:{contents:`export {default as SignIn} from "@/pages/SignIn";export {default as PrayerCounseling} from "@/pages/PrayerCounseling";export {default as MyLibrary} from "@/pages/MyLibrary";export {SettingsModal} from "@/components/SettingsModal";export {ShopCheckout} from "@/components/MinistryShopCheckout";export {setUser} from "@/contexts/UserContext";export {applyAppLanguage,translateAppText,translateAccountError} from "@/utils/i18n";`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,outfile:bundle,format:"esm",platform:"node",banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"},jsx:"automatic",tsconfig:"tsconfig.json",external:["react","react/*","react-dom","react-dom/*","@tanstack/react-query"],plugins:[{name:"local-fixtures",setup(builder){builder.onResolve({filter:/.*/},args=>args.path in fixtures?{path:args.path,namespace:"fixture"}:undefined);builder.onLoad({filter:/.*/,namespace:"fixture"},args=>({contents:fixtures[args.path],loader:"js"}));}}]});
const screens=await import(pathToFileURL(bundle).href);
const {createRoot}=await import("react-dom/client");const {QueryClient,QueryClientProvider}=await import("@tanstack/react-query");
async function mount(Component:any,props:any={}) {
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});const container=document.createElement("div");document.body.append(container);const root=createRoot(container);
  await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(Component,props))));
  return {container,close:async()=>{await act(async()=>root.unmount());client.clear();container.remove();}};
}
function fill(input:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=input instanceof dom.window.HTMLTextAreaElement?dom.window.HTMLTextAreaElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value")!.set!.call(input,value);input.dispatchEvent(new dom.window.Event("input",{bubbles:true}));}

test("sign-in keeps credentials and return URL while visible labels change",async()=>{
  screens.setUser(null);screens.applyAppLanguage("en");const view=await mount(screens.SignIn);
  const inputs=Array.from(view.container.querySelectorAll("input"));const email=inputs.find(x=>x.type==="email")!,password=inputs.find(x=>x.type==="password")!;
  await act(async()=>{fill(email,"language-fixture@example.invalid");fill(password,"dummy-not-a-real-password");});
  await act(async()=>screens.applyAppLanguage("es"));
  assert.equal(email.value,"language-fixture@example.invalid");assert.equal(password.value,"dummy-not-a-real-password");
  assert.ok(view.container.textContent!.includes(screens.translateAppText("Sign In")));
  assert.equal(new URL(window.location.href).searchParams.get("return"),"/shop/book-1");
  await act(async()=>view.container.querySelector("form")!.dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true})));
  assert.ok(view.container.textContent!.includes(screens.translateAppText("Incorrect email or password.")));
  await act(async()=>screens.applyAppLanguage("ha"));
  assert.ok(view.container.textContent!.includes(screens.translateAppText("Incorrect email or password.")));
  assert.ok(screens.translateAccountError("Could not send reset email (auth/network-request-failed). Please try again.").includes("auth/network-request-failed"));
  await view.close();
});

test("settings translates options while preserving device voice names and original Scripture preview",async()=>{
  screens.applyAppLanguage("fr");const view=await mount(screens.SettingsModal);
  await act(async()=>view.container.querySelector<HTMLButtonElement>('[data-testid="button-settings"]')!.click());
  const text=document.body.textContent||"";
  for(const source of ["Settings","Text Size","Small","Medium","Follow device","Audio Voice"])assert.ok(text.includes(screens.translateAppText(source)),source);
  assert.ok(Array.from(document.querySelectorAll("button")).some(button=>button.textContent?.trim()===screens.translateAppText("Close")));
  assert.ok(screens.translateAppText("{count} items",{count:163}).includes("163 articles"));
  assert.ok(text.includes('"For I know the plans I have for you," declares the Lord.'));
  await view.close();
});

test('free voice settings preview the selected language and disable unsupported Yoruba speech',async()=>{
  const utterances:any[]=[];
  const installed=[{name:'English choice',voiceURI:'en-choice',lang:'en-US'},{name:'French Enhanced',voiceURI:'fr-enhanced',lang:'fr-FR'}];
  Object.assign(dom.window,{speechSynthesis:{getVoices:()=>installed,addEventListener(){},removeEventListener(){},cancel(){},resume(){},pause(){},speak:(u:any)=>{utterances.push(u);u.onstart?.();}}});
  (globalThis as any).SpeechSynthesisUtterance=class{constructor(public text:string){}};
  localStorage.setItem('audio-reader-voice','en-choice');
  screens.applyAppLanguage('fr');const view=await mount(screens.SettingsModal);
  try {
    await act(async()=>view.container.querySelector<HTMLButtonElement>('[data-testid="button-settings"]')!.click());
    const language=document.querySelector<HTMLSelectElement>('[data-testid="select-voice-language"]')!;
    const preview=document.querySelector<HTMLButtonElement>('[data-testid="button-preview-voice"]')!;
    assert.equal(language.value,'fr');assert.equal(preview.disabled,false);
    assert.ok(document.querySelector('[data-testid="voice-current-selection"]')?.textContent?.includes('French Enhanced'));
    await act(async()=>preview.click());
    assert.equal(utterances.at(-1).lang,'fr-FR');assert.equal(utterances.at(-1).voice.voiceURI,'fr-enhanced');
    assert.ok(utterances.at(-1).text.includes('Bienvenue'));
    await act(async()=>{language.value='yo';language.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
    assert.equal(preview.disabled,true);assert.ok(document.querySelector('[data-testid="voice-unavailable-message"]'));
    assert.ok(!document.querySelector('[data-testid="voice-current-selection"]'));
    await act(async()=>{language.value='en';language.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
    assert.equal(preview.disabled,false);
    await act(async()=>preview.click());
    assert.equal(utterances.at(-1).voice.voiceURI,'en-choice');
    assert.equal(utterances.at(-1).text,'The Lord is my shepherd, I shall not want.');
    assert.equal(localStorage.getItem('audio-reader-voice'),'en-choice');
  } finally {await view.close();delete (dom.window as any).speechSynthesis;delete (globalThis as any).SpeechSynthesisUtterance;}
});

test("private prayer form preserves message and privacy machine values through a language change",async()=>{
  screens.setUser(null);screens.applyAppLanguage("en");const view=await mount(screens.PrayerCounseling);
  try {
  const textarea=view.container.querySelector("textarea")!;
  await act(async()=>fill(textarea,"Unsent private prayer — do not translate this text."));
  await act(async()=>screens.applyAppLanguage("yo"));
  assert.equal(textarea.value,"Unsent private prayer — do not translate this text.");
  assert.ok(view.container.textContent!.includes(screens.translateAppText("Private — only visible to ministry team")));
  assert.ok(Array.from(view.container.querySelectorAll('select')).some(select=>select.value==='private')); 
  } finally { await view.close(); }
});

test("checkout keeps product, currency, amounts and purchaseKind while translating the chosen offer",async()=>{
  screens.applyAppLanguage("fr");screens.setUser({uid:"fixture-buyer"});const originalFetch=globalThis.fetch;const calls:any[]=[];
  globalThis.fetch=(async(input:any,init?:RequestInit)=>{calls.push({path:String(input),body:init?.body?JSON.parse(String(init.body)):null});return new Response(JSON.stringify(String(input).endsWith("/purchases")?[]:{}),{status:200,headers:{"Content-Type":"application/json"}});}) as typeof fetch;
  const view=await mount(screens.ShopCheckout,{productId:"book-1",price:{ready:true,country:"GB",currency:"GBP",amount:899,audioEditionId:"edition-1",audioAmount:299,readListenAmount:1198}});
  try {
    const radios=view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]');assert.deepEqual(Array.from(radios).map(x=>x.value),["ebook","read-listen"]);
    await act(async()=>radios[1].click());
    await act(async()=>view.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    const button=view.container.querySelector<HTMLButtonElement>('[data-testid="button-shop-buy-book-1"]')||Array.from(view.container.querySelectorAll("button")).find(x=>x.textContent?.includes("11.98"))!;
    assert.ok(button.textContent?.includes("£11.98"));
    await act(async()=>button.click());
    assert.deepEqual(calls.find(x=>x.path.endsWith("/checkout"))?.body,{productId:"book-1",country:"GB",amount:1198,currency:"GBP",acceptedDownloadPolicy:true,purchaseKind:"read-listen"});
  } finally {await view.close();globalThis.fetch=originalFetch;screens.setUser(null);}
});

test("signed-out buyer library is available in Nigerian Pidgin",async()=>{
 screens.applyAppLanguage("pcm");screens.setUser(null);const view=await mount(screens.MyLibrary);
 assert.ok(view.container.textContent!.includes(screens.translateAppText("Sign In or Create Account")));await view.close();
});

after(()=>dom.window.close());
