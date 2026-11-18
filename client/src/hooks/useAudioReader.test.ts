import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useAudioReader, getAvailableEnglishVoices, splitIntoSegments } from "./useAudioReader";

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
