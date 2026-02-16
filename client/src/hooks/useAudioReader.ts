import { useState, useCallback, useEffect, useRef } from "react";

export interface AudioReaderState {
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  currentLabel: string;
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
};

let globalOriginalText = "";
let globalPacedSegments: string[] = [];
let globalCurrentSegment = 0;
let globalIsDevotional = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
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
  return new Promise((resolve) => {
    const handler = () => {
      cachedVoices = synth.getVoices();
      voicesLoaded = true;
      synth.removeEventListener("voiceschanged", handler);
      resolve(cachedVoices);
    };
    synth.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      if (!voicesLoaded) {
        cachedVoices = synth.getVoices();
        voicesLoaded = true;
        synth.removeEventListener("voiceschanged", handler);
        resolve(cachedVoices);
      }
    }, 2000);
  });
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

function speakSegment(segment: string, rate: number, onEnd: () => void) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(segment);
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = selectBestVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = onEnd;
  utterance.onerror = (e) => {
    if (e.error !== "canceled" && e.error !== "interrupted") {
      onEnd();
    }
  };

  synth.speak(utterance);
}

function speakFromSegment(startIndex: number) {
  if (startIndex >= globalPacedSegments.length) {
    globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
    globalOriginalText = "";
    globalPacedSegments = [];
    globalCurrentSegment = 0;
    globalIsDevotional = false;
    notify();
    return;
  }

  globalCurrentSegment = startIndex;
  const rate = getEffectiveRate();

  const speakNext = (idx: number) => {
    if (idx >= globalPacedSegments.length || !globalState.isSpeaking) {
      globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
      globalOriginalText = "";
      globalPacedSegments = [];
      globalCurrentSegment = 0;
      globalIsDevotional = false;
      notify();
      return;
    }
    globalCurrentSegment = idx;
    speakSegment(globalPacedSegments[idx], rate, () => {
      speakNext(idx + 1);
    });
  };

  speakNext(startIndex);
}

function doPlay(text: string, label: string, options?: { devotional?: boolean }) {
  const isDevotional = options?.devotional ?? false;
  globalIsDevotional = isDevotional;
  const processedText = isDevotional ? prepareDevotionalText(text) : text;
  const pacedText = addPacing(processedText);

  globalOriginalText = processedText;
  globalPacedSegments = splitIntoSegments(pacedText);
  globalCurrentSegment = 0;
  globalState = { ...globalState, isSpeaking: true, isPaused: false, currentLabel: label };
  notify();

  const startSpeaking = () => {
    cancelSpeech();
    speakFromSegment(0);
  };

  if (!voicesLoaded) {
    loadVoices().then(startSpeaking);
  } else {
    startSpeaking();
  }
}

function doStop() {
  cancelSpeech();
  globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
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
    cancelSpeech();
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
  if (globalState.isSpeaking) {
    doStop();
  }
}
