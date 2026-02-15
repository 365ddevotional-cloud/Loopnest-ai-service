import { useEffect, useRef } from "react";
import {
  saveDevotionals,
  saveSundayLessons,
  saveBibleChapters,
  hasOfflineBible,
  type BibleChapterEntry,
} from "@/lib/offlineDb";
import { BIBLE_BOOKS } from "@/lib/bible-data";

const SYNC_KEY = "offlineSyncTimestamp";
const BIBLE_SYNC_KEY = "offlineBibleSynced";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

function shouldSync(): boolean {
  try {
    const last = localStorage.getItem(SYNC_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function syncDevotionals(): Promise<void> {
  try {
    const res = await fetch("/api/devotionals?_t=" + Date.now(), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await saveDevotionals(data);
      }
    }
  } catch (e) {
    console.warn("Offline sync: devotionals failed", e);
  }
}

async function syncSundayLessons(): Promise<void> {
  try {
    const res = await fetch("/api/sunday-school?_t=" + Date.now(), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await saveSundayLessons(data);
      }
    }
  } catch (e) {
    console.warn("Offline sync: sunday lessons failed", e);
  }
}

async function syncBibleKJV(): Promise<void> {
  const alreadySynced = localStorage.getItem(BIBLE_SYNC_KEY);
  if (alreadySynced === "true") {
    const hasData = await hasOfflineBible();
    if (hasData) return;
  }

  const batch: BibleChapterEntry[] = [];
  let failures = 0;

  for (const book of BIBLE_BOOKS) {
    const bookNumber = BOOK_NUMBERS[book.id];
    if (!bookNumber) continue;

    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        const url = `https://api.getbible.net/v2/kjv/${bookNumber}/${ch}.json`;
        const res = await fetch(url);
        if (!res.ok) {
          failures++;
          continue;
        }
        const data = await res.json();
        if (!data.verses || data.verses.length === 0) continue;

        const entry: BibleChapterEntry = {
          reference: `${book.id}:${ch}`,
          book: book.name,
          bookId: book.id,
          chapter: ch,
          verses: data.verses.map((v: { verse: number; text: string }) => ({
            verse: v.verse,
            text: v.text.trim(),
          })),
        };
        batch.push(entry);

        if (batch.length >= 20) {
          await saveBibleChapters([...batch]);
          batch.length = 0;
        }

        await new Promise((r) => setTimeout(r, 50));
      } catch {
        failures++;
      }
    }
  }

  if (batch.length > 0) {
    await saveBibleChapters(batch);
  }

  if (failures < 100) {
    localStorage.setItem(BIBLE_SYNC_KEY, "true");
  }
}

export function useOfflineSync() {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!navigator.onLine || syncingRef.current) return;
    if (!shouldSync()) return;

    syncingRef.current = true;

    (async () => {
      try {
        await Promise.all([syncDevotionals(), syncSundayLessons()]);
        localStorage.setItem(SYNC_KEY, String(Date.now()));

        syncBibleKJV().catch((e) =>
          console.warn("Bible KJV background sync error:", e)
        );
      } catch (e) {
        console.warn("Offline sync error:", e);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, []);
}
