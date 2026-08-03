import { useLocation } from "wouter";
import {
  Play, Pause, X, Music2, SkipForward, SkipBack, Settings2,
  ChevronDown, ChevronUp, BellOff,
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useState, useEffect, useRef } from "react";
import MusicSettings from "@/components/MusicSettings";
import PlaybackModeBar from "@/components/PlaybackModeBar";

const COLLAPSED_KEY  = "miniplayer-collapsed";
const DISMISSED_KEY = "miniplayer-dismissed";

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const [location, setLocation] = useLocation();
  const {
    currentSong, isPlaying, currentTime, duration, isLoading,
    togglePlay, seek, closePlayer, playNext, playPrev,
    activeQueue, queueIndex, nextSong, settings,
  } = useMusicPlayer();

  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1"
  );
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  // "dismissed" means the user chose "hide player, keep playing".
  // Persisted to localStorage (Task 24) so it survives a page reload.
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1"
  );

  // Notification permission banner (Android 13+ permanent denial)
  const [notifPermDenied, setNotifPermDenied] = useState(false);
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);
  const notifCheckDoneRef = useRef(false);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Persist dismissed state across page reloads (Task 24).
  useEffect(() => {
    if (dismissed) {
      localStorage.setItem(DISMISSED_KEY, "1");
    } else {
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [dismissed]);

  // Task 28: when the user explicitly stops music (currentSong → null via
  // closePlayer), clear dismissed so the bar is visible for the next song.
  useEffect(() => {
    if (!currentSong) {
      setDismissed(false);
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [currentSong]);

  // Auto-restore when a new song starts after dismissal
  const prevSongIdRef = useRef<number | null>(null);
  useEffect(() => {
    const id = currentSong?.id ?? null;
    if (id !== null && id !== prevSongIdRef.current) {
      prevSongIdRef.current = id;
      if (dismissed) setDismissed(false);
    }
  }, [currentSong?.id, dismissed]);

  // Listen for restore events dispatched by shell "now playing" chips
  useEffect(() => {
    const handler = () => setDismissed(false);
    window.addEventListener("miniplayer-restore", handler);
    return () => window.removeEventListener("miniplayer-restore", handler);
  }, []);

  // Check Android notification permission once when music starts playing.
  // If permanently denied show the banner so the user can open Settings.
  useEffect(() => {
    if (!isPlaying || notifCheckDoneRef.current) return;
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== "android") return;

    notifCheckDoneRef.current = true;
    (async () => {
      try {
        const { registerPlugin } = await import("@capacitor/core");
        const plugin = registerPlugin<any>("MusicControl");
        const result = await plugin.checkNotificationPermission();
        if (result?.permanentlyDenied) {
          setNotifPermDenied(true);
        }
      } catch {
        // Plugin unavailable — skip silently
      }
    })();
  }, [isPlaying]);

  // Opens the Android app notification settings screen via native plugin
  const openNotificationSettings = async () => {
    try {
      const { registerPlugin } = await import("@capacitor/core");
      const plugin = registerPlugin<any>("MusicControl");
      await plugin.openNotificationSettings();
    } catch {
      // Not on Android — no-op
    }
  };

  if (!currentSong) return null;

  // Hide on the SongDetail page for the currently playing song
  // (the full player is already visible there)
  if (location === `/music/${currentSong.slug}`) return null;

  // When dismissed: show a small floating restore pill instead of the full bar.
  // Tapping it brings the full MiniPlayer back.
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 border border-border/60 shadow-xl backdrop-blur-md hover:bg-muted/80 transition-all active:scale-95"
        style={{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom))` }}
        aria-label="Restore music player"
        data-testid="mini-player-restore-pill"
        title={`Now playing: ${currentSong.title}`}
      >
        {/* Artwork or music note */}
        <span className="relative flex-shrink-0 w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center">
          {currentSong.coverImageUrl ? (
            <img
              src={currentSong.coverImageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Music2 className="w-3 h-3 text-amber-800/70" />
          )}
          {/* Pulse ring when playing */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />
          )}
        </span>

        {/* Title — truncated */}
        <span className="text-xs font-medium text-foreground max-w-[120px] truncate leading-none">
          {currentSong.title}
        </span>

        {/* Play/pause icon */}
        <span className="flex-shrink-0 text-primary">
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </span>
      </button>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasQueue = activeQueue.length > 0;
  const canSkipNext = hasQueue
    ? queueIndex < activeQueue.length - 1 || settings.repeatMode === "all"
    : !!nextSong;

  const handleDismissKeepPlaying = () => {
    setShowDismissDialog(false);
    setDismissed(true);
  };
  const handleDismissStop = () => {
    setShowDismissDialog(false);
    closePlayer();
  };

  // Banner shown when Android notifications are permanently denied
  const notifBanner = notifPermDenied && !notifBannerDismissed && isPlaying ? (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30">
      <BellOff className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <button
        onClick={openNotificationSettings}
        className="flex-1 text-left text-xs text-amber-700 dark:text-amber-300 font-medium leading-tight"
        data-testid="notif-blocked-banner"
      >
        Notifications blocked — tap to enable in Settings
      </button>
      <button
        onClick={() => setNotifBannerDismissed(true)}
        className="flex-shrink-0 text-amber-600/70 hover:text-amber-700 dark:text-amber-400/70 dark:hover:text-amber-300 transition-colors p-0.5"
        aria-label="Dismiss notification banner"
        data-testid="notif-blocked-dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  ) : null;

  // ── Collapsed state — thin strip ──────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-md shadow-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          data-testid="mini-player-collapsed"
        >
          {notifBanner}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Artwork */}
            <button
              onClick={() => setLocation(`/music/${currentSong.slug}`)}
              className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center"
              aria-label="Open song"
            >
              {currentSong.coverImageUrl ? (
                <img
                  src={currentSong.coverImageUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <Music2 className="w-4 h-4 text-amber-800/70" />
              )}
            </button>

            {/* Title + progress bar */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {currentSong.title}
              </p>
              {duration > 0 && (
                <div
                  className="w-full h-0.5 bg-border/30 rounded-full mt-1 cursor-pointer"
                  onClick={(e) => {
                    if (!duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * duration);
                  }}
                >
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 hover:bg-primary/90 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
              data-testid="mini-player-toggle"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>

            {/* Expand */}
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Expand player"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <MusicSettings open={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // ── Full MiniPlayer ───────────────────────────────────────────────────────
  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-testid="mini-player"
      >
        {notifBanner}

        {/* Seek bar (thin strip at very top) */}
        <div
          className="h-1 w-full bg-border/30 cursor-pointer relative"
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}
          data-testid="mini-player-seekbar"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Artwork — tapping opens the full SongDetail page */}
          <button
            onClick={() => setLocation(`/music/${currentSong.slug}`)}
            className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center"
            data-testid="mini-player-artwork"
            title="Open song"
          >
            {currentSong.coverImageUrl ? (
              <img
                src={currentSong.coverImageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <Music2 className="w-5 h-5 text-amber-800/70" />
            )}
          </button>

          {/* Title + Artist + queue position */}
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => setLocation(`/music/${currentSong.slug}`)}
            data-testid="mini-player-info"
          >
            <div className="text-sm font-semibold text-foreground truncate leading-tight">
              {currentSong.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {currentSong.artist ?? currentSong.labelName}
              {activeQueue.length > 1 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                  {queueIndex + 1} / {activeQueue.length}
                </span>
              )}
            </div>
          </button>

          {/* Playback time — hidden on very small screens */}
          <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 tabular-nums hidden sm:block">
            {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Skip Prev */}
            <button
              onClick={playPrev}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              data-testid="mini-player-prev"
              title={hasQueue && queueIndex > 0 ? "Previous track" : "Restart song"}
              aria-label="Previous track"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 hover:bg-primary/90 transition-colors"
              data-testid="mini-player-toggle"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            {/* Skip Next */}
            {canSkipNext && (
              <button
                onClick={playNext}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                data-testid="mini-player-next"
                title={
                  hasQueue && queueIndex < activeQueue.length - 1
                    ? `Next: ${activeQueue[queueIndex + 1]?.title ?? ""}`
                    : hasQueue && settings.repeatMode === "all"
                    ? `Next: ${activeQueue[0]?.title ?? ""} (wrap)`
                    : nextSong
                    ? `Play next: ${nextSong.title}`
                    : ""
                }
                aria-label="Next track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              data-testid="mini-player-settings"
              title="Music settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse to thin bar */}
            <button
              onClick={() => setCollapsed(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Collapse player"
              title="Collapse"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dismiss — opens confirmation dialog */}
            <button
              onClick={() => setShowDismissDialog(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              data-testid="mini-player-close"
              aria-label="Close player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Playback mode bar — shown when a queue is active */}
        {hasQueue && (
          <div className="flex items-center justify-between px-4 pb-2 border-t border-border/20 pt-1.5">
            <span className="text-[10px] text-muted-foreground/60">
              Queue: {activeQueue.length} songs
            </span>
            <PlaybackModeBar size="sm" />
          </div>
        )}
      </div>

      {/* Dismiss confirmation sheet */}
      {showDismissDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDismissDialog(false)}
          />
          {/* Sheet */}
          <div className="relative w-full max-w-sm bg-background rounded-t-2xl shadow-2xl border border-border/40 p-4 space-y-2 mx-auto">
            <p className="text-sm font-semibold text-foreground text-center pb-1">
              {currentSong.title}
            </p>
            <button
              onClick={handleDismissKeepPlaying}
              className="w-full py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors text-center"
              data-testid="dismiss-keep-playing"
            >
              Hide player · keep music playing
            </button>
            <button
              onClick={handleDismissStop}
              className="w-full py-3 px-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium text-sm transition-colors text-center"
              data-testid="dismiss-stop-music"
            >
              Stop music
            </button>
            <button
              onClick={() => setShowDismissDialog(false)}
              className="w-full py-2 px-4 text-muted-foreground text-sm transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <MusicSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
