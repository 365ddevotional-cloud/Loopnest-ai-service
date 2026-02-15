import { useEffect, useRef } from "react";
import {
  saveDevotionals,
  saveSundayLessons,
  saveBibleChapters,
  hasOfflineBible,
  setMeta,
  getMeta,
  type BibleChapterEntry,
} from "@/lib/offlineDb";
import { BIBLE_BOOKS } from "@/lib/bible-data";

const SYNC_KEY = "offlineSyncTimestamp";
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
    console.log("[OfflineSync] Fetching all devotionals...");
    const res = await fetch("/api/devotionals?_t=" + Date.now(), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await saveDevotionals(data);
        await setMeta("devotionalsSynced", true);
        await setMeta("devotionalsCount", data.length);
        console.log(`[OfflineSync] Devotionals synced: ${data.length} items`);
      }
    } else {
      console.warn("[OfflineSync] Devotionals API returned:", res.status);
    }
  } catch (e) {
    console.warn("[OfflineSync] Devotionals sync failed:", e);
  }
}

async function syncSundayLessons(): Promise<void> {
  try {
    console.log("[OfflineSync] Fetching all Sunday lessons...");
    const res = await fetch("/api/sunday-school?_t=" + Date.now(), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        await saveSundayLessons(data);
        await setMeta("sundayLessonsSynced", true);
        await setMeta("sundayLessonsCount", data.length);
        console.log(`[OfflineSync] Sunday lessons synced: ${data.length} items`);
      }
    } else {
      console.warn("[OfflineSync] Sunday lessons API returned:", res.status);
    }
  } catch (e) {
    console.warn("[OfflineSync] Sunday lessons sync failed:", e);
  }
}

async function syncBibleKJV(): Promise<void> {
  const alreadyComplete = await getMeta("bibleSyncComplete");
  if (alreadyComplete === true) {
    const hasData = await hasOfflineBible();
    if (hasData) {
      console.log("[OfflineSync] Bible KJV already synced, skipping");
      return;
    }
  }

  console.log("[OfflineSync] Starting Bible KJV sync...");
  await setMeta("bibleSyncInProgress", true);

  const batch: BibleChapterEntry[] = [];
  let totalSaved = 0;
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
          totalSaved += batch.length;
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
    totalSaved += batch.length;
  }

  await setMeta("bibleSyncInProgress", false);

  if (failures < 100) {
    await setMeta("bibleSyncComplete", true);
    localStorage.setItem("offlineBibleSynced", "true");
    console.log(`[OfflineSync] Bible KJV sync complete: ${totalSaved} chapters saved, ${failures} failures`);
  } else {
    console.warn(`[OfflineSync] Bible KJV sync incomplete: ${totalSaved} saved, ${failures} failures`);
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
        console.log("[OfflineSync] Starting sync...");
        await Promise.all([syncDevotionals(), syncSundayLessons()]);
        localStorage.setItem(SYNC_KEY, String(Date.now()));
        console.log("[OfflineSync] Devotionals + Sunday lessons sync complete");

        syncBibleKJV().catch((e) =>
          console.warn("[OfflineSync] Bible KJV background sync error:", e)
        );
      } catch (e) {
        console.warn("[OfflineSync] Sync error:", e);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, []);
}
