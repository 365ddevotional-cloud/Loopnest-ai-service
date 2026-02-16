import { Settings, Type, Moon, Sun, Monitor, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFontSize, type FontSizeLevel } from "@/contexts/FontSizeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import {
  getAvailableEnglishVoices,
  saveVoicePreference,
  clearVoicePreference,
} from "@/hooks/useAudioReader";

const fontSizeLevels: FontSizeLevel[] = ["small", "medium", "large", "extra-large"];
const fontSizeLabels: Record<FontSizeLevel, string> = {
  "small": "Small",
  "medium": "Medium",
  "large": "Large",
  "extra-large": "Extra Large",
};

const themeOptions = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

const VOICE_STORAGE_KEY = "audio-reader-voice";

export function MobileSettingsSection() {
  const { fontSize, setFontSize } = useFontSize();
  const { theme, setTheme } = useTheme();
  
  return (
    <>
      <div className="mt-4 border-t border-primary/10 pt-4">
        <div className="px-4 pb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Theme
          </span>
        </div>
        <div className="flex flex-col gap-1 px-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
                theme === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
              data-testid={`button-theme-mobile-${opt.value}`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 border-t border-primary/10 pt-4">
        <div className="px-4 pb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Type className="w-4 h-4" />
            Text Size
          </span>
        </div>
        <div className="flex flex-col gap-1 px-2">
          {fontSizeLevels.map((level) => (
            <button
              key={level}
              onClick={() => setFontSize(level)}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
                fontSize === level
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
              data-testid={`button-fontsize-mobile-${level}`}
            >
              <span className={cn(
                level === "small" ? "text-sm" :
                level === "medium" ? "text-base" :
                level === "large" ? "text-lg" :
                "text-xl"
              )}>
                Aa
              </span>
              {fontSizeLabels[level]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function SettingsModal() {
  const { fontSize, setFontSize } = useFontSize();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("auto");

  const currentIndex = fontSizeLevels.indexOf(fontSize);

  useEffect(() => {
    if (!open) return;
    const loadVoiceList = () => {
      const available = getAvailableEnglishVoices();
      setVoices(available);
      try {
        const saved = localStorage.getItem(VOICE_STORAGE_KEY);
        if (saved && available.some((v) => v.voiceURI === saved)) {
          setSelectedVoice(saved);
        } else {
          setSelectedVoice("auto");
        }
      } catch {
        setSelectedVoice("auto");
      }
    };
    loadVoiceList();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoiceList);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoiceList);
      };
    }
  }, [open]);

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    if (value === "auto") {
      clearVoicePreference();
    } else {
      saveVoicePreference(value);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newIndex = value[0];
    if (newIndex >= 0 && newIndex < fontSizeLevels.length) {
      setFontSize(fontSizeLevels[newIndex]);
    }
  };

  const previewVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "The Lord is my shepherd, I shall not want."
    );
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (selectedVoice !== "auto") {
      const voice = voices.find((v) => v.voiceURI === selectedVoice);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-primary"
          title="Settings - Adjust text size"
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Customize your reading experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Text Size</h3>
            </div>
            
            <div className="space-y-3">
              <Slider
                value={[currentIndex]}
                onValueChange={handleSliderChange}
                min={0}
                max={3}
                step={1}
                className="w-full"
                data-testid="slider-font-size"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                {fontSizeLevels.map((level) => (
                  <span 
                    key={level}
                    className={fontSize === level ? "text-primary font-medium" : ""}
                  >
                    {fontSizeLabels[level]}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-muted-foreground text-xs mb-2">Preview:</p>
              <p className={`leading-relaxed ${
                fontSize === "small" ? "text-sm" :
                fontSize === "medium" ? "text-base" :
                fontSize === "large" ? "text-lg" :
                "text-xl"
              }`}>
                "For I know the plans I have for you," declares the Lord.
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Theme</h3>
            </div>
            
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    theme === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                  )}
                  data-testid={`button-theme-${opt.value}`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Audio Voice</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a voice for the Listen feature. Available voices depend on your browser and device.
            </p>

            <div className="flex items-center gap-2">
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger className="flex-1" data-testid="select-voice">
                  <SelectValue placeholder="Auto (Best Available)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" data-testid="voice-option-auto">
                    Auto (Best Available)
                  </SelectItem>
                  {voices.map((v, idx) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI} data-testid={`voice-option-${idx}`}>
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={previewVoice}
                data-testid="button-preview-voice"
              >
                Test
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
