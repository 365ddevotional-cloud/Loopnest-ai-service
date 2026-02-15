const DB_NAME = "devotionalOfflineDB";
const DB_VERSION = 2;

const STORE_DEVOTIONALS = "devotionals";
const STORE_SUNDAY_LESSONS = "sundayLessons";
const STORE_BIBLE_KJV = "bibleKJV";
const STORE_METADATA = "metadata";

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    try {
      const tx = dbInstance.transaction(STORE_METADATA, "readonly");
      tx.abort();
      return Promise.resolve(dbInstance);
    } catch {
      dbInstance = null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore(STORE_DEVOTIONALS, { keyPath: "date" });
        const lessonStore = db.createObjectStore(STORE_SUNDAY_LESSONS, { keyPath: "date" });
        lessonStore.createIndex("byId", "id", { unique: true });
        db.createObjectStore(STORE_BIBLE_KJV, { keyPath: "reference" });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: "key" });
        }
        if (db.objectStoreNames.contains(STORE_SUNDAY_LESSONS)) {
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const store = tx.objectStore(STORE_SUNDAY_LESSONS);
          if (!store.indexNames.contains("byId")) {
            store.createIndex("byId", "id", { unique: true });
          }
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };
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
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
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
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      })
  );
}

function txGet<T>(storeName: string, key: string | number): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function txGetByIndex<T>(storeName: string, indexName: string, key: string | number): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function txCount(storeName: string): Promise<number> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function saveDevotionals(devotionals: any[]): Promise<void> {
  if (!devotionals.length) return;
  await txPut(STORE_DEVOTIONALS, devotionals);
  console.log(`[OfflineDB] Saved ${devotionals.length} devotionals`);
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
  console.log(`[OfflineDB] Saved ${lessons.length} sunday lessons`);
}

export async function getAllSundayLessons(): Promise<any[]> {
  return txGetAll(STORE_SUNDAY_LESSONS);
}

export async function getSundayLessonById(id: number): Promise<any | undefined> {
  try {
    return await txGetByIndex(STORE_SUNDAY_LESSONS, "byId", id);
  } catch {
    const all = await getAllSundayLessons();
    return all.find((l: any) => l.id === id || String(l.id) === String(id));
  }
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

export async function getBibleChapterCount(): Promise<number> {
  return txCount(STORE_BIBLE_KJV);
}

export async function setMeta(key: string, value: any): Promise<void> {
  await txPut(STORE_METADATA, [{ key, value, updatedAt: Date.now() }]);
}

export async function getMeta(key: string): Promise<any | undefined> {
  const result = await txGet<{ key: string; value: any }>(STORE_METADATA, key);
  return result?.value;
}

export async function hasOfflineData(): Promise<boolean> {
  try {
    const count = await txCount(STORE_DEVOTIONALS);
    return count > 0;
  } catch {
    return false;
  }
}

export async function hasOfflineSundayLessons(): Promise<boolean> {
  try {
    const count = await txCount(STORE_SUNDAY_LESSONS);
    return count > 0;
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

export async function isBibleSyncComplete(): Promise<boolean> {
  try {
    const status = await getMeta("bibleSyncComplete");
    return status === true;
  } catch {
    return false;
  }
}
