import { useState, useCallback, useEffect, useRef } from "react";

export interface AudioReaderState {
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  currentLabel: string;
  error: string | null;
  errorCode: 'voice-unavailable' | 'start-timeout' | null;
  language: string;
}

export interface AudioReaderOptions { devotional?: boolean; language?: string; useDefaultVoice?: boolean; onStarted?: () => void; }

export interface AudioReaderActions {
  play: (text: string, label?: string, options?: AudioReaderOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (rate: number) => void;
  retryDefaultVoice: () => void;
}

const VOICE_STORAGE_KEY = "audio-reader-voice";
const VOICE_PRIORITY = ["Natural", "Premium", "Enhanced", "Neural", "Samantha", "Daniel", "Karen"];

const DEVOTIONAL_RATE = 0.88;
const DEFAULT_RATE = 0.92;
let customSpeed = false;

let globalState: AudioReaderState = {
  isSpeaking: false,
  isPaused: false,
  rate: DEFAULT_RATE,
  currentLabel: "",
  error: null,
  errorCode: null,
  language: 'en-US',
};

let globalOriginalText = "";
let globalPacedSegments: string[] = [];
let globalCurrentSegment = 0;
let globalIsDevotional = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let voiceLoad: Promise<SpeechSynthesisVoice[]> | null = null;
let playbackSession = 0;
// Keep the current utterance alive until its callbacks complete.
let activeUtterance: SpeechSynthesisUtterance | null = null;
let startTimer: ReturnType<typeof setTimeout> | null = null;
let activeStarted = false;
let pendingStart: (()=>void) | undefined;
let globalLanguage = 'en-US';
let useDefaultVoice = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    voicesLoaded = true;
    return Promise.resolve(voices);
  }
  if (voiceLoad) return voiceLoad;
  voiceLoad = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cachedVoices = synth.getVoices();
      voicesLoaded = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(cachedVoices);
    };
    const timer = setTimeout(finish, 2000);
    synth.addEventListener("voiceschanged", finish);
  }).finally(() => { voiceLoad = null; });
  return voiceLoad;
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  return cachedVoices.filter((v) => v.lang.startsWith("en"));
}

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  return getAvailableReaderVoices('en');
}

function voicePreferenceKey(language = 'en') {
  const base=speechLanguage(language).split('-')[0];
  return base==='en'?VOICE_STORAGE_KEY:`${VOICE_STORAGE_KEY}:${base}`;
}
export function getSavedVoicePreference(language = 'en'): string | null {
  try {
    return localStorage.getItem(voicePreferenceKey(language));
  } catch {
    return null;
  }
}

export function saveVoicePreference(voiceURI: string, language = 'en') {
  try {
    localStorage.setItem(voicePreferenceKey(language), voiceURI);
  } catch {}
}

export function clearVoicePreference(language = 'en') {
  try {
    localStorage.removeItem(voicePreferenceKey(language));
  } catch {}
}

export function getPreferredEnglishVoice(): SpeechSynthesisVoice | null {
  return getPreferredReaderVoice('en');
}

function chooseVoice(englishVoices: SpeechSynthesisVoice[], language = 'en'): SpeechSynthesisVoice | null {
  if (englishVoices.length === 0) return null;

  const savedURI = getSavedVoicePreference(language);
  if (savedURI) {
    const saved = englishVoices.find((v) => v.voiceURI === savedURI);
    if (saved) return saved;
  }

  // Prefer the device's working default/local voice before optional network voices.
  const defaultVoice = englishVoices.find((v) => v.default);
  if (defaultVoice) return defaultVoice;
  const localVoice = englishVoices.find((v) => v.localService);
  if (localVoice) return localVoice;

  for (const keyword of VOICE_PRIORITY) {
    const match = englishVoices.find(
      (v) => v.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }

  return englishVoices[0];
}

const speechLanguages: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', yo: 'yo-NG', ha: 'ha-NG', pcm: 'pcm-NG', ig: 'ig-NG' };
function speechLanguage(language = 'en') {
  const base = language.toLowerCase().replace('_', '-').split('-')[0];
  return Object.hasOwn(speechLanguages, base) ? speechLanguages[base] : 'en-US';
}
function voicesForLanguage(language: string) {
  const base = language.split('-')[0];
  const matches = cachedVoices.filter(v => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base);
  // Pidgin can use a Nigerian English voice when no dedicated Pidgin voice exists.
  if (!matches.length && base === 'pcm') {
    const nigerian = cachedVoices.filter(v => /^en[-_]NG$/i.test(v.lang));
    return nigerian.length ? nigerian : getEnglishVoices();
  }
  return matches;
}
export function getAvailableReaderVoices(language = 'en'): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      cachedVoices=window.speechSynthesis.getVoices();
      if(!cachedVoices.length) void loadVoices().catch(()=>{});
    } catch { cachedVoices=[]; }
  } else cachedVoices=[];
  return voicesForLanguage(speechLanguage(language));
}
export function getPreferredReaderVoice(language = 'en'): SpeechSynthesisVoice | null {
  return chooseVoice(getAvailableReaderVoices(language),language);
}
function preferredVoice(language: string) {
  return chooseVoice(voicesForLanguage(language),language);
}

