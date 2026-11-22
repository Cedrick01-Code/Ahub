export type OutboxItem = {
  key: string
  path: string
  method: string
  body: Record<string, unknown>
  capturedAt: string
  status: "waiting" | "sending" | "sent" | "failed"
  error?: string
}
const DB_NAME = "ahub-learning-outbox"
const STORE = "requests"

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "key" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const queueLearningRequest = async (
  item: Omit<OutboxItem, "status">,
) => {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ ...item, status: "waiting" })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export const readLearningOutbox = async (): Promise<OutboxItem[]> => {
  const db = await openDb()
  const items = await new Promise<OutboxItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const request = tx.objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return items.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
}

export const updateOutboxItem = async (
  key: string,
  values: Partial<OutboxItem>,
) => {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    const request = store.get(key)
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...values })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export const syncLearningOutbox = async () => {
  if (!navigator.onLine) return
  const token = localStorage.getItem("ahub_token")
  if (!token) return
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"
  for (const item of await readLearningOutbox()) {
    if (item.status === "sent") continue
    await updateOutboxItem(item.key, { status: "sending", error: undefined })
    try {
      const response = await fetch(`${API_BASE_URL}/api/learning${item.path}`, {
        method: item.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": item.key,
        },
        body: JSON.stringify(item.body),
      })
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).message ||
            `Request failed (${response.status}).`,
        )
      await updateOutboxItem(item.key, { status: "sent", error: undefined })
    } catch (error) {
      await updateOutboxItem(item.key, {
        status: "failed",
        error: error instanceof Error ? error.message : "Sync failed.",
      })
    }
  }
}
