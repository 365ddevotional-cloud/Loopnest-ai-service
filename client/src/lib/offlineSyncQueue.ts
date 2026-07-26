const QUEUE_KEY = "offlineWriteQueue";

export interface SyncQueueItem {
  id: string;
  type: "favorite" | "note" | "save";
  action: "add" | "remove" | "update";
  payload: Record<string, unknown>;
  queuedAt: number;
  userId: string | null;
}

export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "queuedAt">): void {
  try {
    const queue = getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: Date.now(),
    };
    queue.push(newItem);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
  }
}

export function removeFromSyncQueue(id: string): void {
  try {
    const queue = getSyncQueue().filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
  }
}

export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
  }
}

export function hasPendingSync(): boolean {
  return getSyncQueue().length > 0;
}

export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

export async function flushSyncQueue(
  onFlushItem: (item: SyncQueueItem) => Promise<boolean>
): Promise<{ flushed: number; failed: number }> {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };
  const queue = getSyncQueue();
  if (!queue.length) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const ok = await onFlushItem(item);
      if (ok) {
        removeFromSyncQueue(item.id);
        flushed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { flushed, failed };
}
