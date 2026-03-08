import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PromiseCard3D, { getRandomThemeIndex } from "./PromiseCard3D";
import { sharePromiseAsImage } from "@/share/sharePromise";

const STORAGE_KEY = "promise-popup-state";
const MORNING_HOUR = 8;
const AFTERNOON_HOUR = 17;

interface PopupState {
  date: string;
  morningShown: boolean;
  afternoonShown: boolean;
}

function getState(): PopupState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = new Date().toDateString();
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return { date: new Date().toDateString(), morningShown: false, afternoonShown: false };
}

function saveState(state: PopupState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function PromisePopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: promiseData } = useQuery<{
    promise: { id: number; heading: string; text: string; reference: string };
    index: number;
    isEnabled: boolean;
  }>({
    queryKey: ["/api/promise/current"],
    refetchInterval: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!promiseData || !promiseData.isEnabled || dismissed) return;

    const now = new Date();
    const hour = now.getHours();
    const state = getState();

    let shouldShow = false;

    if (hour >= MORNING_HOUR && hour < AFTERNOON_HOUR && !state.morningShown) {
      shouldShow = true;
      state.morningShown = true;
    } else if (hour >= AFTERNOON_HOUR && !state.afternoonShown) {
      shouldShow = true;
      state.afternoonShown = true;
    }

    if (shouldShow) {
      saveState(state);
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [promiseData, dismissed]);

  if (!visible || !promiseData) return null;

  const { promise, index } = promiseData;

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <div
      data-testid="promise-popup-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <PromiseCard3D
          heading={promise.heading}
          scripture={promise.text}
          reference={promise.reference}
          promiseId={promise.id}
          themeIndex={getRandomThemeIndex(promise.id)}
          onShare={() => sharePromiseAsImage(promise.heading, promise.text, promise.reference, getRandomThemeIndex(promise.id))}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
