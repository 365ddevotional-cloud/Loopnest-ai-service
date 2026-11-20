export const APP_LANGUAGES = {
  en: "English", es: "Spanish", fr: "French", yo: "Yoruba", pcm: "Nigerian Pidgin", ha: "Hausa", ig: "Igbo",
} as const;

// No spending has been approved for new content translations.
export const translationPolicy = Object.freeze({
  mode: "saved-only", automaticGeneration: false, approvedGenerationBudget: 0,
});

export function isAllowedLanguage(lang: string) {
  return Object.prototype.hasOwnProperty.call(APP_LANGUAGES, lang);
}

export function createSavedTranslationReader<T>(read: (id: number, lang: string) => Promise<T | null>) {
  return async (devotional: { id: number }, lang: string): Promise<T | null> => {
    if (!isAllowedLanguage(lang) || lang === "en") return null;
    return read(devotional.id, lang);
  };
}
