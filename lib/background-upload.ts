/**
 * lib/background-upload.ts
 * Client-side helper that queues a file upload into IndexedDB and
 * registers a Background Sync tag so the service worker retries the
 * upload when connectivity is restored.
 *
 * Falls back to a direct fetch when Background Sync is unavailable.
 */

const UPLOAD_QUEUE_STORE = "dropboard-upload-queue";
const SYNC_TAG = "dropboard-upload";

type QueuedUpload = {
  id: string;
  title: string;
  workspaceId: string;
  /** Serialised FormData entries — files are base64-encoded Blobs */
  formDataEntries: Array<{
    name: string;
    value: string;
    fileName?: string;
    type?: string;
  }>;
  queuedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_QUEUE_STORE, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>" — strip prefix
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Serialise a FormData into a storable array so it can survive IndexedDB
 * serialisation (Files/Blobs are converted to base64 strings).
 */
async function serializeFormData(
  formData: FormData
): Promise<QueuedUpload["formDataEntries"]> {
  const entries: QueuedUpload["formDataEntries"] = [];
  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      const b64 = await blobToBase64(value);
      entries.push({ name, value: b64, fileName: value.name, type: value.type });
    } else {
      entries.push({ name, value: value as string });
    }
  }
  return entries;
}

/**
 * Queue a file upload for Background Sync.
 * Returns the generated queue entry ID (a random string).
 */
export async function queueUpload(
  title: string,
  workspaceId: string,
  formData: FormData
): Promise<string> {
  const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const formDataEntries = await serializeFormData(formData);

  const entry: QueuedUpload = {
    id,
    title,
    workspaceId,
    formDataEntries,
    queuedAt: Date.now(),
  };

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Register sync if supported
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — SyncManager is not yet in all TS lib.dom typings
    await reg.sync.register(SYNC_TAG);
  } else {
    // Fallback: attempt direct upload immediately
    const sw = navigator.serviceWorker?.controller;
    if (sw) sw.postMessage({ type: "PROCESS_UPLOAD_QUEUE" });
  }

  return id;
}

/**
 * Return all queued upload entries from IndexedDB (for progress UI).
 */
export async function listQueuedUploads(): Promise<QueuedUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = () => resolve(req.result as QueuedUpload[]);
    req.onerror = () => reject(req.error);
  });
}
