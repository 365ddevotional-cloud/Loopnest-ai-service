import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";
import type { Song } from "@shared/schema";

const LOCAL_HISTORY_KEY = "spirittone-playback-history";
const LOCAL_SETTINGS_KEY = "spirittone-music-settings";
const HISTORY_LIMIT = 20;

export interface MusicSettings {
  autoplayNext: boolean;
  rememberPosition: boolean;
  defaultSpeed: number;
  repeatMode: "none" | "one" | "all";
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
  playSong: (song: Song) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  closePlayer: () => void;
  playNext: () => void;
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
  playSong: () => {}, togglePlay: () => {}, seek: () => {}, setVolume: () => {},
  setPlaybackRate: () => {}, closePlayer: () => {}, playNext: () => {}, updateSettings: () => {},
});

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { user, emailVerified, getIdToken } = useUser();
  const isSignedIn = !!user && emailVerified;

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<MusicSettings>(() =>
    readLocal<MusicSettings>(LOCAL_SETTINGS_KEY, DEFAULT_SETTINGS)
  );
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
            // Merge: DB entries fill in slots not in local
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
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
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
      if (s.repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (s.autoplayNext) {
        // Play next via ref to avoid stale closure
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
    audio.volume = volume;

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
  }, [fetchAllSongs, volume]);

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
    audioRef.current.volume = vol;
    setVolumeState(vol);
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
  }, []);

  const playNext = useCallback(() => {
    const recs = (window as any).__musicRecs as Song[] | undefined;
    if (recs && recs.length > 0) playSongRef.current(recs[0]);
  }, []);

  const updateSettings = useCallback((partial: Partial<MusicSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      settingsRef.current = updated;
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
      if (partial.defaultSpeed !== undefined) {
        audioRef.current.playbackRate = partial.defaultSpeed;
        setPlaybackRateState(partial.defaultSpeed);
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

  return (
    <MusicPlayerContext.Provider value={{
      currentSong, isPlaying, currentTime, duration, volume, playbackRate, isLoading,
      settings, recentlyPlayed, recommendations, nextSong, continueListening,
      playSong, togglePlay, seek, setVolume, setPlaybackRate,
      closePlayer, playNext, updateSettings,
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  return useContext(MusicPlayerContext);
}
