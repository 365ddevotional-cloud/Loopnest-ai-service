/**
 * MusicVisualizer — Web Audio API frequency bar visualizer (Phase 3).
 *
 * Receives the audio element from MusicPlayerContext and creates a
 * MediaElementAudioSourceNode once per element (guarded by a WeakMap
 * to avoid the "already connected" error if the component remounts).
 *
 * Props:
 *   audioElement — HTMLAudioElement from useMusicPlayer().audioElement
 *   isPlaying    — drives animation pause/resume
 *   barCount     — number of frequency bars (default 16)
 *   height       — canvas height in px (default 48)
 *   className    — optional tailwind class names
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// WeakMap ensures only one AudioContext/AnalyserNode pair per audio element
// even if the component mounts/unmounts multiple times.
const nodeMap = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode; source: MediaElementAudioSourceNode }
>();

interface MusicVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

export default function MusicVisualizer({
  audioElement,
  isPlaying,
  barCount = 16,
  height = 48,
  className,
}: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Respect prefers-reduced-motion
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Connect or retrieve the audio nodes for this audio element
  useEffect(() => {
    if (!audioElement) return;

    let entry = nodeMap.get(audioElement);
    if (!entry) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // gives 32 frequency bins
        analyser.smoothingTimeConstant = 0.75;
        const source = ctx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        entry = { ctx, analyser, source };
        nodeMap.set(audioElement, entry);
      } catch (e) {
        // Web Audio not available (e.g. very old browser / SSR)
        return;
      }
    }

    analyserRef.current = entry.analyser;

    // Resume audio context if it's suspended (browser autoplay policy)
    if (entry.ctx.state === "suspended") {
      entry.ctx.resume().catch(() => {});
    }
  }, [audioElement]);

  // Resume AudioContext when playback starts (autoplay-policy unlock)
  useEffect(() => {
    if (!audioElement) return;
    const entry = nodeMap.get(audioElement);
    if (!entry) return;
    if (isPlaying && entry.ctx.state === "suspended") {
      entry.ctx.resume().catch(() => {});
    }
  }, [isPlaying, audioElement]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser || reducedMotion) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Use CSS custom property for the primary color (falls back to a warm gold)
    const style = getComputedStyle(document.documentElement);
    const primaryHsl = style.getPropertyValue("--primary").trim() || "43 74% 49%";
    const primaryColor = `hsl(${primaryHsl})`;
    const idleColor = `hsla(${primaryHsl} / 0.25)`;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      if (!isPlaying) {
        // Idle state: draw flat short bars
        const barW = Math.floor((W - (barCount - 1) * 2) / barCount);
        for (let i = 0; i < barCount; i++) {
          const x = i * (barW + 2);
          const barH = 3;
          ctx2d.fillStyle = idleColor;
          ctx2d.beginPath();
          ctx2d.roundRect(x, H - barH, barW, barH, 2);
          ctx2d.fill();
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      const barW = Math.floor((W - (barCount - 1) * 2) / barCount);
      const binStep = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        // Average a few bins per bar for smoother appearance
        let sum = 0;
        for (let j = 0; j < binStep; j++) sum += dataArray[i * binStep + j];
        const avg = sum / binStep;
        const barH = Math.max(3, Math.round((avg / 255) * H));

        const x = i * (barW + 2);
        const y = H - barH;

        // Gradient: brighter at top
        const grad = ctx2d.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, primaryColor);
        grad.addColorStop(1, `hsla(${primaryHsl} / 0.5)`);

        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
        ctx2d.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, barCount, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 14} // ~14px per bar slot
      height={height}
      className={cn("w-full max-w-xs", className)}
      aria-hidden="true"
      style={{ touchAction: "none", pointerEvents: "none" }}
    />
  );
}
