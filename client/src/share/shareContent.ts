/** Keep quick shares small; full devotional text is an explicit, separate action. */
export function sharePayload(title: string, text: string, url?: string): ShareData {
  return url ? { title, text: title, url } : { title, text };
}

export function shareMessage(data: ShareData): string {
  return [data.text, data.url].filter(Boolean).join("\n\n");
}

export function devotionalShareUrl(date: string, search = ""): string {
  const url = new URL(`/devotional/${encodeURIComponent(date)}`, "https://365dailydevotional.com");
  const language = new URLSearchParams(search).get("lang");
  if (language) url.searchParams.set("lang", language);
  return url.href;
}
