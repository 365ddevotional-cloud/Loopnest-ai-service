import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";
import type { Song } from "@shared/schema";

const LOCAL_HISTORY_KEY = "spirittone-playback-history";
const LOCAL_SETTINGS_KEY = "spirittone-music-settings";
const LOCAL_VOLUME_KEY = "spirittone-volume";
const HISTORY_LIMIT = 20;

export interface MusicSettings {
  autoplayNext: boolean;
  rememberPosition: boolean;
  defaultSpeed: number;
  /** "none"=Normal, "one"=Repeat One, "play-all"=Play All, "all"=Repeat All */
  repeatMode: "none" | "one" | "play-all" | "all";
  shuffle: boolean;
}

export interface RecentlyPlayedEntry {
  songId: number;
  title: string;
  slug: string;
  artist: string;
  labelName: string;
  coverImageUrl: string | null;
  lastPosition: number;
  duration: number;
  progressPercent: number;
  lastPlayedAt: string;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MusicPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  settings: MusicSettings;
  recentlyPlayed: RecentlyPlayedEntry[];
  recommendations: Song[];
  nextSong: Song | null;
  continueListening: RecentlyPlayedEntry[];
  // Queue (Phase 1)
  activeQueue: Song[];
  queueIndex: number;
  setQueue: (songs: Song[], startAt?: number) => void;
  clearQueue: () => void;
  // Exposed audio element (Phase 3 – visualizer)
  audioElement: HTMLAudioElement | null;
  /** True when the user chose "hide player, keep playing" — mini-player bar is not visible. */
  miniPlayerDismissed: boolean;
  setMiniPlayerDismissed: (dismissed: boolean) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  closePlayer: () => void;
  playNext: () => void;
  playPrev: () => void;
  updateSettings: (partial: Partial<MusicSettings>) => void;
}

const DEFAULT_SETTINGS: MusicSettings = {
  autoplayNext: false,
  rememberPosition: true,
  defaultSpeed: 1,
  repeatMode: "none",
  shuffle: false,
};

function readLocal<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

