import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useAudioReader, getAvailableEnglishVoices } from "./useAudioReader";

function reader() {
  let value!: ReturnType<typeof useAudioReader>;
  function Probe() { value = useAudioReader(); return null; }
  renderToString(createElement(Probe));
  return value;
}

const spoken: any[] = [];
const synth = {
  getVoices: () => [],
  addEventListener() {}, removeEventListener() {},
  speak: (utterance: any) => spoken.push(utterance),
  cancel() {}, pause() {}, resume() {},
};
function setup() {
  Object.assign(globalThis, {
    window: { speechSynthesis: synth },
    SpeechSynthesisUtterance: class { constructor(public text: string) {} },
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

test("advances sentences and supports pause, resume and completion", () => {
  setup();
  reader().play("First sentence. Second sentence.");
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
