import { getBibleChapter, saveBibleChapters, isBibleSyncComplete, getBibleChapterCount, type BibleChapterEntry } from "@/lib/offlineDb";

export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  testament: "old" | "new";
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: "genesis", name: "Genesis", chapters: 50, testament: "old" },
  { id: "exodus", name: "Exodus", chapters: 40, testament: "old" },
  { id: "leviticus", name: "Leviticus", chapters: 27, testament: "old" },
  { id: "numbers", name: "Numbers", chapters: 36, testament: "old" },
  { id: "deuteronomy", name: "Deuteronomy", chapters: 34, testament: "old" },
  { id: "joshua", name: "Joshua", chapters: 24, testament: "old" },
  { id: "judges", name: "Judges", chapters: 21, testament: "old" },
  { id: "ruth", name: "Ruth", chapters: 4, testament: "old" },
  { id: "1 samuel", name: "1 Samuel", chapters: 31, testament: "old" },
  { id: "2 samuel", name: "2 Samuel", chapters: 24, testament: "old" },
  { id: "1 kings", name: "1 Kings", chapters: 22, testament: "old" },
  { id: "2 kings", name: "2 Kings", chapters: 25, testament: "old" },
  { id: "1 chronicles", name: "1 Chronicles", chapters: 29, testament: "old" },
  { id: "2 chronicles", name: "2 Chronicles", chapters: 36, testament: "old" },
  { id: "ezra", name: "Ezra", chapters: 10, testament: "old" },
  { id: "nehemiah", name: "Nehemiah", chapters: 13, testament: "old" },
  { id: "esther", name: "Esther", chapters: 10, testament: "old" },
  { id: "job", name: "Job", chapters: 42, testament: "old" },
  { id: "psalms", name: "Psalms", chapters: 150, testament: "old" },
  { id: "proverbs", name: "Proverbs", chapters: 31, testament: "old" },
  { id: "ecclesiastes", name: "Ecclesiastes", chapters: 12, testament: "old" },
  { id: "song of solomon", name: "Song of Solomon", chapters: 8, testament: "old" },
  { id: "isaiah", name: "Isaiah", chapters: 66, testament: "old" },
  { id: "jeremiah", name: "Jeremiah", chapters: 52, testament: "old" },
  { id: "lamentations", name: "Lamentations", chapters: 5, testament: "old" },
  { id: "ezekiel", name: "Ezekiel", chapters: 48, testament: "old" },
  { id: "daniel", name: "Daniel", chapters: 12, testament: "old" },
  { id: "hosea", name: "Hosea", chapters: 14, testament: "old" },
  { id: "joel", name: "Joel", chapters: 3, testament: "old" },
  { id: "amos", name: "Amos", chapters: 9, testament: "old" },
  { id: "obadiah", name: "Obadiah", chapters: 1, testament: "old" },
  { id: "jonah", name: "Jonah", chapters: 4, testament: "old" },
  { id: "micah", name: "Micah", chapters: 7, testament: "old" },
  { id: "nahum", name: "Nahum", chapters: 3, testament: "old" },
  { id: "habakkuk", name: "Habakkuk", chapters: 3, testament: "old" },
  { id: "zephaniah", name: "Zephaniah", chapters: 3, testament: "old" },
  { id: "haggai", name: "Haggai", chapters: 2, testament: "old" },
  { id: "zechariah", name: "Zechariah", chapters: 14, testament: "old" },
  { id: "malachi", name: "Malachi", chapters: 4, testament: "old" },
  { id: "matthew", name: "Matthew", chapters: 28, testament: "new" },
  { id: "mark", name: "Mark", chapters: 16, testament: "new" },
  { id: "luke", name: "Luke", chapters: 24, testament: "new" },
  { id: "john", name: "John", chapters: 21, testament: "new" },
  { id: "acts", name: "Acts", chapters: 28, testament: "new" },
  { id: "romans", name: "Romans", chapters: 16, testament: "new" },
  { id: "1 corinthians", name: "1 Corinthians", chapters: 16, testament: "new" },
  { id: "2 corinthians", name: "2 Corinthians", chapters: 13, testament: "new" },
  { id: "galatians", name: "Galatians", chapters: 6, testament: "new" },
  { id: "ephesians", name: "Ephesians", chapters: 6, testament: "new" },
  { id: "philippians", name: "Philippians", chapters: 4, testament: "new" },
  { id: "colossians", name: "Colossians", chapters: 4, testament: "new" },
  { id: "1 thessalonians", name: "1 Thessalonians", chapters: 5, testament: "new" },
  { id: "2 thessalonians", name: "2 Thessalonians", chapters: 3, testament: "new" },
  { id: "1 timothy", name: "1 Timothy", chapters: 6, testament: "new" },
  { id: "2 timothy", name: "2 Timothy", chapters: 4, testament: "new" },
  { id: "titus", name: "Titus", chapters: 3, testament: "new" },
  { id: "philemon", name: "Philemon", chapters: 1, testament: "new" },
  { id: "hebrews", name: "Hebrews", chapters: 13, testament: "new" },
  { id: "james", name: "James", chapters: 5, testament: "new" },
  { id: "1 peter", name: "1 Peter", chapters: 5, testament: "new" },
  { id: "2 peter", name: "2 Peter", chapters: 3, testament: "new" },
  { id: "1 john", name: "1 John", chapters: 5, testament: "new" },
  { id: "2 john", name: "2 John", chapters: 1, testament: "new" },
  { id: "3 john", name: "3 John", chapters: 1, testament: "new" },
  { id: "jude", name: "Jude", chapters: 1, testament: "new" },
  { id: "revelation", name: "Revelation", chapters: 22, testament: "new" },
];

export const OLD_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === "old");
export const NEW_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === "new");

