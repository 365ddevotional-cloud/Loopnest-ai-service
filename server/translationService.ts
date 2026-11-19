import { db } from "./db";
import { devotionalTranslations } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { createSavedTranslationReader, isAllowedLanguage } from "./saved-translation-reader";
export { isAllowedLanguage, translationPolicy } from "./saved-translation-reader";

// Reader requests only retrieve stored text. No model client, paid generation,
// automatic retry or environment-variable override exists in this path.
export async function getCachedTranslationsForLanguage(lang: string) {
  if (!isAllowedLanguage(lang) || lang === "en") return [];
  return db.select().from(devotionalTranslations).where(eq(devotionalTranslations.languageCode, lang));
}

// Keep existing callers compatible; this function no longer creates content.
export const getOrCreateTranslation = createSavedTranslationReader(async (id, lang) => {
  const [existing] = await db.select().from(devotionalTranslations)
    .where(and(eq(devotionalTranslations.devotionalId, id), eq(devotionalTranslations.languageCode, lang)))
    .limit(1);
  return existing ?? null;
});
