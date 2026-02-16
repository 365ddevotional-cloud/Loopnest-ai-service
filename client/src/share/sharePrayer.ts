export interface SharePrayerOptions {
  verseText: string;
  reference: string;
  translation: string;
}

const PRAYER_PATTERNS: Array<{ match: RegExp; transform: (verse: string, groups: RegExpMatchArray) => string }> = [
  {
    match: /^(the lord is|god is)\s+(.+)/i,
    transform: (_, g) => `Lord, I thank You because You are ${g[2]}.`,
  },
  {
    match: /^(for god so loved|for the lord loved)/i,
    transform: (v) => `Father, I am grateful for Your immeasurable love. ${v.replace(/^for /i, "Because ")} I receive this love today.`,
  },
  {
    match: /^(let there be|let the|let us|let)\s+(.+)/i,
    transform: (_, g) => `Lord, I pray that You would ${g[2].replace(/\.$/, "")}. Bring this to pass in my life.`,
  },
  {
    match: /^(do not|fear not|be not)\s+(.+)/i,
    transform: (_, g) => `Lord, help me to not ${g[2].replace(/\.$/, "")}. Give me the strength and faith to trust You.`,
  },
  {
    match: /^(blessed (is|are|be))\s+(.+)/i,
    transform: (_, g) => `Lord, I ask for Your blessing. Make me among ${g[3].replace(/\.$/, "")}. I receive this blessing today.`,
  },
  {
    match: /^(i am|i have|i will|i can)\s+(.+)/i,
    transform: (_, g) => `Lord, I declare that I ${g[0].toLowerCase().replace(/\.$/, "")}. Strengthen this truth in my heart.`,
  },
  {
    match: /^(he (shall|will|has))\s+(.+)/i,
    transform: (_, g) => `Father, I trust that You shall ${g[3].replace(/\.$/, "")}. I stand on this promise today.`,
  },
  {
    match: /^(trust in|believe in|hope in)\s+(.+)/i,
    transform: (_, g) => `Lord, I choose to ${g[0].toLowerCase().replace(/\.$/, "")}. Increase my faith and trust in You.`,
  },
  {
    match: /^(come|arise|seek|ask|knock)\b/i,
    transform: (v) => `Lord, as Your Word says: "${v.replace(/\.$/, "")}" \u2014 I respond in obedience. Lead me as I follow.`,
  },
  {
    match: /(peace|joy|love|grace|mercy|strength|wisdom|faith|hope)/i,
    transform: (v, g) => `Lord, I thank You for the promise of ${g[1].toLowerCase()}. "${v.replace(/\.$/, "")}" \u2014 pour this into my life today.`,
  },
];

function transformVerseToPrayer(verseText: string): string {
  const cleaned = verseText.trim().replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, "");

  for (const pattern of PRAYER_PATTERNS) {
    const match = cleaned.match(pattern.match);
    if (match) {
      return pattern.transform(cleaned, match);
    }
  }

  const sentences = cleaned.split(/[.;]/).filter(s => s.trim());
  if (sentences.length > 1) {
    return `Lord, I meditate on Your Word: "${sentences[0].trim()}." Let this truth transform my heart and mind. I receive it by faith today.`;
  }

  return `Heavenly Father, I hold onto Your Word that says: "${cleaned}" I ask that You make this real in my life. Strengthen my faith as I stand on this promise. In Jesus' name, Amen.`;
}

export function generatePrayerVersion({ verseText, reference, translation }: SharePrayerOptions): string {
  const prayer = transformVerseToPrayer(verseText);
  return `${prayer}\n\n(Based on ${reference}, ${translation})\n\nShared from 365 Daily Devotional`;
}

export async function shareAsPrayer(opts: SharePrayerOptions): Promise<{ success: boolean; method: "share" | "clipboard" }> {
  const text = generatePrayerVersion(opts);

  if (navigator.share) {
    try {
      await navigator.share({ title: `Prayer from ${opts.reference}`, text });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  await navigator.clipboard.writeText(text);
  return { success: true, method: "clipboard" };
}
