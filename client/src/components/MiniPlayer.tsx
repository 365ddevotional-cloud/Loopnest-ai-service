import { useLocation } from "wouter";
import { Play, Pause, X, ChevronUp, Music2, SkipForward, Settings2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useState } from "react";
import MusicSettings from "@/components/MusicSettings";

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
    togglePlay, seek, closePlayer, playNext, nextSong,
  } = useMusicPlayer();
  const [showSettings, setShowSettings] = useState(false);

  if (!currentSong) return null;

  // Hide on the SongDetail page for the currently playing song
  if (location === `/music/${currentSong.slug}`) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md shadow-2xl"
        data-testid="mini-player"
      >
        {/* Seek bar (thin strip at top) */}
        <div
          className="h-1 w-full bg-border/30 cursor-pointer relative"
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio * duration);
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
          {/* Artwork */}
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

          {/* Title + Artist */}
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
            </div>
          </button>

          {/* Time */}
          <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 tabular-nums">
            {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
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

            {/* Play Next (if available) */}
            {nextSong && (
              <button
                onClick={playNext}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                data-testid="mini-player-next"
                title={`Play next: ${nextSong.title}`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              data-testid="mini-player-settings"
              title="Music settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={closePlayer}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              data-testid="mini-player-close"
              aria-label="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <MusicSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
