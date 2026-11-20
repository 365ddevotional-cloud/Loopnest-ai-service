import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import { GooglePlayReviewLink } from "@/components/GooglePlayReviewLink";
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
  getAvailableReaderVoices,
  saveVoicePreference,
  clearVoicePreference,
  getPreferredReaderVoice,
  getSavedVoicePreference,
  useAudioReader,
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
  { value: "system" as const, label: "Follow device", icon: Monitor },
];

const readerLanguages=[['en','English'],['es','Español'],['fr','Français'],['yo','Èdè Yorùbá'],['pcm','Naijá Pidgin'],['ha','Hausa'],['ig','Igbo']] as const;
const voiceSamples:Record<string,string>={
  en:'The Lord is my shepherd, I shall not want.',
  es:'Bienvenido. Escucha el devocional de hoy.',
  fr:"Bienvenue. Écoutez la méditation d’aujourd’hui.",
  yo:'Ẹ káàbọ̀. Ẹ gbọ́ ìfọkànsìn ojoojúmọ́ wa.',
  pcm:'Welcome. Make we listen to today devotional.',
  ha:'Barka da zuwa. Ku saurari karatun ibada na yau.',
  ig:'Nnọọ. Geenụ ntị n’ofufe anyị nke taa.',
};

export function MobileSettingsSection() {
  useI18n();
  const { fontSize, setFontSize } = useFontSize();
  const { theme, setTheme } = useTheme();
  
  return (
    <>
      <div className="mt-4 border-t border-primary/10 px-4 pt-4">
        <SettingsModal voiceOnly />
      </div>
      <div className="mt-4 border-t border-primary/10 px-4 pt-4">
        <GooglePlayReviewLink />
      </div>
      <div className="mt-4 border-t border-primary/10 pt-4">
        <div className="px-4 pb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Moon className="w-4 h-4" /> {tx("Theme")} </span>
        </div>
        <div className="flex flex-col gap-1 px-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              aria-pressed={theme === opt.value}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
                theme === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
              data-testid={`button-theme-mobile-${opt.value}`}
            >
              <opt.icon className="w-4 h-4" />
              {tx(opt.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 border-t border-primary/10 pt-4">
        <div className="px-4 pb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Type className="w-4 h-4" /> {tx("Text Size")} </span>
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
              )}> {tx("Aa")} </span>
              {tx(fontSizeLabels[level])}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function SettingsModal({voiceOnly=false}:{voiceOnly?:boolean}) {
  const {t,lang}=useI18n();
  const audio=useAudioReader();
  const { fontSize, setFontSize } = useFontSize();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("auto");
  const [voiceLanguage,setVoiceLanguage]=useState<string>(lang);

  const currentIndex = fontSizeLevels.indexOf(fontSize);

  useEffect(()=>{if(open)setVoiceLanguage(lang);},[open,lang]);
  const loadVoiceList = () => {
    const available=getAvailableReaderVoices(voiceLanguage);
    setVoices(available);
    const saved=getSavedVoicePreference(voiceLanguage);
    setSelectedVoice(saved && available.some(v=>v.voiceURI===saved)?saved:'auto');
  };
  useEffect(() => {
    if (!open) return;
    loadVoiceList();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoiceList);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoiceList);
      };
    }
  }, [open,voiceLanguage]);

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    if (value === "auto") {
      clearVoicePreference(voiceLanguage);
    } else {
      saveVoicePreference(value,voiceLanguage);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newIndex = value[0];
    if (newIndex >= 0 && newIndex < fontSizeLevels.length) {
      setFontSize(fontSizeLevels[newIndex]);
    }
  };

  const previewVoice = () => {
    audio.play(voiceSamples[voiceLanguage] || voiceSamples.en,tx('Audio Voice'),{language:voiceLanguage});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={voiceOnly?'outline':'ghost'}
          size={voiceOnly?'sm':'icon'}
          className={voiceOnly?'w-full justify-start gap-2':'text-muted-foreground hover:text-primary'}
          title={tx(voiceOnly?'Audio Voice':"Settings - Adjust text size")}
          data-testid={voiceOnly?'button-voice-settings-mobile':'button-settings'}
        >
          <Settings className="w-5 h-5" />
          {voiceOnly && tx('Audio Voice')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <Settings className="w-5 h-5" /> {tx(voiceOnly?'Audio Voice':"Settings")} </DialogTitle>
          <DialogDescription> {tx("Customize your reading experience")} </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!voiceOnly && <>
          <GooglePlayReviewLink />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              <h3 className="font-medium">{tx("Text Size")}</h3>
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
                    {tx(fontSizeLabels[level])}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-muted-foreground text-xs mb-2">{tx("Preview:")}</p>
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
              <h3 className="font-medium">{tx("Theme")}</h3>
            </div>
            
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    theme === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                  )}
                  data-testid={`button-theme-${opt.value}`}
                >
                  <opt.icon className="w-4 h-4" />
                  {tx(opt.label)}
                </button>
              ))}
            </div>
          </div>

          </>}
          <div className={voiceOnly?'space-y-4':'border-t pt-6 space-y-4'}>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <h3 className="font-medium">{tx("Audio Voice")}</h3>
            </div>
            <p className="text-xs text-muted-foreground"> {tx("Choose a voice for the Listen feature. Available voices depend on your browser and device.")} </p>
            <p className="text-xs text-muted-foreground">{t('ui_freeDeviceVoices')}</p>
            <label className="block text-sm">{t('ui_voiceLanguage')}
              <select value={voiceLanguage} onChange={e=>{audio.stop();setVoiceLanguage(e.target.value);}} className="mt-1 w-full rounded border bg-background p-2" data-testid="select-voice-language">
                {readerLanguages.map(([code,name])=><option key={code} value={code}>{name}</option>)}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger className="flex-1 min-w-0" data-testid="select-voice">
                  <SelectValue placeholder={tx("Auto (Best Available)")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" data-testid="voice-option-auto"> {tx("Auto (Best Available)")} </SelectItem>
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
                disabled={voices.length===0}
                data-testid="button-preview-voice"
              > {tx("Test")} </Button>
            </div>
            {voices.length===0 ? <p role="status" className="text-sm" data-testid="voice-unavailable-message">{t('ui_noDeviceVoice')}</p>
              : <p className="text-xs text-muted-foreground" data-testid="voice-current-selection">{t('ui_voiceSelected')}: {selectedVoice==='auto'?getPreferredReaderVoice(voiceLanguage)?.name:voices.find(v=>v.voiceURI===selectedVoice)?.name}</p>}
            {voiceLanguage==='pcm' && voices.length>0 && !voices.some(v=>v.lang.toLowerCase().startsWith('pcm')) && <p className="text-xs text-muted-foreground">{t('ui_pidginDeviceVoice')}</p>}
            <Button variant="outline" size="sm" onClick={loadVoiceList} data-testid="button-refresh-voices">{t('ui_refreshVoices')}</Button>
            {audio.error && <p role="alert" className="text-sm">{audio.errorCode==='voice-unavailable'?t('ui_noDeviceVoice'):t('ui_audioDidNotStart')}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
