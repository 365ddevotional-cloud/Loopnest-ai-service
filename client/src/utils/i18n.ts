import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import yo from "@/locales/yo.json";
import pcm from "@/locales/pcm.json";
import ha from "@/locales/ha.json";

type LocaleKeys = keyof typeof en;

const locales: Record<string, Record<string, string>> = {
  en,
  es,
  fr,
  yo,
  pcm,
  ha,
};

export function getUIText(key: LocaleKeys, lang?: string): string {
  const language = lang || "en";
  const locale = locales[language];
  if (locale && locale[key]) {
    return locale[key];
  }
  return en[key] || key;
}

export function getCurrentLang(): string {
  if (typeof window === "undefined") return "en";
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");
  if (urlLang && locales[urlLang]) return urlLang;
  const storedLang = localStorage.getItem("devotionalLang");
  if (storedLang && locales[storedLang]) return storedLang;
  return "en";
}
