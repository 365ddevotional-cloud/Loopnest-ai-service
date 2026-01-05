import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { BibleTranslation } from "@shared/schema";

const STORAGE_KEY = "devotional.preferredTranslation";
const DEFAULT_TRANSLATION: BibleTranslation = "KJV";

interface TranslationContextType {
  translation: BibleTranslation;
  setTranslation: (translation: BibleTranslation) => void;
  translationLabel: string;
}

const TRANSLATION_LABELS: Record<BibleTranslation, string> = {
  KJV: "King James Version",
  WEB: "World English Bible",
  ASV: "American Standard Version",
  DRB: "Douay-Rheims Bible",
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translation, setTranslationState] = useState<BibleTranslation>(() => {
    if (typeof window === "undefined") return DEFAULT_TRANSLATION;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["KJV", "WEB", "ASV", "DRB"].includes(stored)) {
      return stored as BibleTranslation;
    }
    return DEFAULT_TRANSLATION;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, translation);
  }, [translation]);

  const setTranslation = (newTranslation: BibleTranslation) => {
    setTranslationState(newTranslation);
  };

  const translationLabel = TRANSLATION_LABELS[translation];

  return (
    <TranslationContext.Provider value={{ translation, setTranslation, translationLabel }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}

export { TRANSLATION_LABELS };
