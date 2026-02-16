import { Play, Pause, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAudioReader } from "@/hooks/useAudioReader";

const SPEED_OPTIONS = [
  { label: "0.75x", value: 0.75 },
  { label: "0.88x", value: 0.88 },
  { label: "0.92x", value: 0.92 },
  { label: "1x", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
];

export function AudioMiniPlayer() {
  const { isSpeaking, isPaused, rate, currentLabel, pause, resume, stop, setSpeed } = useAudioReader();

  if (!isSpeaking) return null;

  const currentSpeedLabel = SPEED_OPTIONS.find((o) => o.value === rate)?.label || `${rate}x`;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border rounded-md shadow-lg px-3 py-2 max-w-[90vw]"
      data-testid="audio-mini-player"
    >
      <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]" data-testid="text-audio-label">
        {currentLabel}
      </span>

      {isPaused ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={resume}
          aria-label="Resume"
          data-testid="button-audio-resume"
        >
          <Play className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={pause}
          aria-label="Pause"
          data-testid="button-audio-pause"
        >
          <Pause className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={stop}
        aria-label="Stop"
        data-testid="button-audio-stop"
      >
        <Square className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-audio-speed">
            {currentSpeedLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SPEED_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setSpeed(opt.value)}
              className={rate === opt.value ? "font-bold" : ""}
              data-testid={`speed-option-${opt.value}`}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