export function getBookById(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find(b => b.id === id);
}

export function getBookByName(name: string): BibleBook | undefined {
  return BIBLE_BOOKS.find(b => b.name.toLowerCase() === name.toLowerCase());
}

export interface BiblePosition {
  bookId: string;
  chapter: number;
  translation: string;
}

const STORAGE_KEY = "bible-reading-position";

export function saveReadingPosition(position: BiblePosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {}
}

export function loadReadingPosition(): BiblePosition | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return null;
}

export function getDefaultPosition(): BiblePosition {
  return { bookId: "genesis", chapter: 1, translation: "KJV" };
}

export interface ChapterVerse {
  verse: number;
  text: string;
}

export interface ChapterData {
  book: string;
  chapter: number;
  verses: ChapterVerse[];
  actualTranslation: string;
  isFallback: boolean;
}

const TRANSLATION_CODES: Record<string, string> = {
  KJV: "kjv",
  WEB: "web",
  ASV: "asv",
  DRB: "douayrheims",
};

const BOOK_NUMBERS: Record<string, number> = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, "1 samuel": 9, "2 samuel": 10,
  "1 kings": 11, "2 kings": 12, "1 chronicles": 13, "2 chronicles": 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19, proverbs: 20,
  ecclesiastes: 21, "song of solomon": 22, isaiah: 23, jeremiah: 24,
  lamentations: 25, ezekiel: 26, daniel: 27, hosea: 28, joel: 29, amos: 30,
  obadiah: 31, jonah: 32, micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39, matthew: 40, mark: 41, luke: 42,
  john: 43, acts: 44, romans: 45, "1 corinthians": 46, "2 corinthians": 47,
  galatians: 48, ephesians: 49, philippians: 50, colossians: 51,
  "1 thessalonians": 52, "2 thessalonians": 53, "1 timothy": 54, "2 timothy": 55,
  titus: 56, philemon: 57, hebrews: 58, james: 59, "1 peter": 60, "2 peter": 61,
  "1 john": 62, "2 john": 63, "3 john": 64, jude: 65, revelation: 66,
};

async function fetchChapterInternal(
  bookId: string,
  chapter: number,
  translation: string,
  isRetry: boolean = false
): Promise<ChapterData | null> {
  const translationCode = TRANSLATION_CODES[translation] || "kjv";
  const book = getBookById(bookId);
  if (!book) return null;
  
  const bookNumber = BOOK_NUMBERS[bookId];
  if (!bookNumber) return null;

  try {
    const url = `https://api.getbible.net/v2/${translationCode}/${bookNumber}/${chapter}.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (!isRetry && translation !== "KJV") {
        const fallback = await fetchChapterInternal(bookId, chapter, "KJV", true);
        if (fallback) {
          return { ...fallback, actualTranslation: "KJV", isFallback: true };
        }
      }
      return null;
    }

    const data = await response.json();
    
    if (!data.verses || data.verses.length === 0) {
      if (!isRetry && translation !== "KJV") {
        const fallback = await fetchChapterInternal(bookId, chapter, "KJV", true);
        if (fallback) {
          return { ...fallback, actualTranslation: "KJV", isFallback: true };
        }
      }
      return null;
    }

    const verses: ChapterVerse[] = data.verses.map((v: { verse: number; text: string }) => ({
      verse: v.verse,
      text: v.text.trim(),
    }));

    if (translationCode === "kjv") {
      try {
        const entry: BibleChapterEntry = {
          reference: `${bookId}:${chapter}`,
          book: book.name,
          bookId,
          chapter,
          verses,
        };
        saveBibleChapters([entry]).catch(() => {});
      } catch {}
    }

    return {
      book: book.name,
      chapter,
      verses,
      actualTranslation: translation,
      isFallback: isRetry,
    };
  } catch (error) {
    console.error("Failed to fetch chapter:", error);

    if (translation === "KJV" || isRetry) {
      try {
        const cached = await getBibleChapter(bookId, chapter);
        if (cached) {
          return {
            book: cached.book,
            chapter: cached.chapter,
            verses: cached.verses as ChapterVerse[],
            actualTranslation: "KJV",
            isFallback: true,
          };
        }
      } catch {}
    }

    if (!isRetry && translation !== "KJV") {
      const fallback = await fetchChapterInternal(bookId, chapter, "KJV", true);
      if (fallback) {
        return { ...fallback, actualTranslation: "KJV", isFallback: true };
      }
    }
    return null;
  }
}

export async function fetchChapter(
  bookId: string,
  chapter: number,
  translation: string
): Promise<ChapterData | null> {
  if (!navigator.onLine) {
    try {
      const cached = await getBibleChapter(bookId, chapter);
      if (cached) {
        const book = getBookById(bookId);
        return {
          book: cached.book || book?.name || bookId,
          chapter: cached.chapter,
          verses: cached.verses as ChapterVerse[],
          actualTranslation: "KJV",
          isFallback: translation !== "KJV",
        };
      }
      const syncComplete = await isBibleSyncComplete();
      if (!syncComplete) {
        const count = await getBibleChapterCount();
        throw new Error(`bible_still_syncing:${count}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("bible_still_syncing")) throw e;
    }
    return null;
  }

  if (translation === "KJV") {
    try {
      const cached = await getBibleChapter(bookId, chapter);
      if (cached) {
        const book = getBookById(bookId);
        fetchChapterInternal(bookId, chapter, "KJV", false).catch(() => {});
        return {
          book: cached.book || book?.name || bookId,
          chapter: cached.chapter,
          verses: cached.verses as ChapterVerse[],
          actualTranslation: "KJV",
          isFallback: false,
        };
      }
    } catch {}
  }

  return fetchChapterInternal(bookId, chapter, translation, false);
}
