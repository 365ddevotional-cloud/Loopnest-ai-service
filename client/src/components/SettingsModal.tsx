import { Settings, Type, Moon, Bell, Globe } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useFontSize, type FontSizeLevel } from "@/contexts/FontSizeContext";
import { useState } from "react";

const fontSizeLevels: FontSizeLevel[] = ["small", "medium", "large", "extra-large"];
const fontSizeLabels: Record<FontSizeLevel, string> = {
  "small": "Small",
  "medium": "Medium",
  "large": "Large",
  "extra-large": "Extra Large",
};

export function MobileSettingsSection() {
  const { fontSize, setFontSize } = useFontSize();
  
  return (
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
  );
}

export function SettingsModal() {
  const { fontSize, setFontSize } = useFontSize();
  const [open, setOpen] = useState(false);

  const currentIndex = fontSizeLevels.indexOf(fontSize);

  const handleSliderChange = (value: number[]) => {
    const newIndex = value[0];
    if (newIndex >= 0 && newIndex < fontSizeLevels.length) {
      setFontSize(fontSizeLevels[newIndex]);
    }
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
          {/* Text Size Section */}
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

            {/* Preview */}
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

          {/* Future Settings Placeholders */}
          <div className="border-t pt-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Coming Soon</p>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg opacity-60">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Theme (Light / Dark)</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Soon</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg opacity-60">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Notifications</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Soon</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg opacity-60">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Language</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Soon</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
