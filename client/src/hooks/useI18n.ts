import { useState, useEffect, useCallback } from "react";
import { getUIText, getCurrentLang } from "@/utils/i18n";

export function useI18n() {
  const [lang, setLang] = useState(getCurrentLang);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "devotionalLang") {
        setLang(getCurrentLang());
      }
    };

    const handleLangChange = () => {
      setLang(getCurrentLang());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("languagechange", handleLangChange);
    window.addEventListener("popstate", handleLangChange);

    const interval = setInterval(() => {
      const newLang = getCurrentLang();
      if (newLang !== lang) {
        setLang(newLang);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("languagechange", handleLangChange);
      window.removeEventListener("popstate", handleLangChange);
      clearInterval(interval);
    };
  }, [lang]);

  const t = useCallback(
    (key: Parameters<typeof getUIText>[0]) => getUIText(key, lang),
    [lang]
  );

  return { t, lang };
}
