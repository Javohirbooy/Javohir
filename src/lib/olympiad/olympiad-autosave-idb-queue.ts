import type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";

const DB_NAME = "iq_olymp_autosave_v2";
const STORE = "pending";
const DB_VERSION = 1;

export type OlympiadAutosaveQueuedRow = {
  id: number;
  sessionId: string;
  displayAnswers: number[];
  signing?: OlympiadAnswerSigningPayload;
  payloadJson: string;
  createdAt: number;
};

function canUseIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        st.createIndex("bySession", "sessionId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_open_failed"));
  });
}

type PendingWrite = {
  sessionId: string;
  displayAnswers: number[];
  signing?: OlympiadAnswerSigningPayload;
  payloadJson: string;
  createdAt: number;
};

/**
 * Client-only: IndexedDB navbatiga javoblar snapshotini qo‘shadi (tarmoqdan mustaqil).
 */
export async function enqueueOlympiadAutosavePending(row: PendingWrite): Promise<void> {
  if (!canUseIdb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      sessionId: row.sessionId,
      displayAnswers: row.displayAnswers,
      signing: row.signing,
      payloadJson: row.payloadJson,
      createdAt: row.createdAt,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb_tx_failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb_tx_aborted"));
  });
  db.close();
}

/**
 * FIFO: eng eski yozuvlardan boshlab `max` ta qaytaradi.
 */
export async function peekOlympiadAutosaveQueue(sessionId: string, max: number): Promise<OlympiadAutosaveQueuedRow[]> {
  if (!canUseIdb()) return [];
  const db = await openDb();
  const rows = await new Promise<OlympiadAutosaveQueuedRow[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const idx = st.index("bySession");
    const req = idx.openCursor(IDBKeyRange.only(sessionId));
    const out: OlympiadAutosaveQueuedRow[] = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) {
        resolve(out);
        return;
      }
      const v = cur.value as OlympiadAutosaveQueuedRow;
      out.push(v);
      if (out.length >= max) {
        resolve(out);
        return;
      }
      cur.continue();
    };
    req.onerror = () => reject(req.error ?? new Error("idb_cursor_failed"));
  });
  db.close();
  return rows;
}

export async function deleteOlympiadAutosaveByIds(ids: number[]): Promise<void> {
  if (!canUseIdb() || ids.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    for (const id of ids) st.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb_delete_failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb_delete_aborted"));
  });
  db.close();
}
