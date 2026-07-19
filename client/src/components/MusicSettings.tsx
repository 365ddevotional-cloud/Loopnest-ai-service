import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMusicPlayer, type MusicSettings } from "@/contexts/MusicPlayerContext";
import { Repeat, Shuffle, Zap, MapPin, Wifi, ChevronDown } from "lucide-react";

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
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
                <p className="text-xs text-muted-foreground">Play the next recommended song automatically</p>
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

          {/* Repeat Mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Repeat</Label>
            </div>
            <div className="flex gap-1.5">
              {(["none", "one", "all"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={settings.repeatMode === mode ? "default" : "outline"}
                  className="h-7 px-3 text-xs flex-1"
                  onClick={() => updateSettings({ repeatMode: mode })}
                  data-testid={`settings-repeat-${mode}`}
                >
                  {mode === "none" ? "Off" : mode === "one" ? "Repeat One" : "Repeat All"}
                </Button>
              ))}
            </div>
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Shuffle</Label>
                <p className="text-xs text-muted-foreground">Randomize play order</p>
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
