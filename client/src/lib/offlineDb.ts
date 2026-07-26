const DB_NAME = "devotionalOfflineDB";
const DB_VERSION = 4;

const STORE_DEVOTIONALS = "devotionals";
const STORE_SUNDAY_LESSONS = "sundayLessons";
const STORE_BIBLE_KJV = "bibleKJV";
const STORE_METADATA = "metadata";
const STORE_DOWNLOADS = "userDownloads";
const STORE_SS_DOWNLOADS = "ssDownloads";

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

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
          const dlStore = db.createObjectStore(STORE_DOWNLOADS, { keyPath: "id" });
          dlStore.createIndex("byUid", "firebaseUid", { unique: false });
          dlStore.createIndex("byDate", "date", { unique: false });
        }
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_SS_DOWNLOADS)) {
          const ssStore = db.createObjectStore(STORE_SS_DOWNLOADS, { keyPath: "id" });
          ssStore.createIndex("byUid", "firebaseUid", { unique: false });
          ssStore.createIndex("byYear", "year", { unique: false });
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

function txDelete(storeName: string, key: string | number): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function txDeleteByIndex(storeName: string, indexName: string, key: string | null): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.openCursor(IDBKeyRange.only(key));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
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

export interface UserDownload {
  id: number;
  date: string;
  title: string;
  language: string;
  translation: string;
  downloadedAt: number;
  firebaseUid: string | null;
}

export async function saveDownload(record: UserDownload): Promise<void> {
  await txPut(STORE_DOWNLOADS, [record]);
}

export async function getDownload(id: number): Promise<UserDownload | undefined> {
  return txGet<UserDownload>(STORE_DOWNLOADS, id);
}

export async function getAllDownloads(firebaseUid?: string | null): Promise<UserDownload[]> {
  const all = await txGetAll<UserDownload>(STORE_DOWNLOADS);
  if (firebaseUid !== undefined) {
    return all.filter((d) => d.firebaseUid === firebaseUid);
  }
  return all;
}

export async function removeDownload(id: number): Promise<void> {
  await txDelete(STORE_DOWNLOADS, id);
}

export async function clearUserDownloads(firebaseUid: string | null): Promise<void> {
  if (firebaseUid === null) {
    const all = await txGetAll<UserDownload>(STORE_DOWNLOADS);
    const nullItems = all.filter((d) => d.firebaseUid === null);
    for (const item of nullItems) {
      await txDelete(STORE_DOWNLOADS, item.id);
    }
  } else {
    await txDeleteByIndex(STORE_DOWNLOADS, "byUid", firebaseUid);
  }
}

export interface SSDownload {
  id: number;
  date: string;
  year: number;
  title: string;
  scriptureReferences: string;
  downloadedAt: number;
  serverUpdatedAt: string | null;
  firebaseUid: string | null;
}

export async function saveSSDownload(record: SSDownload): Promise<void> {
  await txPut(STORE_SS_DOWNLOADS, [record]);
}

export async function getSSDownload(id: number): Promise<SSDownload | undefined> {
  return txGet<SSDownload>(STORE_SS_DOWNLOADS, id);
}

export async function getAllSSDownloads(firebaseUid?: string | null): Promise<SSDownload[]> {
  const all = await txGetAll<SSDownload>(STORE_SS_DOWNLOADS);
  if (firebaseUid !== undefined) {
    return all.filter((d) => d.firebaseUid === firebaseUid);
  }
  return all;
}

export async function getSSDownloadsByYear(year: number): Promise<SSDownload[]> {
  const all = await txGetAll<SSDownload>(STORE_SS_DOWNLOADS);
  return all.filter((d) => d.year === year);
}

export async function removeSSDownload(id: number): Promise<void> {
  await txDelete(STORE_SS_DOWNLOADS, id);
}

export async function removeSSDownloadsByYear(year: number): Promise<void> {
  const records = await getSSDownloadsByYear(year);
  for (const r of records) {
    await txDelete(STORE_SS_DOWNLOADS, r.id);
  }
}

export async function clearAllSSDownloads(firebaseUid: string | null): Promise<void> {
  if (firebaseUid === null) {
    const all = await txGetAll<SSDownload>(STORE_SS_DOWNLOADS);
    for (const item of all.filter((d) => d.firebaseUid === null)) {
      await txDelete(STORE_SS_DOWNLOADS, item.id);
    }
  } else {
    await txDeleteByIndex(STORE_SS_DOWNLOADS, "byUid", firebaseUid);
  }
}
