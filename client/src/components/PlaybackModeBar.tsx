/**
 * PlaybackModeBar — compact 5-button playback mode selector.
 * Modes: Normal · Repeat One · Play All · Repeat All · Shuffle
 */
import { Repeat, Repeat1, ListMusic, ListRestart, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface PlaybackModeBarProps {
  className?: string;
  size?: "sm" | "md";
}

export default function PlaybackModeBar({ className, size = "md" }: PlaybackModeBarProps) {
  const { settings, updateSettings, activeQueue } = useMusicPlayer();
  const { repeatMode, shuffle } = settings;

  const btnBase = cn(
    "inline-flex items-center justify-center rounded-md transition-colors select-none",
    size === "sm" ? "h-7 w-7" : "h-8 w-8"
  );
  const iconSz = size === "sm" ? 13 : 15;

  const setMode = (mode: typeof repeatMode) => updateSettings({ repeatMode: mode });
  const toggleShuffle = () => updateSettings({ shuffle: !shuffle });

  const hasQueue = activeQueue.length > 0;
  const queueNeeded = repeatMode === "play-all" || repeatMode === "all";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Normal */}
      <button
        title="Normal — stop after song"
        onClick={() => setMode("none")}
        className={cn(btnBase, repeatMode === "none" && !shuffle
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        aria-pressed={repeatMode === "none"}
      >
        <ListMusic size={iconSz} />
      </button>

      {/* Repeat One */}
      <button
        title="Repeat One"
        onClick={() => setMode("one")}
        className={cn(btnBase, repeatMode === "one"
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        aria-pressed={repeatMode === "one"}
      >
        <Repeat1 size={iconSz} />
      </button>

      {/* Play All */}
      <button
        title={hasQueue || !queueNeeded ? "Play All — play queue once" : "Play All (use Play All button on Music page to set queue)"}
        onClick={() => setMode("play-all")}
        className={cn(btnBase, repeatMode === "play-all"
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        aria-pressed={repeatMode === "play-all"}
      >
        <ListMusic size={iconSz} className="[&>path:last-child]:hidden" />
        {/* Override with a simple arrow-list icon using Repeat */}
        <span className="sr-only">Play All</span>
      </button>

      {/* Repeat All */}
      <button
        title="Repeat All — loop queue"
        onClick={() => setMode("all")}
        className={cn(btnBase, repeatMode === "all"
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        aria-pressed={repeatMode === "all"}
      >
        <Repeat size={iconSz} />
      </button>

      {/* Shuffle */}
      <button
        title="Shuffle"
        onClick={toggleShuffle}
        className={cn(btnBase, shuffle
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        aria-pressed={shuffle}
      >
        <Shuffle size={iconSz} />
      </button>
    </div>
  );
}

/** Returns a readable label for the current playback mode */
export function usePlaybackModeLabel(): string {
  const { settings: { repeatMode, shuffle } } = useMusicPlayer();
  if (shuffle && repeatMode === "none") return "Shuffle";
  if (shuffle && repeatMode === "play-all") return "Shuffle All";
  if (shuffle && repeatMode === "all") return "Shuffle Loop";
  if (repeatMode === "one") return "Repeat One";
  if (repeatMode === "play-all") return "Play All";
  if (repeatMode === "all") return "Repeat All";
  return "Normal";
}
