import { useI18n } from "@/hooks/useI18n";
import { applyAppLanguage, getCurrentLang, type AppLanguage } from "@/utils/i18n";
import { useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "yo", label: "Èdè Yorùbá" },
  { code: "pcm", label: "Naijá Pidgin" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
] as const;

export function useLanguageAutoApply() {
  useEffect(()=>{applyAppLanguage(getCurrentLang());},[]);
}

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

function getLangLabel(code: string): string {
  return LANGUAGES.find(l => l.code === code)?.label || "English";
}

export function LanguageSwitcher() {
  const {t,lang:currentLang}=useI18n();

  const handleSelect = (code: string) => {
    applyAppLanguage(code as AppLanguage);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(currentLang !== "en" && "text-primary")}
          title={t("ui_language")} aria-label={t("ui_language")}
          data-testid="button-language-switcher"
        >
          <GlobeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-center font-semibold">
          {t("ui_language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={currentLang === lang.code ? "bg-primary/10" : ""}
            data-testid={`button-lang-${lang.code}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={currentLang === lang.code ? "font-semibold text-primary" : "font-medium"}>
                {lang.label}
              </span>
              {currentLang === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileLanguageSwitcher() {
  const {t,lang:currentLang}=useI18n();

  const handleSelect = (code: string) => {
    applyAppLanguage(code as AppLanguage);
  };

  return (
    <div className="mt-4 border-t border-primary/10 pt-4">
      <div className="px-4 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{t("ui_language")}</span>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 text-left",
              currentLang === lang.code
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            )}
            data-testid={`button-lang-mobile-${lang.code}`}
          >
            <GlobeIcon />
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