function prepareDevotionalText(text: string): string {
  return text
    .replace(/Title:\s*/g, "Title.   ")
    .replace(/Scripture:\s*/g, "Scripture.   ")
    .replace(/Prayer Points:\s*/g, "Prayer Points.   ")
    .replace(/Faith Declaration:\s*/g, "Faith Declaration.   ")
    .replace(/Christian Quotes:\s*/g, "Christian Quotes.   ")
    .replace(/Prophetic Declaration:\s*/g, "Prophetic Declaration.   ");
}

export function splitIntoSegments(text: string): string[] {
  // Small connected passages avoid resetting intonation at every sentence,
  // while bounded chunks keep long readings usable on mobile speech engines.
  const segments: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let chunk = "";
    for (const word of words) {
      if (chunk && chunk.length + word.length + 1 > 340) {
        segments.push(chunk); chunk = "";
      }
      chunk = chunk ? `${chunk} ${word}` : word;
    }
    if (chunk) segments.push(chunk);
  }
  return segments;
}

function cancelSpeech() {
  clearStartTimer();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function clearStartTimer() {
  if (startTimer !== null) clearTimeout(startTimer);
  startTimer = null;
}
function watchSpeechStart(utterance: SpeechSynthesisUtterance, session: number) {
  clearStartTimer();
  startTimer = setTimeout(() => {
    startTimer = null;
    if (session === playbackSession && activeUtterance === utterance && !activeStarted && !globalState.isPaused) {
      failSpeech('Audio did not start. Check your media volume and silent mode, then tap Listen again.', 'start-timeout');
    }
  }, 8000);
}

function getEffectiveRate(): number {
  if (globalIsDevotional && !customSpeed) {
    return DEVOTIONAL_RATE;
  }
  return globalState.rate;
}

function failSpeech(message: string, errorCode: AudioReaderState['errorCode'] = null) {
  ++playbackSession;
  cancelSpeech();
  activeUtterance = null;
  globalState = { ...globalState, isSpeaking: false, isPaused: false, error: message, errorCode };
  notify();
}

function speakFromSegment(startIndex: number, session = playbackSession) {
  const speakNext = (idx: number) => {
    if (session !== playbackSession || !globalState.isSpeaking) return;
    if (idx >= globalPacedSegments.length) {
      doStop();
      return;
    }
    globalCurrentSegment = idx;
    try {
      const utterance = new SpeechSynthesisUtterance(globalPacedSegments[idx]);
      activeUtterance = utterance;
      activeStarted = false;
      utterance.lang = globalLanguage;
      utterance.rate = getEffectiveRate();
      utterance.pitch = 1;
      utterance.volume = 1;
      const voice = useDefaultVoice ? null : preferredVoice(globalLanguage);
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
      utterance.onstart = () => {
        if (session !== playbackSession || activeUtterance !== utterance) return;
        activeStarted = true; clearStartTimer();
        const started = pendingStart;
        pendingStart = undefined;
        started?.();
      };
      utterance.onend = () => {
        if (session !== playbackSession || activeUtterance !== utterance) return;
        clearStartTimer(); activeUtterance = null;
        speakNext(idx + 1);
      };
      utterance.onerror = (event) => {
        if (session !== playbackSession || activeUtterance !== utterance) return;
        if (event.error === 'language-unavailable' || event.error === 'voice-unavailable') {
          failSpeech(`This device has no usable voice for ${globalLanguage}. Try an installed voice or the English original.`, 'voice-unavailable');
          return;
        }
        failSpeech("Unable to read aloud on this device. Tap Listen again. If it still fails, try Chrome or Safari and check your device's speech settings.");
      };
      // Leave an idle engine alone. Only resume an actually paused queue.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      watchSpeechStart(utterance, session);
      window.speechSynthesis.speak(utterance);
    } catch {
      failSpeech("Unable to start audio. Tap Listen again, or try opening the app in Chrome or Safari.");
    }
  };
  speakNext(startIndex);
}

function doPlay(text: string, label: string, options?: AudioReaderOptions) {
  // Cancel before creating the next session; late browser events must not advance it.
  doStop();
  if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
    failSpeech("Read aloud is unavailable in this browser. Please open the app in Chrome or Safari and try Listen again.");
    return;
  }
  if (!text.trim()) return;
  pendingStart = options?.onStarted;
  globalLanguage = speechLanguage(options?.language);
  useDefaultVoice = options?.useDefaultVoice ?? false;
  globalIsDevotional = options?.devotional ?? false;
  const processedText = globalIsDevotional ? prepareDevotionalText(text) : text;
  globalOriginalText = processedText;
  globalPacedSegments = splitIntoSegments(processedText);
  globalCurrentSegment = 0;
  globalState = { ...globalState, isSpeaking: true, isPaused: false, currentLabel: label, error: null, errorCode: null, language: globalLanguage };
  notify();
  // Never wait for voices here: mobile browsers require speak() in the tap handler.
  // The default English voice can start while the optional voice list loads.
  try { cachedVoices = window.speechSynthesis.getVoices(); }
  catch { cachedVoices = []; } // Voice discovery must not prevent default speech.
  if (cachedVoices.length) voicesLoaded = true;
  if (!useDefaultVoice && globalLanguage !== 'en-US' && cachedVoices.length && !preferredVoice(globalLanguage)) {
    failSpeech(`This device has no usable voice for ${globalLanguage}. Try an installed voice or the English original.`, 'voice-unavailable');
    return;
  }
  speakFromSegment(0);
}

