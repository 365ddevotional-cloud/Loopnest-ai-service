export interface ShareTextOptions {
  verseText: string;
  reference: string;
  translation: string;
}

export async function shareAsText({ verseText, reference, translation }: ShareTextOptions): Promise<{ success: boolean; method: "share" | "clipboard" }> {
  const text = `"${verseText}"\n\n— ${reference} (${translation})\n\nShared from 365 Daily Devotional`;

  if (navigator.share) {
    try {
      await navigator.share({ title: reference, text });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  await navigator.clipboard.writeText(text);
  return { success: true, method: "clipboard" };
}
