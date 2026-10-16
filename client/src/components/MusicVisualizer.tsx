import { memo } from "react";
import { cn } from "@/lib/utils";

interface MusicVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

// Decorative playback bars must never reroute the media element through an
// AudioContext: iOS may suspend that context when navigating or locking the phone.
export default memo(function MusicVisualizer({
  isPlaying, barCount = 16, height = 48, className,
}: MusicVisualizerProps) {
  return (
    <div className={cn("flex items-end justify-center gap-1 w-full max-w-xs", className)}
      style={{ height }} aria-hidden="true">
      {Array.from({ length: Math.max(1, Math.min(32, barCount)) }, (_, i) => (
        <span key={i} className="music-playback-bar bg-primary/70 rounded-t-sm flex-1"
          style={{
            height: isPlaying ? `${25 + ((i * 17) % 70)}%` : 3,
            animation: isPlaying ? `music-playback-pulse ${0.7 + (i % 5) * 0.13}s ease-in-out infinite alternate` : "none",
            animationDelay: `${-(i % 7) * 0.11}s`,
            transformOrigin: "bottom",
          }} />
      ))}
    </div>
  );
});
