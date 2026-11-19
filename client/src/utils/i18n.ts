import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import yo from "@/locales/yo.json";
import pcm from "@/locales/pcm.json";
import ha from "@/locales/ha.json";

export type LocaleKeys = keyof typeof en;
export const APP_LANGUAGE_CODES = ["en", "es", "fr", "yo", "pcm", "ha"] as const;
export type AppLanguage = typeof APP_LANGUAGE_CODES[number];
const locales: Record<string, Record<string, string>> = { en, es, fr, yo, pcm, ha };

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && APP_LANGUAGE_CODES.includes(value as AppLanguage);
}

export function getUIText(key: LocaleKeys, lang?: string): string {
  return (isAppLanguage(lang) ? locales[lang][key] : undefined) || en[key] || key;
}

export function getCurrentLang(): AppLanguage {
  if (typeof window === "undefined") return "en";
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (isAppLanguage(urlLang)) return urlLang;
  try {
    const stored = localStorage.getItem("devotionalLang");
    if (isAppLanguage(stored)) return stored;
  } catch { /* Storage can be unavailable in private browsers. */ }
  return "en";
}

export function applyAppLanguage(lang: AppLanguage) {
  if (!isAppLanguage(lang)) return;
  try { localStorage.setItem("devotionalLang", lang); } catch {}
  const url = new URL(window.location.href);
  if (lang === "en") url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  try {
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {}
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event("app-languagechange"));
}
