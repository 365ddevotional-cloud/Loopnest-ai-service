import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SpiritToneTimedPreview({ songId, title, slug }: { songId: number; title: string; slug: string }) {
  const playerRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [availableDuration, setAvailableDuration] = useState(45);
  const [failed, setFailed] = useState(false);
  const maxTime = Math.min(45, availableDuration);
  useEffect(() => () => {
    const audio = playerRef.current;
    if (audio) audio.pause();
  }, []);
  const toggle = async () => {
    const audio = playerRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      if (audio.currentTime >= maxTime - 0.15) audio.currentTime = 0;
      await audio.play();
      setPlaying(true);
      setFailed(false);
    } catch {
      setPlaying(false);
      setFailed(true);
    }
  };
  const stopAtPreviewEnd = () => {
    const audio = playerRef.current;
    if (!audio) return;
    if (audio.currentTime >= maxTime - 0.05) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setElapsed(0);
    } else {
      setElapsed(audio.currentTime);
    }
  };
  const seek = (time: number) => {
    const audio = playerRef.current;
    if (!audio || !Number.isFinite(time)) return;
    const capped = Math.max(0, Math.min(time, maxTime - 0.05));
    audio.currentTime = capped;
    setElapsed(capped);
  };
  return (
    <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label={`45-second preview of ${title}`}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Headphones size={16} aria-hidden="true" /> Listen to the first 45 seconds</h2>
      <audio
        ref={playerRef}
        src={`/api/songs/${songId}/audio`}
        preload="none"
        onLoadedMetadata={event => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration) && duration > 0) setAvailableDuration(Math.min(45, duration));
        }}
        onTimeUpdate={stopAtPreviewEnd}
        onSeeking={event => {
          if (event.currentTarget.currentTime > 45) event.currentTarget.currentTime = 0;
        }}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
        onPause={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false); }}
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={() => void toggle()} aria-label={playing ? `Pause ${title} preview` : `Play ${title} preview`}>
          {playing ? "Pause" : "Play"}
        </Button>
        <input type="range" aria-label="Preview position" min={0} max={maxTime} step={0.1}
          value={Math.min(elapsed, maxTime)} onChange={event => seek(Number(event.target.value))} className="min-w-0 flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground">{Math.floor(elapsed)}s / {Math.ceil(maxTime)}s</span>
      </div>
      {failed && <p role="alert" className="mt-2 text-sm text-destructive">This recording could not be played. You can try its original SpiritTone page.</p>}
      <p className="mt-2 text-xs text-muted-foreground">Playback-limited sample from the existing SpiritTone recording. The separately rendered stereo clip and purchase package are still being prepared.</p>
      <Link href={`/music/${encodeURIComponent(slug)}`} className="mt-2 inline-block text-sm font-semibold text-primary underline">Open in SpiritTone Records</Link>
    </section>
  );
}

