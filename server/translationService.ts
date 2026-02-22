import OpenAI from "openai";
import { db } from "./db";
import { devotionalTranslations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

const ALLOWED_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  yo: "Yoruba",
  pcm: "Nigerian Pidgin",
  ha: "Hausa",
};

const rateLimiter = {
  timestamps: [] as number[],
  maxPerMinute: 3,
  canProceed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60000);
    return this.timestamps.length < this.maxPerMinute;
  },
  record(): void {
    this.timestamps.push(Date.now());
  },
};

const inFlightTranslations = new Map<string, Promise<any>>();
const titleCache = new Map<string, string>();

export function isAllowedLanguage(lang: string): boolean {
  return lang in ALLOWED_LANGUAGES;
}

export async function getCachedTranslationsForLanguage(lang: string) {
  return db
    .select()
    .from(devotionalTranslations)
    .where(eq(devotionalTranslations.languageCode, lang));
}

export async function getOrCreateTranslation(devotional: any, lang: string) {
  if (!lang || lang === "en" || !isAllowedLanguage(lang)) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(devotionalTranslations)
    .where(
      and(
        eq(devotionalTranslations.devotionalId, devotional.id),
        eq(devotionalTranslations.languageCode, lang)
      )
    )
    .limit(1);

  if (existing) {
    console.log(`[Translation] Serving cached ${lang} translation for devotional #${devotional.id}`);
    const titleCacheKey = `${devotional.id}:${lang}`;
    const cachedTitle = titleCache.get(titleCacheKey);
    if (cachedTitle) {
      return { ...existing, _translatedTitle: cachedTitle };
    }
    return existing;
  }

  const key = `${devotional.id}:${lang}`;
  if (inFlightTranslations.has(key)) {
    console.log(`[Translation] Waiting for in-flight ${lang} translation of devotional #${devotional.id}`);
    return inFlightTranslations.get(key);
  }

  if (!rateLimiter.canProceed()) {
    console.log(`[Translation] Rate limit reached, returning English for devotional #${devotional.id}`);
    return null;
  }

  const translationPromise = generateAndSaveTranslation(devotional, lang, key);
  inFlightTranslations.set(key, translationPromise);

  try {
    return await translationPromise;
  } finally {
    inFlightTranslations.delete(key);
  }
}

async function generateAndSaveTranslation(devotional: any, lang: string, _key: string) {
  const langName = ALLOWED_LANGUAGES[lang];
  console.log(`[Translation] Generating ${langName} (${lang}) translation for devotional #${devotional.id} via OpenAI`);
  rateLimiter.record();

  try {
    const prompt = buildTranslationPrompt(devotional, langName);

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional Christian devotional translator. Translate content faithfully into ${langName}. Preserve all theological meaning, spiritual tone, and formatting structure. Return ONLY valid JSON with no markdown formatting.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const translatedTitle = parsed.title || devotional.title;
    const prayerPoints = ensureArray(parsed.prayerPoints, 7);
    const faithDeclarations = ensureArray(parsed.faithDeclarations, 5);
    const christianQuotes = parsed.christianQuotes || devotional.christianQuotes;
    const propheticDeclaration = parsed.propheticDeclaration || devotional.propheticDeclaration;
    const devotionalMessage = parsed.devotionalMessage || devotional.content;
    const scriptureTextTranslated = parsed.scriptureText || null;

    const titleCacheKey = `${devotional.id}:${lang}`;
    titleCache.set(titleCacheKey, translatedTitle);

    const [saved] = await db
      .insert(devotionalTranslations)
      .values({
        devotionalId: devotional.id,
        languageCode: lang,
        devotionalMessage,
        prayerPoints,
        faithDeclarations,
        christianQuotes,
        propheticDeclaration,
        scriptureTextTranslated,
      })
      .onConflictDoNothing()
      .returning();

    if (saved) {
      console.log(`[Translation] Saved ${langName} translation for devotional #${devotional.id}`);
      return { ...saved, _translatedTitle: translatedTitle };
    }

    const [refetch] = await db
      .select()
      .from(devotionalTranslations)
      .where(
        and(
          eq(devotionalTranslations.devotionalId, devotional.id),
          eq(devotionalTranslations.languageCode, lang)
        )
      )
      .limit(1);
    if (refetch) {
      return { ...refetch, _translatedTitle: translatedTitle };
    }
    return null;
  } catch (error) {
    console.error(`[Translation] Failed to generate ${langName} translation for devotional #${devotional.id}:`, error);
    return null;
  }
}

function buildTranslationPrompt(devotional: any, langName: string): string {
  const prayerPointsText = Array.isArray(devotional.prayerPoints)
    ? devotional.prayerPoints.join("\n")
    : devotional.prayerPoints || "";

  const faithDeclarationsText = Array.isArray(devotional.faithDeclarations)
    ? devotional.faithDeclarations.join("\n")
    : devotional.faithDeclarations || "";

  return `Translate ALL of the following Christian devotional content into ${langName}, including the title/topic.

SCRIPTURE REFERENCE: "${devotional.scriptureReference}"

CONTENT TO TRANSLATE:

1. TITLE/TOPIC (translate this short title):
${devotional.title}

2. DEVOTIONAL MESSAGE (translate into minimum 3 full paragraphs):
${devotional.content}

3. PRAYER POINTS (translate EXACTLY 7, one per line):
${prayerPointsText}

4. FAITH DECLARATIONS (translate EXACTLY 5, one per line):
${faithDeclarationsText}

5. CHRISTIAN QUOTES (translate EXACTLY 2, one per line):
${devotional.christianQuotes || "N/A"}

6. PROPHETIC DECLARATION (translate as 1 strong full paragraph):
${devotional.propheticDeclaration || "N/A"}

7. SCRIPTURE TEXT (translate the scripture verse):
${devotional.scriptureText}

Return a JSON object with these exact keys:
{
  "title": "translated title/topic",
  "devotionalMessage": "translated message (min 3 paragraphs)",
  "prayerPoints": ["point1", "point2", "point3", "point4", "point5", "point6", "point7"],
  "faithDeclarations": ["decl1", "decl2", "decl3", "decl4", "decl5"],
  "christianQuotes": "translated quotes (2, newline separated)",
  "propheticDeclaration": "translated prophetic declaration",
  "scriptureText": "translated scripture text"
}`;
}

function ensureArray(val: any, expectedLength: number): string[] {
  if (!Array.isArray(val)) return [];
  const result = val.map((v: any) => String(v).trim()).filter((v: string) => v.length > 0);
  return result.length >= expectedLength ? result.slice(0, expectedLength) : result;
}
