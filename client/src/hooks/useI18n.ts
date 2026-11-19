import { useState, useEffect, useCallback } from "react";
import { getUIText, getCurrentLang, isAppLanguage, type LocaleKeys } from "@/utils/i18n";

export function useI18n() {
  const [lang, setLang] = useState(getCurrentLang);
  useEffect(() => {
    const update = () => {
      const next = getCurrentLang();
      setLang(next);
      document.documentElement.lang = next;
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== "devotionalLang" && event.key !== null) return;
      // A changed saved preference wins over this tab's stale query parameter.
      try {
        const saved = localStorage.getItem("devotionalLang");
        const value = isAppLanguage(saved) ? saved : "en";
        const url = new URL(window.location.href);
        if (value === "en") url.searchParams.delete("lang");
        else url.searchParams.set("lang", value);
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      } catch {}
      update();
    };
    update();
    window.addEventListener("app-languagechange", update);
    window.addEventListener("storage", storage);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("app-languagechange", update);
      window.removeEventListener("storage", storage);
      window.removeEventListener("popstate", update);
    };
  }, []);
  const t = useCallback((key: LocaleKeys) => getUIText(key, lang), [lang]);
  return { t, lang };
}
