import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { queryClient } from "@/lib/queryClient";

const LOCAL_DEV_SAVE_KEY = "devotional-saves";
const LOCAL_STREAK_KEY = "devotional-reading-streak";
const NOTE_MAX = 1000;

interface LocalStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

function getTodayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

function computeNewStreak(prior: LocalStreak): LocalStreak {
  const today = getTodayLocal();
  if (prior.lastReadDate === today) return prior;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  const newCurrent = prior.lastReadDate === yesterdayStr ? prior.currentStreak + 1 : 1;
  const newLongest = Math.max(prior.longestStreak, newCurrent);
  return { currentStreak: newCurrent, longestStreak: newLongest, lastReadDate: today };
}

async function authedFetch(path: string, getIdToken: () => Promise<string | null>, options: RequestInit = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
}

export function useDevotionalAccount(devotionalId: number | null) {
  const { user, getIdToken, emailVerified } = useUser();
  const isSignedIn = !!user && emailVerified;

  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [notePending, setNotePending] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);

  const [streak, setStreak] = useState<{ current: number; longest: number; lastReadDate: string | null } | null>(null);

  const readRecorded = useRef(false);

  // Load saved status
  useEffect(() => {
    if (!devotionalId) return;
    if (isSignedIn) {
      authedFetch(`/api/user/devotional/saved/${devotionalId}/status`, getIdToken)
        .then(r => r.json())
        .then(data => setIsSaved(!!data?.saved))
        .catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem(LOCAL_DEV_SAVE_KEY);
        const ids: number[] = raw ? JSON.parse(raw) : [];
        setIsSaved(ids.includes(devotionalId));
      } catch {
        setIsSaved(false);
      }
    }
  }, [devotionalId, isSignedIn, getIdToken]);

  // Load note (signed-in only)
  useEffect(() => {
    if (!devotionalId || !isSignedIn) { setNoteLoaded(true); return; }
    authedFetch(`/api/user/devotional/note/${devotionalId}`, getIdToken)
      .then(r => r.json())
      .then(data => { setNoteText(data?.noteText ?? ""); setNoteLoaded(true); })
      .catch(() => setNoteLoaded(true));
  }, [devotionalId, isSignedIn, getIdToken]);

  // Load streak (signed-in: from DB; guest: from localStorage)
  useEffect(() => {
    if (isSignedIn) {
      authedFetch("/api/user/devotional/streak", getIdToken)
        .then(r => r.json())
        .then(data => setStreak({ current: data?.currentStreak ?? 0, longest: data?.longestStreak ?? 0, lastReadDate: data?.lastReadDate ?? null }))
        .catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem(LOCAL_STREAK_KEY);
        const local: LocalStreak = raw ? JSON.parse(raw) : { currentStreak: 0, longestStreak: 0, lastReadDate: null };
        setStreak({ current: local.currentStreak, longest: local.longestStreak, lastReadDate: local.lastReadDate });
      } catch {
        setStreak({ current: 0, longest: 0, lastReadDate: null });
      }
    }
  }, [isSignedIn, getIdToken]);

  // Record read on mount (once)
  const recordRead = useCallback(async () => {
    if (readRecorded.current || !devotionalId) return;
    readRecorded.current = true;

    const today = getTodayLocal();

    if (isSignedIn) {
      try {
        await authedFetch("/api/user/devotional/history", getIdToken, {
          method: "POST",
          body: JSON.stringify({ devotionalId }),
        });
        // Compute and sync streak
        const streakRes = await authedFetch("/api/user/devotional/streak", getIdToken);
        const existing: { currentStreak: number; longestStreak: number; lastReadDate: string | null } = await streakRes.json();
        const prior: LocalStreak = { currentStreak: existing.currentStreak ?? 0, longestStreak: existing.longestStreak ?? 0, lastReadDate: existing.lastReadDate ?? null };
        const updated = computeNewStreak(prior);
        if (updated.lastReadDate !== prior.lastReadDate) {
          await authedFetch("/api/user/devotional/streak", getIdToken, {
            method: "PUT",
            body: JSON.stringify({ currentStreak: updated.currentStreak, longestStreak: updated.longestStreak, lastReadDate: updated.lastReadDate }),
          });
          setStreak({ current: updated.currentStreak, longest: updated.longestStreak, lastReadDate: updated.lastReadDate });
          queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/streak"] });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/history"] });
      } catch {
        // non-critical, silently ignore
      }
    } else {
      // Guest: update local streak only
      try {
        const raw = localStorage.getItem(LOCAL_STREAK_KEY);
        const local: LocalStreak = raw ? JSON.parse(raw) : { currentStreak: 0, longestStreak: 0, lastReadDate: null };
        const updated = computeNewStreak(local);
        localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(updated));
        setStreak({ current: updated.currentStreak, longest: updated.longestStreak, lastReadDate: today });
      } catch {
        // ignore
      }
    }
  }, [devotionalId, isSignedIn, getIdToken]);

  const toggleSave = useCallback(async () => {
    if (!devotionalId || savePending) return;
    setSavePending(true);
    const next = !isSaved;
    setIsSaved(next);

    if (isSignedIn) {
      try {
        if (next) {
          await authedFetch("/api/user/devotional/saved", getIdToken, {
            method: "POST",
            body: JSON.stringify({ devotionalId }),
          });
        } else {
          await authedFetch(`/api/user/devotional/saved/${devotionalId}`, getIdToken, { method: "DELETE" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] });
      } catch {
        setIsSaved(!next); // revert
      }
    } else {
      // Guest: use localStorage
      try {
        const raw = localStorage.getItem(LOCAL_DEV_SAVE_KEY);
        const ids: number[] = raw ? JSON.parse(raw) : [];
        const updated = next ? Array.from(new Set([...ids, devotionalId])) : ids.filter(id => id !== devotionalId);
        localStorage.setItem(LOCAL_DEV_SAVE_KEY, JSON.stringify(updated));
      } catch {
        setIsSaved(!next);
      }
    }
    setSavePending(false);
  }, [devotionalId, isSaved, savePending, isSignedIn, getIdToken]);

  const saveNote = useCallback(async (text: string) => {
    if (!devotionalId || !isSignedIn || notePending) return;
    const trimmed = text.trim().slice(0, NOTE_MAX);
    if (!trimmed) return;
    setNotePending(true);
    try {
      await authedFetch(`/api/user/devotional/note/${devotionalId}`, getIdToken, {
        method: "PUT",
        body: JSON.stringify({ noteText: trimmed }),
      });
      setNoteText(trimmed);
    } catch {
      // ignore
    } finally {
      setNotePending(false);
    }
  }, [devotionalId, isSignedIn, getIdToken, notePending]);

  const deleteNote = useCallback(async () => {
    if (!devotionalId || !isSignedIn || notePending) return;
    setNotePending(true);
    try {
      await authedFetch(`/api/user/devotional/note/${devotionalId}`, getIdToken, { method: "DELETE" });
      setNoteText("");
    } catch {
      // ignore
    } finally {
      setNotePending(false);
    }
  }, [devotionalId, isSignedIn, getIdToken, notePending]);

  return {
    isSignedIn,
    isSaved,
    savePending,
    toggleSave,
    noteText,
    setNoteText,
    notePending,
    noteLoaded,
    saveNote,
    deleteNote,
    streak,
    recordRead,
    NOTE_MAX,
  };
}
