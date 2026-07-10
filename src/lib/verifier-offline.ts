"use client";

const DB_NAME = "dzaleka-verifier-secure";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const QUEUE_STORE = "queue";
const KEY_ID = "queue-key";

export type OfflineEvidence = {
  name: string;
  type: string;
  size: number;
  data: string;
  kind: "photo" | "audio";
};

export type QueuedVerification = {
  clientGeneratedId: string;
  assignmentId: string;
  eventType: "verification_submission";
  payload: Record<string, unknown>;
  notes: string | null;
  evidence: OfflineEvidence[];
  createdAt: string;
};

type EncryptedRecord = {
  id: string;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline database unavailable."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Offline database operation failed."));
  });
}

async function encryptionKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await requestResult(
    db.transaction(KEY_STORE, "readonly").objectStore(KEY_STORE).get(KEY_ID)
  );
  if (existing instanceof CryptoKey) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await requestResult(
    db.transaction(KEY_STORE, "readwrite").objectStore(KEY_STORE).put(key, KEY_ID)
  );
  return key;
}

export async function queueVerification(item: QueuedVerification): Promise<void> {
  const db = await openDatabase();
  try {
    const key = await encryptionKey(db);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(item));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    const record: EncryptedRecord = {
      id: item.clientGeneratedId,
      iv: iv.buffer,
      ciphertext,
      createdAt: item.createdAt,
    };
    await requestResult(
      db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).put(record)
    );
  } finally {
    db.close();
  }
}

export async function readVerificationQueue(): Promise<QueuedVerification[]> {
  const db = await openDatabase();
  try {
    const key = await encryptionKey(db);
    const records = (await requestResult(
      db.transaction(QUEUE_STORE, "readonly").objectStore(QUEUE_STORE).getAll()
    )) as EncryptedRecord[];
    const result: QueuedVerification[] = [];
    for (const record of records) {
      try {
        const clear = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: record.iv },
          key,
          record.ciphertext
        );
        result.push(JSON.parse(new TextDecoder().decode(clear)) as QueuedVerification);
      } catch {
        await requestResult(
          db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).delete(record.id)
        );
      }
    }
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}

export async function removeQueuedVerification(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await requestResult(
      db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).delete(id)
    );
  } finally {
    db.close();
  }
}

export async function clearVerifierDeviceData(): Promise<void> {
  const db = await openDatabase();
  try {
    await Promise.all([
      requestResult(db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).clear()),
      requestResult(db.transaction(KEY_STORE, "readwrite").objectStore(KEY_STORE).clear()),
    ]);
  } finally {
    db.close();
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
