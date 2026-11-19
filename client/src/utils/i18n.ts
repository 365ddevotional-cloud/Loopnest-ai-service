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

// Exact interface phrases only: never pass user messages, book text, IDs or prices.
const uiKeysByEnglish = new Map<string, LocaleKeys>();
for (const [key, value] of Object.entries(en)) {
  if (!uiKeysByEnglish.has(value)) uiKeysByEnglish.set(value, key as LocaleKeys);
}
export function translateAppText(source: string, values: Record<string, string | number> = {}, lang = getCurrentLang()): string {
  const key = uiKeysByEnglish.get(source);
  const text = key ? getUIText(key, lang) : source;
  return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

// Localize only recognized account-service messages. Keep diagnostic codes intact.
export function translateAccountError(message: string): string {
  const reset = /^Could not send reset email \(([^)]+)\)\. Please try again\.$/.exec(message);
  if (reset) return `${translateAppText("Could not send reset email. Please try again.")} (${reset[1]})`;
  const domain = /^Email delivery unavailable on this domain \(([^)]+)\)\. Try on the production site\.$/.exec(message);
  if (domain) return `${translateAppText("Email delivery unavailable on this domain. Try on the production site.")} (${domain[1]})`;
  const send = /^Could not send email \(([^)]+)\)\. Please try again\.$/.exec(message);
  if (send) return `${translateAppText("Could not send email. Please try again.")} (${send[1]})`;
  return translateAppText(message);
}

const enumDisplayLabels: Record<string,string> = {
  owner:"Church Owner", lead_pastor:"Lead Pastor", administrator:"Administrator",
  associate_pastor:"Associate Pastor", ministry_leader:"Ministry Leader", group_leader:"Group Leader",
  counselor:"Counselor", prayer_team:"Prayer Team", moderator:"Moderator", member:"Member",
  private:"Private", anonymous:"Anonymous Public", public:"Public",
  new:"New", open:"Open", replied:"Replied", answered:"Answered", closed:"Closed",
  prayer:"Prayer", counseling:"Counseling", healing:"Healing", marriage:"Marriage",
  finance:"Finance", deliverance:"Deliverance", guidance:"Guidance", family:"Family",
  salvation:"Salvation", other:"Other",
};
export function translateEnumLabel(value: string): string {
  return translateAppText(enumDisplayLabels[value] ?? value);
}