function scoreRecommendations(allSongs: Song[], current: Song, recentIds: Set<number>, favIds: Set<number>): Song[] {
  const currentBook = current.scriptureReference?.split(/[\s,:]/)[0] ?? "";
  return allSongs
    .filter(s => s.id !== current.id && s.isActive && s.audioUrl)
    .map(s => {
      let score = 0;
      if (favIds.has(s.id)) score += 3;
      if (recentIds.has(s.id)) score += 2;
      if (s.genre && s.genre === current.genre) score += 3;
      if (s.producer && s.producer === current.producer) score += 2;
      if (s.artist && s.artist === current.artist) score += 2;
      const book = s.scriptureReference?.split(/[\s,:]/)[0] ?? "";
      if (book && book === currentBook) score += 1;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score || Math.random() - 0.5)
    .slice(0, 5)
    .map(x => x.s);
}

const MusicPlayerContext = createContext<MusicPlayerContextType>({
  currentSong: null, isPlaying: false, currentTime: 0, duration: 0, volume: 1,
  playbackRate: 1, isLoading: false, settings: DEFAULT_SETTINGS,
  recentlyPlayed: [], recommendations: [], nextSong: null, continueListening: [],
  activeQueue: [], queueIndex: -1, audioElement: null,
  miniPlayerDismissed: false, setMiniPlayerDismissed: () => {},
  setQueue: () => {}, clearQueue: () => {},
  playSong: () => {}, togglePlay: () => {}, seek: () => {}, setVolume: () => {},
  setPlaybackRate: () => {}, closePlayer: () => {}, playNext: () => {}, playPrev: () => {}, updateSettings: () => {},
});

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { user, emailVerified, getIdToken } = useUser();
  const isSignedIn = !!user && emailVerified;

  const audioRef = useRef<HTMLAudioElement>(() => {
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  return audio;
})());
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = parseFloat(localStorage.getItem(LOCAL_VOLUME_KEY) ?? "1");
    return isNaN(saved) ? 1 : Math.max(0, Math.min(1, saved));
  });
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<MusicSettings>(() => {
    const saved = readLocal<MusicSettings>(LOCAL_SETTINGS_KEY, DEFAULT_SETTINGS);
    // Migrate legacy "all" from old "repeat-all" semantics; just keep as-is
    return { ...DEFAULT_SETTINGS, ...saved };
  });

  // Mini-player dismissed state (lifted from MiniPlayer so Header can read it)
  const DISMISSED_KEY = "miniplayer-dismissed";
  const [miniPlayerDismissed, setMiniPlayerDismissedState] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1"
  );

  const setMiniPlayerDismissed = useCallback((dismissed: boolean) => {
    setMiniPlayerDismissedState(dismissed);
    if (dismissed) {
      localStorage.setItem(DISMISSED_KEY, "1");
    } else {
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, []);

  // Clear dismissed when music stops entirely
  useEffect(() => {
    if (!currentSong) {
      setMiniPlayerDismissedState(false);
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [currentSong]);

  // Auto-restore when a new song starts after dismissal
  const prevSongIdForDismissRef = useRef<number | null>(null);
  useEffect(() => {
    const id = currentSong?.id ?? null;
    if (id !== null && id !== prevSongIdForDismissRef.current) {
      prevSongIdForDismissRef.current = id;
      if (miniPlayerDismissed) setMiniPlayerDismissed(false);
    }
  }, [currentSong?.id, miniPlayerDismissed, setMiniPlayerDismissed]);

  // Listen for restore events dispatched by shell "now playing" chips
  useEffect(() => {
    const handler = () => setMiniPlayerDismissed(false);
    window.addEventListener("miniplayer-restore", handler);
    return () => window.removeEventListener("miniplayer-restore", handler);
  }, [setMiniPlayerDismissed]);

  // Queue state (Phase 1)
  const [activeQueue, setActiveQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const activeQueueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(-1);

  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedEntry[]>(() =>
    readLocal<RecentlyPlayedEntry[]>(LOCAL_HISTORY_KEY, [])
  );
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [favSongIds, setFavSongIds] = useState<number[]>([]);

  // Stable refs for use inside event handlers (avoid stale closures)
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const currentSongRef = useRef(currentSong);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  const recentlyPlayedRef = useRef(recentlyPlayed);
  useEffect(() => { recentlyPlayedRef.current = recentlyPlayed; }, [recentlyPlayed]);
  const dbSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSongRef = useRef<(song: Song) => void>(() => {});
  const playNextRef = useRef<() => void>(() => {});
  const playPrevRef = useRef<() => void>(() => {});
  const closePlayerRef = useRef<() => void>(() => {});

  // Play counting: track 10 continuous seconds of playback per session per song
  const sessionIdRef = useRef<string>("");
  const playCountedRef = useRef<Set<number>>(new Set());
  const playTrackRef = useRef<{ songId: number; lastTime: number; accumulated: number }>({ songId: 0, lastTime: -1, accumulated: 0 });
  useEffect(() => {
    const key = "music-session-id";
    let id = sessionStorage.getItem(key);
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(key, id); }
    sessionIdRef.current = id;
  }, []);

  // Apply saved volume to audio element on mount
  useEffect(() => {
    audioRef.current.volume = volume;
  }, []);

  // Sync volume state when audio element volume changes externally (e.g. Android media controls)
  useEffect(() => {
    const audio = audioRef.current;
    const onVolumeChange = () => {
      const v = audio.volume;
      setVolumeState(v);
      localStorage.setItem(LOCAL_VOLUME_KEY, String(v));
    };
    audio.addEventListener("volumechange", onVolumeChange);
    return () => audio.removeEventListener("volumechange", onVolumeChange);
  }, []);

  // Fetch all songs for recommendations (lazy, on first play)
  const songsFetchedRef = useRef(false);
  const fetchAllSongs = useCallback(async () => {
    if (songsFetchedRef.current) return;
    songsFetchedRef.current = true;
    try {
      const res = await fetch("/api/songs/library");
      if (res.ok) setAllSongs(await res.json());
    } catch {}
  }, []);

  // Load DB settings + history when user signs in
  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const [settingsRes, historyRes, favRes] = await Promise.all([
          fetch("/api/user/music-settings", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/user/playback/history", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/user/library/favorites", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          const merged: MusicSettings = { ...DEFAULT_SETTINGS, ...s };
          setSettings(merged);
          settingsRef.current = merged;
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
        }
        if (historyRes.ok) {
          const rows: any[] = await historyRes.json();
          const entries: RecentlyPlayedEntry[] = rows.map(r => ({
            songId: r.songId,
            title: r.song?.title ?? "",
            slug: r.song?.slug ?? "",
            artist: r.song?.artist ?? r.song?.labelName ?? "",
            labelName: r.song?.labelName ?? "",
            coverImageUrl: r.song?.coverImageUrl ?? null,
            lastPosition: r.lastPosition ?? 0,
            duration: r.durationSecs ?? 0,
            progressPercent: r.progressPercent ?? 0,
            lastPlayedAt: r.lastPlayedAt ?? new Date().toISOString(),
          }));
          setRecentlyPlayed(prev => {
            const localIds = new Set(prev.map(p => p.songId));
            const merged = [...prev, ...entries.filter(e => !localIds.has(e.songId))]
              .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
              .slice(0, HISTORY_LIMIT);
            localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(merged));
            return merged;
          });
        }
        if (favRes.ok) {
          const favs: any[] = await favRes.json();
          setFavSongIds(favs.map((f: any) => f.songId));
        }
      } catch {}
    })();
  }, [isSignedIn]);

  // Save position helper — writes to localStorage + queues DB sync
  const savePosition = useCallback((song: Song, time: number, dur: number) => {
    const progress = dur > 0 ? Math.min(100, Math.round((time / dur) * 100)) : 0;
    const entry: RecentlyPlayedEntry = {
      songId: song.id,
      title: song.title,
      slug: song.slug,
      artist: song.artist ?? song.labelName,
      labelName: song.labelName,
      coverImageUrl: song.coverImageUrl ?? null,
      lastPosition: Math.round(time),
      duration: Math.round(dur),
      progressPercent: progress,
      lastPlayedAt: new Date().toISOString(),
    };
    setRecentlyPlayed(prev => {
      const updated = [entry, ...prev.filter(r => r.songId !== song.id)].slice(0, HISTORY_LIMIT);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
      recentlyPlayedRef.current = updated;
      return updated;
    });
    if (isSignedIn) {
      if (dbSyncRef.current) clearTimeout(dbSyncRef.current);
      dbSyncRef.current = setTimeout(async () => {
        try {
          const token = await getIdToken();
          if (!token) return;
          await fetch(`/api/user/playback/${song.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lastPosition: Math.round(time), durationSecs: Math.round(dur), progressPercent: progress }),
          });
        } catch {}
      }, 3000);
    }
  }, [isSignedIn, getIdToken]);

  const savePositionRef = useRef(savePosition);
  useEffect(() => { savePositionRef.current = savePosition; }, [savePosition]);

  // Attach persistent audio event listeners once on mount
  useEffect(() => {
    const audio = audioRef.current;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const song = currentSongRef.current;
      if (song && audio.currentTime > 0) {
        const track = playTrackRef.current;
        if (track.songId !== song.id) {
          playTrackRef.current = { songId: song.id, lastTime: audio.currentTime, accumulated: 0 };
        } else if (track.lastTime >= 0) {
          const delta = audio.currentTime - track.lastTime;
          if (delta > 0 && delta < 3) {
            playTrackRef.current.accumulated = track.accumulated + delta;
            if (playTrackRef.current.accumulated >= 10 && !playCountedRef.current.has(song.id)) {
              playCountedRef.current.add(song.id);
              fetch(`/api/songs/${song.id}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventType: "play", sessionId: sessionIdRef.current }),
              }).catch(() => {});
            }
          }
          playTrackRef.current.lastTime = audio.currentTime;
        } else {
          playTrackRef.current.lastTime = audio.currentTime;
        }
      }
    };
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      const song = currentSongRef.current;
      if (song) savePositionRef.current(song, audio.currentTime, audio.duration || 0);
    };
    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      const song = currentSongRef.current;
      if (song) savePositionRef.current(song, audio.duration || 0, audio.duration || 0);

      const s = settingsRef.current;

      // Repeat One: loop current song
      if (s.repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      // Queue-based advancement (Play All / Repeat All)
      const queue = activeQueueRef.current;
      const qi = queueIndexRef.current;

      if (queue.length > 0 && (s.repeatMode === "play-all" || s.repeatMode === "all")) {
        let nextIndex = qi + 1;
        if (nextIndex >= queue.length) {
          if (s.repeatMode === "all") {
            nextIndex = 0; // loop queue
          } else {
            // play-all: reached end, stop
            return;
          }
        }
        const nextSong = queue[nextIndex];
        queueIndexRef.current = nextIndex;
        setQueueIndex(nextIndex);
        setTimeout(() => playSongRef.current(nextSong), 400);
        return;
      }

      // Legacy autoplay via recommendations
      if (s.autoplayNext) {
        setTimeout(() => {
          const recs = (window as any).__musicRecs as Song[] | undefined;
          if (recs && recs.length > 0) playSongRef.current(recs[0]);
        }, 400);
      }
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Periodic position save (every 5s while playing)
  useEffect(() => {
    if (!isPlaying || !currentSong) return;
    const id = setInterval(() => {
      const audio = audioRef.current;
      if (currentSong && audio.src && isFinite(audio.currentTime)) {
        savePosition(currentSong, audio.currentTime, audio.duration || 0);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isPlaying, currentSong, savePosition]);

  // Recommendations
  const recommendations = useMemo<Song[]>(() => {
    if (!currentSong || allSongs.length === 0) return [];
    const recentIds = new Set(recentlyPlayed.map(r => r.songId));
    const favSet = new Set(favSongIds);
    return scoreRecommendations(allSongs, currentSong, recentIds, favSet);
  }, [currentSong, allSongs, recentlyPlayed, favSongIds]);

  // Expose recommendations via global ref for use in audio onEnded handler
  useEffect(() => {
    (window as any).__musicRecs = recommendations;
  }, [recommendations]);

  const nextSong = recommendations[0] ?? null;

  const continueListening = useMemo(() =>
    recentlyPlayed.filter(r => r.progressPercent >= 5 && r.progressPercent < 90),
  [recentlyPlayed]);

  // ── Queue management (Phase 1) ──────────────────────────────────────────────

  const setQueue = useCallback((songs: Song[], startAt: number = 0) => {
    const s = settingsRef.current;
    let ordered: Song[];
    let qi: number;
    if (s.shuffle) {
      // Keep the song at startAt first, shuffle the rest
      const startSong = songs[startAt];
      const rest = songs.filter((_, i) => i !== startAt);
      ordered = startSong ? [startSong, ...shuffleArr(rest)] : shuffleArr(songs);
      qi = 0;
    } else {
      ordered = [...songs];
      qi = Math.max(0, Math.min(startAt, songs.length - 1));
    }
    activeQueueRef.current = ordered;
    queueIndexRef.current = qi;
    setActiveQueue(ordered);
    setQueueIndex(qi);
  }, []);

  const clearQueue = useCallback(() => {
    activeQueueRef.current = [];
    queueIndexRef.current = -1;
    setActiveQueue([]);
    setQueueIndex(-1);
  }, []);

  const playSong = useCallback((song: Song) => {
    fetchAllSongs();
    const audio = audioRef.current;

    // Save current song position before switching
    const prevSong = currentSongRef.current;
    if (prevSong && audio.src && isFinite(audio.currentTime)) {
      savePositionRef.current(prevSong, audio.currentTime, audio.duration || 0);
    }

    // Load new song
    audio.pause();
    audio.src = `/api/songs/${song.id}/audio`;
    audio.playbackRate = settingsRef.current.defaultSpeed;
    audio.volume = audioRef.current.volume;

    // Find saved position
    const saved = recentlyPlayedRef.current.find(r => r.songId === song.id);
    const startPos = (settingsRef.current.rememberPosition && saved && saved.progressPercent < 95)
      ? saved.lastPosition
      : 0;

    const onReady = () => {
      if (startPos > 0 && isFinite(startPos)) audio.currentTime = startPos;
      audio.play().catch(() => {});
    };
    audio.addEventListener("canplay", onReady, { once: true });
    audio.load();

    setCurrentSong(song);
    currentSongRef.current = song;
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRateState(settingsRef.current.defaultSpeed);

    // Update recently played immediately
    const entry: RecentlyPlayedEntry = {
      songId: song.id, title: song.title, slug: song.slug,
      artist: song.artist ?? song.labelName, labelName: song.labelName,
      coverImageUrl: song.coverImageUrl ?? null,
      lastPosition: startPos, duration: saved?.duration ?? 0,
      progressPercent: saved?.progressPercent ?? 0,
      lastPlayedAt: new Date().toISOString(),
    };
    setRecentlyPlayed(prev => {
      const updated = [entry, ...prev.filter(r => r.songId !== song.id)].slice(0, HISTORY_LIMIT);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
      recentlyPlayedRef.current = updated;
      return updated;
    });
  }, [fetchAllSongs]);

  // Keep playSongRef in sync
  useEffect(() => { playSongRef.current = playSong; }, [playSong]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (isFinite(time)) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol));
    audioRef.current.volume = v;
    setVolumeState(v);
    localStorage.setItem(LOCAL_VOLUME_KEY, String(v));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    audioRef.current.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    const song = currentSongRef.current;
    if (song && audio.src) {
      savePositionRef.current(song, audio.currentTime, audio.duration || 0);
    }
    audio.pause();
    audio.src = "";
    setCurrentSong(null);
    currentSongRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    clearQueue();
  }, [clearQueue]);

  const playNext = useCallback(() => {
    const queue = activeQueueRef.current;
    const qi = queueIndexRef.current;
    const s = settingsRef.current;
    if (queue.length > 0) {
      let nextIndex = qi + 1;
      if (nextIndex >= queue.length) {
        if (s.repeatMode === "all") nextIndex = 0;
        else return;
      }
      const nextSong = queue[nextIndex];
      queueIndexRef.current = nextIndex;
      setQueueIndex(nextIndex);
      playSongRef.current(nextSong);
      return;
    }
    // Legacy: use recommendations
    const recs = (window as any).__musicRecs as Song[] | undefined;
    if (recs && recs.length > 0) playSongRef.current(recs[0]);
  }, []);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    const queue = activeQueueRef.current;
    const qi = queueIndexRef.current;
    const s = settingsRef.current;

    // Rule 1: if played > 3 seconds, always restart the current song first
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    // Rule 2: played <= 3 seconds — try to go to previous in queue
    if (queue.length > 0) {
      let prevIndex = qi - 1;
      if (prevIndex < 0) {
        if (s.repeatMode === "all") {
          // Wrap to last song
          prevIndex = queue.length - 1;
        } else {
          // At first song with no wrap — restart from beginning
          audio.currentTime = 0;
          return;
        }
      }
      const prevSong = queue[prevIndex];
      queueIndexRef.current = prevIndex;
      setQueueIndex(prevIndex);
      playSongRef.current(prevSong);
    } else {
      // No queue — restart current song
      audio.currentTime = 0;
    }
  }, []);

  // Keep action refs in sync so Media Session handlers never go stale
  useEffect(() => { closePlayerRef.current = closePlayer; }, [closePlayer]);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPrevRef.current = playPrev; }, [playPrev]);

  const updateSettings = useCallback((partial: Partial<MusicSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      settingsRef.current = updated;
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
      if (partial.defaultSpeed !== undefined) {
        audioRef.current.playbackRate = partial.defaultSpeed;
        setPlaybackRateState(partial.defaultSpeed);
      }
      // If shuffle changed and queue is active, re-shuffle the queue
      if (partial.shuffle !== undefined && activeQueueRef.current.length > 0) {
        const queue = activeQueueRef.current;
        const qi = queueIndexRef.current;
        const currentQ = queue[qi];
        if (partial.shuffle) {
          const others = queue.filter((_, i) => i !== qi);
          const newQueue = currentQ ? [currentQ, ...shuffleArr(others)] : shuffleArr(queue);
          activeQueueRef.current = newQueue;
          queueIndexRef.current = 0;
          setActiveQueue(newQueue);
          setQueueIndex(0);
        } else {
          // Un-shuffle: restore original order (we don't have original, so just leave as-is)
        }
      }
      // Sync to DB
      if (isSignedIn) {
        getIdToken().then(token => {
          if (!token) return;
          fetch("/api/user/music-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(updated),
          }).catch(() => {});
        });
      }
      return updated;
    });
  }, [isSignedIn, getIdToken]);

  // ── Resume Web Audio AudioContext after page returns to foreground ──────────
  // When MusicVisualizer is mounted it routes the audio element through an
  // AudioContext (stored as _audioCtx on the element).  Browsers may suspend
  // that context during tab switches or screen locks.  We resume it here so
  // playback continues when the user returns to the app.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const ctx = (audioRef.current as any)._audioCtx as AudioContext | undefined;
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ── Media Session API ─────────────────────────────────────────────────────
  // Publish song metadata and register transport actions so the lock screen,
  // Control Center, notification shade, and Bluetooth controls work.

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist ?? currentSong.labelName ?? "",
      album: currentSong.labelName ?? "SpiritTone Records",
      artwork: currentSong.coverImageUrl
        ? [
            { src: currentSong.coverImageUrl, sizes: "512x512", type: "image/jpeg" },
            { src: currentSong.coverImageUrl, sizes: "256x256", type: "image/jpeg" },
          ]
        : [],
    });

    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      audio.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audio.pause();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      playPrevRef.current();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      playNextRef.current();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const by = details.seekOffset ?? 10;
      audio.currentTime = Math.max(0, audio.currentTime - by);
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const by = details.seekOffset ?? 10;
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + by);
    });
    try {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null) audio.currentTime = details.seekTime;
      });
    } catch {}
    try {
      navigator.mediaSession.setActionHandler("stop", () => {
        closePlayerRef.current();
      });
    } catch {}

    return () => {
      if (!("mediaSession" in navigator)) return;
      (["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward"] as MediaSessionAction[])
        .forEach((a) => { try { navigator.mediaSession.setActionHandler(a, null); } catch {} });
      try { navigator.mediaSession.setActionHandler("seekto", null); } catch {}
      try { navigator.mediaSession.setActionHandler("stop", null); } catch {}
    };
  }, [currentSong]);

  // Sync playback state (playing / paused / none)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying, currentSong]);

  // Sync scrubber position so lock-screen progress bar stays accurate
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: Math.min(currentTime, duration),
      });
    } catch {}
  }, [currentTime, duration, playbackRate, currentSong]);

  // ── Capacitor Android: native foreground service + MediaStyle notification ──
  // When running inside the Android Capacitor wrapper this bridges the web
  // audio state to MusicControlPlugin / MediaPlaybackService.
  // On every other platform the Capacitor guard returns early (complete no-op).

  // Shared plugin ref — set once on mount, reused by the state-sync effect so
  // we only pay the dynamic-import cost once for the lifetime of the provider.
  const nativeMusicControlRef = useRef<any>(null);

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== "android") return;

    let active = true;
    let listenHandles: Array<{ remove: () => void }> = [];

    (async () => {
      try {
        const { registerPlugin } = await import("@capacitor/core");
        if (!active) return;

        const plugin = registerPlugin<any>("MusicControl");
        nativeMusicControlRef.current = plugin;

        // Relay notification / hardware button taps → audio element
        const audio = audioRef.current;
        listenHandles = await Promise.all([
          plugin.addListener("play",  () => { audio.play().catch(() => {}); }),
          plugin.addListener("pause", () => { audio.pause(); }),
          plugin.addListener("next",  () => { playNextRef.current(); }),
          plugin.addListener("prev",  () => { playPrevRef.current(); }),
          plugin.addListener("stop",  () => { closePlayerRef.current(); }),
          // Task #31: native plugin fires this when POST_NOTIFICATIONS is
          // permanently denied (user tapped Play but OS suppressed the dialog).
          // Re-dispatch as a DOM event so useNotificationPermission can react.
          plugin.addListener("notificationPermissionPermanentlyDenied", () => {
            window.dispatchEvent(new CustomEvent("notification-permission-denied"));
          }),
        ]);
      } catch {
        // Plugin unavailable in dev browser — silently skip
      }
    })();

    return () => {
      active = false;
      nativeMusicControlRef.current = null;
      listenHandles.forEach(h => { try { h.remove(); } catch {} });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // register once on mount

  // Track which song was last sent so we can avoid a full metadata push
  // (including background artwork reload) on a plain play/pause toggle.
  const nativePrevSongIdRef = useRef<number | null>(null);

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== "android") return;

    (async () => {
      try {
        // Prefer the already-loaded instance; fall back to a fresh registerPlugin
        // for the rare case this effect fires before the mount effect resolves.
        let plugin = nativeMusicControlRef.current;
        if (!plugin) {
          const { registerPlugin } = await import("@capacitor/core");
          plugin = registerPlugin<any>("MusicControl");
        }

        if (!currentSong) {
          // Player closed — stop the foreground service + dismiss notification
          await plugin.stop();
          nativePrevSongIdRef.current = null;
          return;
        }

        const songChanged = currentSong.id !== nativePrevSongIdRef.current;
        nativePrevSongIdRef.current = currentSong.id;

        if (songChanged) {
          // New track — full update (starts the service, downloads artwork)
          await plugin.updateMetadata({
            title:      currentSong.title,
            artist:     currentSong.artist ?? currentSong.labelName ?? "",
            artworkUrl: currentSong.coverImageUrl ?? "",
            isPlaying,
          });
        } else {
          // Same track, play/pause toggled — cheap in-place notification update
          await plugin.setPlaybackState({ isPlaying });
        }
      } catch {
        // Plugin unavailable in dev browser — silently skip
      }
    })();
  }, [currentSong, isPlaying]);

  return (
    <MusicPlayerContext.Provider value={{
      currentSong, isPlaying, currentTime, duration, volume, playbackRate, isLoading,
      settings, recentlyPlayed, recommendations, nextSong, continueListening,
      activeQueue, queueIndex, audioElement: audioRef.current,
      miniPlayerDismissed, setMiniPlayerDismissed,
      setQueue, clearQueue,
      playSong, togglePlay, seek, setVolume, setPlaybackRate,
      closePlayer, playNext, playPrev, updateSettings,
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  return useContext(MusicPlayerContext);
}
