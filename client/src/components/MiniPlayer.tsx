import { useLocation } from "wouter";
import { Play, Pause, X, Music2, SkipForward, SkipBack, Settings2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useState } from "react";
import MusicSettings from "@/components/MusicSettings";
import PlaybackModeBar from "@/components/PlaybackModeBar";

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
    activeQueue, queueIndex, nextSong,
  } = useMusicPlayer();
  const [showSettings, setShowSettings] = useState(false);

  if (!currentSong) return null;

  // Hide on the SongDetail page for the currently playing song
  if (location === `/music/${currentSong.slug}`) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasQueue = activeQueue.length > 0;
  const canSkipNext = hasQueue ? queueIndex < activeQueue.length - 1 : !!nextSong;
  const canSkipPrev = hasQueue && queueIndex > 0;

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
              {hasQueue && (
                <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                  {queueIndex + 1}/{activeQueue.length}
                </span>
              )}
            </div>
          </button>

          {/* Time */}
          <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 tabular-nums hidden sm:block">
            {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Skip Prev */}
            {canSkipPrev && (
              <button
                onClick={playPrev}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                data-testid="mini-player-prev"
                title="Previous song"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            )}

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
                title={hasQueue ? `Next: ${activeQueue[queueIndex + 1]?.title ?? ""}` : nextSong ? `Play next: ${nextSong.title}` : ""}
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

            {/* Close */}
            <button
              onClick={closePlayer}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              data-testid="mini-player-close"
              aria-label="Close player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Playback mode bar (second row — compact, shown when queue exists) */}
        {hasQueue && (
          <div className="flex items-center justify-between px-4 pb-2 border-t border-border/20 pt-1.5">
            <span className="text-[10px] text-muted-foreground/60">
              Queue: {activeQueue.length} songs
            </span>
            <PlaybackModeBar size="sm" />
          </div>
        )}
      </div>

      <MusicSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
