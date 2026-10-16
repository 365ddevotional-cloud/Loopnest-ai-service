import { useState, useCallback, useEffect, useRef } from "react";

export interface AudioReaderState {
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  currentLabel: string;
  error: string | null;
}

export interface AudioReaderActions {
  play: (text: string, label?: string, options?: { devotional?: boolean }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (rate: number) => void;
}

const VOICE_STORAGE_KEY = "audio-reader-voice";
const VOICE_PRIORITY = ["Enhanced", "Premium", "Google", "Natural", "Samantha", "Daniel", "Karen"];

const DEVOTIONAL_RATE = 0.88;
const DEFAULT_RATE = 0.92;

let globalState: AudioReaderState = {
  isSpeaking: false,
  isPaused: false,
  rate: DEFAULT_RATE,
  currentLabel: "",
  error: null,
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
  if (!voicesLoaded) {
    loadVoices();
  }
  return getEnglishVoices();
}

function getSavedVoiceURI(): string | null {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveVoicePreference(voiceURI: string) {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceURI);
  } catch {}
}

export function clearVoicePreference() {
  try {
    localStorage.removeItem(VOICE_STORAGE_KEY);
  } catch {}
}

function selectBestVoice(): SpeechSynthesisVoice | null {
  const englishVoices = getEnglishVoices();
  if (englishVoices.length === 0) return null;

  const savedURI = getSavedVoiceURI();
  if (savedURI) {
    const saved = englishVoices.find((v) => v.voiceURI === savedURI);
    if (saved) return saved;
  }

  for (const keyword of VOICE_PRIORITY) {
    const match = englishVoices.find(
      (v) => v.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }

  const localVoice = englishVoices.find((v) => v.localService);
  if (localVoice) return localVoice;

  return englishVoices[0];
}

function addPacing(text: string): string {
  let result = text;
  result = result.replace(/\.\s/g, ".   ");
  result = result.replace(/\.\n/g, ".   \n");
  result = result.replace(/,\s/g, ",  ");
  result = result.replace(/;\s/g, ";  ");
  result = result.replace(/:\s/g, ":  ");
  result = result.replace(/\?\s/g, "?   ");
  result = result.replace(/!\s/g, "!   ");
  return result;
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

function splitIntoSegments(text: string): string[] {
  const segments = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (segments.length === 0 && text.trim()) return [text];
  return segments;
}

function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function getEffectiveRate(): number {
  if (globalIsDevotional) {
    return DEVOTIONAL_RATE;
  }
  return globalState.rate;
}

function failSpeech(message: string) {
  ++playbackSession;
  cancelSpeech();
  activeUtterance = null;
  globalState = { ...globalState, isSpeaking: false, isPaused: false, error: message };
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
      utterance.lang = "en-US";
      utterance.rate = getEffectiveRate();
      utterance.pitch = 1;
      utterance.volume = 1;
      const voice = selectBestVoice();
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        if (session !== playbackSession || activeUtterance !== utterance) return;
        activeUtterance = null;
        speakNext(idx + 1);
      };
      utterance.onerror = () => {
        if (session !== playbackSession || activeUtterance !== utterance) return;
        failSpeech("Unable to read aloud on this device. Tap Listen again. If it still fails, try Chrome or Safari and check your device's speech settings.");
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      failSpeech("Unable to start audio. Tap Listen again, or try opening the app in Chrome or Safari.");
    }
  };
  speakNext(startIndex);
}

function doPlay(text: string, label: string, options?: { devotional?: boolean }) {
  // Cancel before creating the next session; late browser events must not advance it.
  doStop();
  if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
    failSpeech("Read aloud is unavailable in this browser. Please open the app in Chrome or Safari and try Listen again.");
    return;
  }
  if (!text.trim()) return;
  globalIsDevotional = options?.devotional ?? false;
  const processedText = globalIsDevotional ? prepareDevotionalText(text) : text;
  globalOriginalText = processedText;
  globalPacedSegments = splitIntoSegments(addPacing(processedText));
  globalCurrentSegment = 0;
  globalState = { ...globalState, isSpeaking: true, isPaused: false, currentLabel: label, error: null };
  notify();
  // Never wait for voices here: mobile browsers require speak() in the tap handler.
  // The default English voice can start while the optional voice list loads.
  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length) voicesLoaded = true;
  speakFromSegment(0);
}

function doStop() {
  ++playbackSession;
  cancelSpeech();
  activeUtterance = null;
  globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "", error: null };
  globalOriginalText = "";
  globalPacedSegments = [];
  globalCurrentSegment = 0;
  globalIsDevotional = false;
  notify();
}

function doPause() {
  if (window.speechSynthesis && globalState.isSpeaking && !globalState.isPaused) {
    window.speechSynthesis.pause();
    globalState = { ...globalState, isPaused: true };
    notify();
  }
}

function doResume() {
  if (window.speechSynthesis && globalState.isPaused) {
    window.speechSynthesis.resume();
    globalState = { ...globalState, isPaused: false };
    notify();
  }
}

function doSetSpeed(rate: number) {
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

  const play = useCallback((text: string, label?: string, options?: { devotional?: boolean }) => {
    doPlay(text, label || "Audio", options);
  }, []);

  const pause = useCallback(() => doPause(), []);
  const resume = useCallback(() => doResume(), []);
  const stop = useCallback(() => doStop(), []);
  const setSpeed = useCallback((rate: number) => doSetSpeed(rate), []);

  return {
    ...globalState,
    play,
    pause,
    resume,
    stop,
    setSpeed,
  };
}

export function stopAudioOnNavigate() {
  if (globalState.isSpeaking || globalState.error) {
    doStop();
  }
}
