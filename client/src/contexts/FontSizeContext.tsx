import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type FontSizeLevel = "small" | "medium" | "large" | "extra-large";

interface FontSizeContextType {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  fontSizeClass: string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const STORAGE_KEY = "devotional-font-size";

const fontSizeClasses: Record<FontSizeLevel, string> = {
  "small": "text-sm",
  "medium": "text-base",
  "large": "text-lg",
  "extra-large": "text-xl",
};

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ["small", "medium", "large", "extra-large"].includes(saved)) {
        return saved as FontSizeLevel;
      }
    }
    return "medium";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSizeLevel) => {
    setFontSizeState(size);
  };

  const fontSizeClass = fontSizeClasses[fontSize];

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, fontSizeClass }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
}
