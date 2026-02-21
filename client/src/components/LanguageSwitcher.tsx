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
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "yo", label: "Yoruba" },
  { code: "pcm", label: "Pidgin" },
  { code: "ha", label: "Hausa" },
] as const;

const STORAGE_KEY = "devotionalLang";

function getStoredLang(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

function setStoredLang(code: string) {
  try {
    if (code === "en") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, code);
    }
  } catch {}
}

function getCurrentLangFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang");
}

function navigateWithLang(code: string) {
  const url = new URL(window.location.href);
  if (code === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", code);
  }
  window.location.href = url.toString();
}

export function useLanguageAutoApply() {
  useEffect(() => {
    const stored = getStoredLang();
    const urlLang = getCurrentLangFromUrl();
    if (stored !== "en" && !urlLang) {
      navigateWithLang(stored);
    }
  }, []);
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
  const currentLang = getCurrentLangFromUrl() || getStoredLang();

  const handleSelect = (code: string) => {
    setStoredLang(code);
    if (code !== currentLang) {
      navigateWithLang(code);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(currentLang !== "en" && "text-primary")}
          title="Language"
          data-testid="button-language-switcher"
        >
          <GlobeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-center font-semibold">
          Language
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
  const currentLang = getCurrentLangFromUrl() || getStoredLang();

  const handleSelect = (code: string) => {
    setStoredLang(code);
    if (code !== currentLang) {
      navigateWithLang(code);
    }
  };

  return (
    <div className="mt-4 border-t border-primary/10 pt-4">
      <div className="px-4 pb-2">
        <span className="text-sm font-medium text-muted-foreground">Language</span>
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
