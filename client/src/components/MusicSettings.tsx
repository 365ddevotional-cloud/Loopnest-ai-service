import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMusicPlayer, type MusicSettings } from "@/contexts/MusicPlayerContext";
import { Repeat, Repeat1, Shuffle, Zap, MapPin, Wifi, ChevronDown, ListMusic, ListRestart } from "lucide-react";

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

type RepeatMode = MusicSettings["repeatMode"];

const REPEAT_MODES: { value: RepeatMode; label: string; icon: React.ReactNode }[] = [
  { value: "none", label: "Normal", icon: <ListMusic className="w-3.5 h-3.5" /> },
  { value: "one", label: "Repeat One", icon: <Repeat1 className="w-3.5 h-3.5" /> },
  { value: "play-all", label: "Play All", icon: <ListRestart className="w-3.5 h-3.5" /> },
  { value: "all", label: "Repeat All", icon: <Repeat className="w-3.5 h-3.5" /> },
];

export default function MusicSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useMusicPlayer();

  const toggle = (key: keyof MusicSettings) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary">Music Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Autoplay Next */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-600" />
              <div>
                <Label className="text-sm font-medium">Autoplay Next</Label>
                <p className="text-xs text-muted-foreground">Auto-advance via recommendations when no queue is set</p>
              </div>
            </div>
            <Switch
              checked={settings.autoplayNext}
              onCheckedChange={() => toggle("autoplayNext")}
              data-testid="settings-autoplay-toggle"
            />
          </div>

          {/* Remember Position */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <Label className="text-sm font-medium">Remember Position</Label>
                <p className="text-xs text-muted-foreground">Resume from where you left off</p>
              </div>
            </div>
            <Switch
              checked={settings.rememberPosition}
              onCheckedChange={() => toggle("rememberPosition")}
              data-testid="settings-position-toggle"
            />
          </div>

          {/* Playback Speed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Playback Speed</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SPEED_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={settings.defaultSpeed === opt.value ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => updateSettings({ defaultSpeed: opt.value })}
                  data-testid={`settings-speed-${opt.value}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Playback Mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Playback Mode</Label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {REPEAT_MODES.map((mode) => (
                <Button
                  key={mode.value}
                  size="sm"
                  variant={settings.repeatMode === mode.value ? "default" : "outline"}
                  className="h-8 px-2.5 text-xs gap-1.5 justify-start"
                  onClick={() => updateSettings({ repeatMode: mode.value })}
                  data-testid={`settings-repeat-${mode.value}`}
                >
                  {mode.icon}
                  {mode.label}
                </Button>
              ))}
            </div>
            {(settings.repeatMode === "play-all" || settings.repeatMode === "all") && (
              <p className="text-[11px] text-muted-foreground px-0.5">
                {settings.repeatMode === "play-all"
                  ? "Plays through the queue once then stops. Use the Play All button on the Music page to build a queue."
                  : "Loops the queue continuously. Use the Play All button on the Music page to build a queue."}
              </p>
            )}
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Shuffle</Label>
                <p className="text-xs text-muted-foreground">Randomize play order within the queue</p>
              </div>
            </div>
            <Switch
              checked={settings.shuffle}
              onCheckedChange={() => toggle("shuffle")}
              data-testid="settings-shuffle-toggle"
            />
          </div>

          {/* Download on Wi-Fi (coming soon) */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Download on Wi-Fi Only</Label>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <Switch checked={false} disabled data-testid="settings-wifi-toggle" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