function doStop() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const needsCancel = activeUtterance !== null || synth?.speaking || synth?.pending || synth?.paused;
  ++playbackSession;
  clearStartTimer();
  if (needsCancel) cancelSpeech();
  activeUtterance = null;
  globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "", error: null, errorCode: null };
  globalOriginalText = "";
  globalPacedSegments = [];
  globalCurrentSegment = 0;
  globalIsDevotional = false;
  notify();
}

function doPause() {
  if (window.speechSynthesis && globalState.isSpeaking && !globalState.isPaused) {
    window.speechSynthesis.pause();
    clearStartTimer();
    globalState = { ...globalState, isPaused: true };
    notify();
  }
}

function doResume() {
  if (window.speechSynthesis && globalState.isPaused) {
    window.speechSynthesis.resume();
    globalState = { ...globalState, isPaused: false };
    if (activeUtterance && !activeStarted) watchSpeechStart(activeUtterance, playbackSession);
    notify();
  }
}

function doSetSpeed(rate: number) {
  if (!Number.isFinite(rate)) return;
  rate = Math.min(2, Math.max(0.5, rate));
  customSpeed = true;
  globalState = { ...globalState, rate };
  notify();

  if (globalState.isSpeaking && globalPacedSegments.length > 0) {
    ++playbackSession;
    cancelSpeech();
    activeUtterance = null;
    globalState = { ...globalState, isPaused: false };
    notify();
    speakFromSegment(globalCurrentSegment);
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
}

export function useAudioReader(): AudioReaderState & AudioReaderActions {
  const [, forceUpdate] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const listener = () => {
      if (mountedRef.current) {
        forceUpdate((n) => n + 1);
      }
    };
    listeners.add(listener);
    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    return () => {};
  }, []);

  const play = useCallback((text: string, label?: string, options?: AudioReaderOptions) => {
    doPlay(text, label || "Audio", options);
  }, []);

  const pause = useCallback(() => doPause(), []);
  const resume = useCallback(() => doResume(), []);
  const stop = useCallback(() => doStop(), []);
  const setSpeed = useCallback((rate: number) => doSetSpeed(rate), []);
  const retryDefaultVoice = useCallback(() => {
    if (!globalOriginalText) return;
    doPlay(globalOriginalText, globalState.currentLabel, {
      devotional: globalIsDevotional, language: globalLanguage, useDefaultVoice: true, onStarted: pendingStart,
    });
  }, []);

  return {
    ...globalState,
    play,
    pause,
    resume,
    stop,
    setSpeed,
    retryDefaultVoice,
  };
}

export function stopAudioOnNavigate() {
  if (globalState.isSpeaking || globalState.error) {
    doStop();
  }
}

