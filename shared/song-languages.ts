/** Keep the existing language column/API compatible with single-language releases. */
export const SONG_LANGUAGES = [
  "English", "Spanish", "French", "Portuguese", "German", "Italian", "Dutch",
  "Hindi", "Punjabi", "Nepali", "Mandarin Chinese", "Japanese", "Korean",
  "Arabic", "Swahili", "Yoruba", "Igbo", "Hausa", "Nigerian Pidgin",
];

export function songLanguages(value: string | null | undefined): string[] {
  const aliases: Record<string, string> = {
    "pidgin": "Nigerian Pidgin", "pidgin english": "Nigerian Pidgin",
    "nigerian pidgin": "Nigerian Pidgin", "mandarin": "Mandarin Chinese",
    "mandrain": "Mandarin Chinese", "mandarin chinese": "Mandarin Chinese",
  };
  return Array.from(new Set((value ?? "").split(/[,;+\/]/)
    .map(part => part.trim()).filter(Boolean)
    .map(part => aliases[part.toLowerCase()] ?? SONG_LANGUAGES.find(l => l.toLowerCase() === part.toLowerCase()) ?? part)));
}

/** Ministry policy: Pidgin songs also belong in the English collection. */
export function songLanguageCategories(value: string | null | undefined): string[] {
  const languages = songLanguages(value);
  return languages.includes("Nigerian Pidgin") ? Array.from(new Set([...languages, "English"])) : languages;
}

export function serializeSongLanguages(value: string | null | undefined): string {
  return songLanguageCategories(value).join(", ");
}
