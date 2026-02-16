import { useState, useCallback, useEffect, useRef } from "react";

export interface AudioReaderState {
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  currentLabel: string;
}

export interface AudioReaderActions {
  play: (text: string, label?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (rate: number) => void;
}

let globalState: AudioReaderState = {
  isSpeaking: false,
  isPaused: false,
  rate: 1,
  currentLabel: "",
};

let globalText = "";
let globalCharOffset = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function speakText(text: string, rate: number, onEnd: () => void, onBoundary?: (charIndex: number) => void) {
  cancelSpeech();
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = synth.getVoices();
  const englishVoice = voices.find(
    (v) => v.lang.startsWith("en") && v.localService
  );
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.onend = onEnd;
  utterance.onerror = (e) => {
    if (e.error !== "canceled" && e.error !== "interrupted") {
      onEnd();
    }
  };
  if (onBoundary) {
    utterance.onboundary = (e) => onBoundary(e.charIndex);
  }

  synth.speak(utterance);
}

function doPlay(text: string, label: string) {
  globalText = text;
  globalCharOffset = 0;
  globalState = { ...globalState, isSpeaking: true, isPaused: false, currentLabel: label };
  notify();

  speakText(
    text,
    globalState.rate,
    () => {
      globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
      globalText = "";
      globalCharOffset = 0;
      notify();
    },
    (charIndex) => {
      globalCharOffset = charIndex;
    }
  );
}

function doStop() {
  cancelSpeech();
  globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
  globalText = "";
  globalCharOffset = 0;
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

  if (globalState.isSpeaking && globalText) {
    const remaining = globalText.substring(globalCharOffset);
    if (remaining.trim()) {
      cancelSpeech();
      globalState = { ...globalState, isPaused: false };
      notify();

      speakText(
        remaining,
        rate,
        () => {
          globalState = { ...globalState, isSpeaking: false, isPaused: false, currentLabel: "" };
          globalText = "";
          globalCharOffset = 0;
          notify();
        }
      );
    }
  }
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
    return () => {
      // Don't stop on unmount — the mini player keeps it alive
    };
  }, []);

  const play = useCallback((text: string, label?: string) => {
    doPlay(text, label || "Audio");
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
