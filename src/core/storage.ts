// Device-local persistence for user progress. The app never talks to IndexedDB
// directly: it goes through ProgressBackend, so a future cloud-sync backend can
// replace this without touching UI code.

/** One user's state for one content item. Only non-empty states are stored. */
export interface ProgressRecord {
  userId: string
  languageId: string
  contentId: string
  learned: boolean
  favorite: boolean
  updatedAt: number
}

export interface ProgressBackend {
  readonly name: string
  loadAll(userId: string): Promise<ProgressRecord[]>
  /** Upsert, or delete when the record is neither learned nor favorite. */
  put(record: ProgressRecord): Promise<void>
  replaceAll(userId: string, records: ProgressRecord[]): Promise<void>
  getMeta<T>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
}

const isEmpty = (r: ProgressRecord) => !r.learned && !r.favorite

// ---------- IndexedDB ----------

const DB_NAME = 'lingora'
const DB_VERSION = 1
const PROGRESS = 'progress'
const META = 'meta'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'))
  })
}

export async function openIndexedDbBackend(): Promise<ProgressBackend> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB yok')
  const open = indexedDB.open(DB_NAME, DB_VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains(PROGRESS)) {
      const s = db.createObjectStore(PROGRESS, { keyPath: ['userId', 'languageId', 'contentId'] })
      s.createIndex('byUser', 'userId')
    }
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
  }
  const db = await req(open)
  // Another tab upgrading the schema: step aside so it isn't blocked.
  db.onversionchange = () => db.close()

  return {
    name: 'IndexedDB',
    async loadAll(userId) {
      const tx = db.transaction(PROGRESS, 'readonly')
      return req(tx.objectStore(PROGRESS).index('byUser').getAll(userId))
    },
    async put(record) {
      const tx = db.transaction(PROGRESS, 'readwrite')
      const s = tx.objectStore(PROGRESS)
      if (isEmpty(record)) s.delete([record.userId, record.languageId, record.contentId])
      else s.put(record)
      await done(tx)
    },
    async replaceAll(userId, records) {
      // Single transaction: either the whole replacement lands or nothing changes.
      const tx = db.transaction(PROGRESS, 'readwrite')
      const s = tx.objectStore(PROGRESS)
      const keysReq = s.index('byUser').getAllKeys(userId)
      keysReq.onsuccess = () => {
        for (const k of keysReq.result) s.delete(k)
        for (const r of records) if (!isEmpty(r)) s.put(r)
      }
      await done(tx)
    },
    async getMeta<T>(key: string) {
      const tx = db.transaction(META, 'readonly')
      return (await req(tx.objectStore(META).get(key))) as T | undefined
    },
    async setMeta(key, value) {
      const tx = db.transaction(META, 'readwrite')
      if (value === undefined) tx.objectStore(META).delete(key)
      else tx.objectStore(META).put(value, key)
      await done(tx)
    },
  }
}

// ---------- localStorage fallback (e.g. IndexedDB blocked in a private window) ----------

export function localStorageBackend(): ProgressBackend {
  const key = (userId: string) => `lingora:progress:v2:${userId}`
  const read = (userId: string): ProgressRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(key(userId)) ?? '[]')
    } catch {
      return []
    }
  }
  const write = (userId: string, rs: ProgressRecord[]) => {
    try {
      localStorage.setItem(key(userId), JSON.stringify(rs))
    } catch {
      /* storage full or unavailable: in-memory only */
    }
  }
  return {
    name: 'localStorage',
    async loadAll(userId) {
      return read(userId)
    },
    async put(r) {
      const rs = read(r.userId).filter((x) => !(x.languageId === r.languageId && x.contentId === r.contentId))
      if (!isEmpty(r)) rs.push(r)
      write(r.userId, rs)
    },
    async replaceAll(userId, records) {
      write(userId, records.filter((r) => !isEmpty(r)))
    },
    async getMeta<T>(k: string) {
      try {
        const v = localStorage.getItem(`lingora:meta:${k}`)
        return v ? (JSON.parse(v) as T) : undefined
      } catch {
        return undefined
      }
    },
    async setMeta(k, value) {
      try {
        if (value === undefined) localStorage.removeItem(`lingora:meta:${k}`)
        else localStorage.setItem(`lingora:meta:${k}`, JSON.stringify(value))
      } catch {
        /* ignore */
      }
    },
  }
}

/** In-memory backend for tests. */
export function memoryBackend(): ProgressBackend {
  let rows: ProgressRecord[] = []
  const meta = new Map<string, unknown>()
  return {
    name: 'memory',
    async loadAll(userId) {
      return rows.filter((r) => r.userId === userId).map((r) => ({ ...r }))
    },
    async put(r) {
      rows = rows.filter((x) => !(x.userId === r.userId && x.languageId === r.languageId && x.contentId === r.contentId))
      if (!isEmpty(r)) rows.push({ ...r })
    },
    async replaceAll(userId, records) {
      rows = rows.filter((r) => r.userId !== userId).concat(records.filter((r) => !isEmpty(r)).map((r) => ({ ...r })))
    },
    async getMeta<T>(k: string) {
      return meta.get(k) as T | undefined
    },
    async setMeta(k, v) {
      if (v === undefined) meta.delete(k)
      else meta.set(k, structuredClone(v))
    },
  }
}

// ---------- One-time migration from the v1 localStorage format ----------

const V1_PREFIX = 'lingora:progress:v1:'

/**
 * Copies v1 localStorage progress (`lingora:progress:v1:<user>:<lang>`) into the
 * backend, merging with anything already there. The old keys are renamed, not
 * deleted, so nothing is lost if something goes wrong.
 */
export async function migrateV1LocalStorage(backend: ProgressBackend, userId: string): Promise<number> {
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(`${V1_PREFIX}${userId}:`)) keys.push(k)
    }
  } catch {
    return 0
  }
  if (!keys.length) return 0

  const existing = await backend.loadAll(userId)
  const byKey = new Map(existing.map((r) => [`${r.languageId}\u0000${r.contentId}`, r]))
  for (const k of keys) {
    const languageId = k.slice(`${V1_PREFIX}${userId}:`.length)
    let data: { learned?: unknown; favorites?: unknown }
    try {
      data = JSON.parse(localStorage.getItem(k) ?? '{}')
    } catch {
      continue
    }
    const upsert = (id: unknown, field: 'learned' | 'favorite') => {
      if (typeof id !== 'string') return
      const key = `${languageId}\u0000${id}`
      const r = byKey.get(key) ?? { userId, languageId, contentId: id, learned: false, favorite: false, updatedAt: Date.now() }
      r[field] = true
      byKey.set(key, r)
    }
    if (Array.isArray(data.learned)) data.learned.forEach((id) => upsert(id, 'learned'))
    if (Array.isArray(data.favorites)) data.favorites.forEach((id) => upsert(id, 'favorite'))
  }
  const merged = [...byKey.values()]
  await backend.replaceAll(userId, merged)
  for (const k of keys) {
    try {
      localStorage.setItem(k.replace(V1_PREFIX, 'lingora:progress:v1-migrated:'), localStorage.getItem(k) ?? '')
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
  return merged.length
}
