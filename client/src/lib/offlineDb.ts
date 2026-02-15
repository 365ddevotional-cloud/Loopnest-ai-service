const DB_NAME = "devotionalOfflineDB";
const DB_VERSION = 1;

const STORE_DEVOTIONALS = "devotionals";
const STORE_SUNDAY_LESSONS = "sundayLessons";
const STORE_BIBLE_KJV = "bibleKJV";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_DEVOTIONALS)) {
        db.createObjectStore(STORE_DEVOTIONALS, { keyPath: "date" });
      }
      if (!db.objectStoreNames.contains(STORE_SUNDAY_LESSONS)) {
        db.createObjectStore(STORE_SUNDAY_LESSONS, { keyPath: "date" });
      }
      if (!db.objectStoreNames.contains(STORE_BIBLE_KJV)) {
        db.createObjectStore(STORE_BIBLE_KJV, { keyPath: "reference" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txPut<T>(storeName: string, items: T[]): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          db.close();
          resolve(req.result as T[]);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      })
  );
}

function txGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => {
          db.close();
          resolve(req.result as T | undefined);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      })
  );
}

export async function saveDevotionals(devotionals: any[]): Promise<void> {
  if (!devotionals.length) return;
  await txPut(STORE_DEVOTIONALS, devotionals);
}

export async function getAllDevotionals(): Promise<any[]> {
  return txGetAll(STORE_DEVOTIONALS);
}

export async function getDevotionalByDate(date: string): Promise<any | undefined> {
  return txGet(STORE_DEVOTIONALS, date);
}

export async function saveSundayLessons(lessons: any[]): Promise<void> {
  if (!lessons.length) return;
  await txPut(STORE_SUNDAY_LESSONS, lessons);
}

export async function getAllSundayLessons(): Promise<any[]> {
  return txGetAll(STORE_SUNDAY_LESSONS);
}

export interface BibleChapterEntry {
  reference: string;
  book: string;
  bookId: string;
  chapter: number;
  verses: { verse: number; text: string }[];
}

export async function saveBibleChapters(chapters: BibleChapterEntry[]): Promise<void> {
  if (!chapters.length) return;
  await txPut(STORE_BIBLE_KJV, chapters);
}

export async function getBibleChapter(
  bookId: string,
  chapter: number
): Promise<BibleChapterEntry | undefined> {
  const reference = `${bookId}:${chapter}`;
  return txGet<BibleChapterEntry>(STORE_BIBLE_KJV, reference);
}

export async function hasOfflineData(): Promise<boolean> {
  try {
    const devs = await getAllDevotionals();
    return devs.length > 0;
  } catch {
    return false;
  }
}

export async function hasOfflineSundayLessons(): Promise<boolean> {
  try {
    const lessons = await getAllSundayLessons();
    return lessons.length > 0;
  } catch {
    return false;
  }
}

export async function hasOfflineBible(): Promise<boolean> {
  try {
    const ch = await getBibleChapter("genesis", 1);
    return !!ch;
  } catch {
    return false;
  }
}
