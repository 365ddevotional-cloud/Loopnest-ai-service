import { useState, useEffect, useRef } from "react";

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustCameOnline(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustCameOnline(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustCameOnline(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isOnline, justCameOnline };
}
