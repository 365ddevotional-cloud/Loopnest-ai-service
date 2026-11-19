import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useAudioReader, getAvailableEnglishVoices, splitIntoSegments, getAvailableReaderVoices, getPreferredReaderVoice, saveVoicePreference, clearVoicePreference } from "./useAudioReader";

function reader() {
  let value!: ReturnType<typeof useAudioReader>;
  function Probe() { value = useAudioReader(); return null; }
  renderToString(createElement(Probe));
  return value;
}

const spoken: any[] = [];
let availableVoices: SpeechSynthesisVoice[] = [];
const synth = {
  getVoices: () => availableVoices,
  addEventListener() {}, removeEventListener() {},
  speak: (utterance: any) => spoken.push(utterance),
  cancel() {}, pause() {}, resume() {},
};
function setup() {
  availableVoices = [];
  Object.assign(globalThis, {
    window: { speechSynthesis: synth },
    SpeechSynthesisUtterance: class { constructor(public text: string) {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  reader().stop();
  spoken.length = 0;
}

test("starts on the user's click even while voices are unavailable", () => {
  setup();
  getAvailableEnglishVoices(); // The settings/startup preload may already be pending.
  reader().play("First sentence. Second sentence.");
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, "en-US");
  reader().stop();
});

test("ignores callbacks from stopped or replaced readings", () => {
  setup();
  reader().play("Old sentence. Old ending.");
  const old = spoken[0];
  assert.ok(old);
  reader().play("New sentence. New ending.");
  old.onend();
  assert.equal(spoken.length, 2);
  assert.equal(reader().isSpeaking, true);
  reader().stop();
  spoken[1].onend();
  assert.equal(spoken.length, 2);
  assert.equal(reader().isSpeaking, false);
});

test("speech errors stop reading and explain how to retry", () => {
  setup();
  reader().play("First sentence. Second sentence.");
  assert.ok(spoken[0]);
  spoken[0].onerror({ error: "synthesis-unavailable" });
  assert.equal(reader().isSpeaking, false);
  assert.match(reader().error || "", /Listen.*again/);
  assert.equal(spoken.length, 1);
  reader().stop();
  assert.equal(reader().error, null);
});

test("unsupported devices show a useful message instead of crashing", () => {
  setup();
  (globalThis as any).window = {};
  assert.doesNotThrow(() => reader().play("Read this."));
  assert.equal(reader().isSpeaking, false);
  assert.match(reader().error || "", /browser/);
});

test("advances paragraphs and supports pause, resume and completion", () => {
  setup();
  reader().play("First sentence.\n\nSecond sentence.");
  reader().pause();
  assert.equal(reader().isPaused, true);
  reader().resume();
  assert.equal(reader().isPaused, false);
  assert.ok(spoken[0]);
  spoken[0].onend();
  assert.equal(spoken.length, 2);
  spoken[1].onend();
  assert.equal(reader().isSpeaking, false);
});

test("connected sentences share an utterance without losing long passage text", () => {
  assert.deepEqual(splitIntoSegments("First sentence. Second sentence."), ["First sentence. Second sentence."]);
  const text = Array.from({length:200},(_,i)=>`Word${i}.`).join(" ");
  const chunks = splitIntoSegments(text);
  assert.equal(chunks.join(" "),text);
  assert.ok(chunks.every(c=>c.length<=340));
});

test("prefers an available natural voice and preserves its language", () => {
  setup();
  availableVoices = [
    {name:"Google US English",voiceURI:"google",lang:"en-US"},
    {name:"Microsoft Sonia Online (Natural)",voiceURI:"natural",lang:"en-GB"},
  ] as SpeechSynthesisVoice[];
  reader().play("A connected reading. With a natural voice.");
  assert.equal(spoken[0].voice.voiceURI,"natural");
  assert.equal(spoken[0].lang,"en-GB");
  reader().stop();
});

test("a reader's saved voice and chosen devotional speed take precedence", () => {
  setup();
  availableVoices = [{name:"Natural voice",voiceURI:"natural",lang:"en-US"},{name:"My saved voice",voiceURI:"saved",lang:"en-AU"}] as SpeechSynthesisVoice[];
  (globalThis as any).localStorage.getItem=()=>"saved";
  reader().setSpeed(1.15);
  reader().play("A devotional reading.","Today's devotional",{devotional:true});
  assert.equal(spoken[0].voice.voiceURI,"saved");
  assert.equal(spoken[0].rate,1.15);
  reader().stop();
});

test('translated readings choose their own language rather than a saved English voice', () => {
  setup();
  availableVoices = [{name:'English',voiceURI:'saved',lang:'en-US'},{name:'Yoruba',voiceURI:'yoruba',lang:'yo-NG'},{name:'Hausa',voiceURI:'hausa',lang:'ha-NG'}] as SpeechSynthesisVoice[];
  (globalThis as any).localStorage.getItem=()=> 'saved';
  reader().play('Jésù ni ìmọ́lẹ̀ ayé.', 'Yoruba', {language:'yo'});
  assert.equal(spoken[0].voice.voiceURI, 'yoruba'); assert.equal(spoken[0].lang, 'yo-NG');
  reader().play('Yesu ne hasken duniya.', 'Hausa', {language:'ha'});
  assert.equal(spoken[1].voice.voiceURI, 'hausa'); assert.equal(spoken[1].lang, 'ha-NG');
  reader().stop();
});

test('a missing translated voice produces a visible failure and English can be started explicitly', () => {
  setup(); availableVoices=[{name:'English',voiceURI:'english',lang:'en-US'}] as SpeechSynthesisVoice[];
  reader().play('Jésù ni ìmọ́lẹ̀ ayé.', 'Yoruba', {language:'yo'});
  assert.equal(spoken.length, 0); assert.equal(reader().isSpeaking, false);
  assert.equal(reader().errorCode, 'voice-unavailable'); assert.equal(reader().language, 'yo-NG');
  reader().play('Jesus is the light of the world.', 'English original', {language:'en'});
  assert.equal(spoken.length, 1); assert.equal(spoken[0].voice.voiceURI, 'english');
  assert.equal(reader().error, null); reader().stop();
});

test('an asynchronously loaded voice list does not replace the requested language with English', () => {
  setup(); reader().play('Haske mai ɗaukaka.', 'Hausa', {language:'ha'});
  assert.equal(spoken.length,1); assert.equal(spoken[0].lang,'ha-NG');
  spoken[0].onerror({error:'language-unavailable'});
  assert.equal(reader().errorCode,'voice-unavailable'); reader().stop();
});

test('Pidgin prefers a Nigerian English voice when no dedicated Pidgin voice is installed', () => {
  setup(); availableVoices=[{name:'English US',voiceURI:'us',lang:'en-US'},{name:'Nigerian English',voiceURI:'ng',lang:'en-NG'}] as SpeechSynthesisVoice[];
  reader().play('Jesus na the light of the world.', 'Pidgin', {language:'pcm'});
  assert.equal(spoken[0].voice.voiceURI,'ng'); reader().stop();
});

test('free voice preferences are independent by language and retain the existing English preference',()=>{
  setup();const preferences=new Map<string,string>([['audio-reader-voice','english']]);
  Object.assign(globalThis.localStorage,{getItem:(key:string)=>preferences.get(key)??null,setItem:(key:string,value:string)=>preferences.set(key,value),removeItem:(key:string)=>preferences.delete(key)});
  availableVoices=[{name:'English saved',voiceURI:'english',lang:'en-US'},{name:'French natural',voiceURI:'fr-natural',lang:'fr-FR'},{name:'French choice',voiceURI:'fr-choice',lang:'fr-CA'},{name:'Yoruba',voiceURI:'yo',lang:'yo-NG'}] as SpeechSynthesisVoice[];
  saveVoicePreference('fr-choice','fr');saveVoicePreference('yo','yo');
  assert.equal(getPreferredReaderVoice('fr')?.voiceURI,'fr-choice');
  assert.equal(getPreferredReaderVoice('en')?.voiceURI,'english');
  assert.equal(getPreferredReaderVoice('yo')?.voiceURI,'yo');
  reader().play('Bonjour.','French',{language:'fr'});assert.equal(spoken.at(-1).voice.voiceURI,'fr-choice');reader().stop();
  clearVoicePreference('fr');assert.equal(getPreferredReaderVoice('fr')?.voiceURI,'fr-natural');
  assert.equal(getPreferredReaderVoice('en')?.voiceURI,'english');
  assert.equal(getPreferredReaderVoice('yo')?.voiceURI,'yo');
});
test('voice discovery refreshes installed voices and never offers English as Yoruba',()=>{
  setup();availableVoices=[{name:'English',voiceURI:'en',lang:'en-US'}] as SpeechSynthesisVoice[];
  assert.deepEqual(getAvailableReaderVoices('yo'),[]);
  availableVoices.push({name:'Yoruba Enhanced',voiceURI:'yo',lang:'yo-NG'} as SpeechSynthesisVoice);
  assert.equal(getAvailableReaderVoices('yo')[0].voiceURI,'yo');
  assert.equal(getPreferredReaderVoice('yo')?.voiceURI,'yo');
});

test('resume clears a paused speech queue before a new utterance is queued', () => {
  setup(); let paused=true; const resume=synth.resume; const speak=synth.speak;
  synth.resume=()=> {paused=false;};
  synth.speak=(utterance)=> {assert.equal(paused,false); spoken.push(utterance);};
  try {reader().play('Start inside this tap.');assert.equal(spoken.length,1);}
  finally {reader().stop(); synth.resume=resume; synth.speak=speak;}
});

test('a speech engine that never starts cannot leave a false playing indicator forever', context => {
  setup(); context.mock.timers.enable({apis:['setTimeout']});
  try {
    reader().play('This engine stays silent.');
    context.mock.timers.tick(8001);
    assert.equal(reader().isSpeaking,false);assert.equal(reader().errorCode,'start-timeout');
    reader().play('This reading actually starts.');spoken[1].onstart();
    context.mock.timers.tick(8001);
    assert.equal(reader().isSpeaking,true);assert.equal(reader().error,null);
  } finally {reader().stop();context.mock.timers.reset();}
});
