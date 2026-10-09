import { useSyncExternalStore } from 'react'
import {
  localStorageBackend,
  migrateV1LocalStorage,
  openIndexedDbBackend,
  type ProgressBackend,
  type ProgressRecord,
} from './storage'

// User progress service. Content records never hold user state; this keeps it
// keyed by user + language + content id. Reads are synchronous from memory
// (fast filtering on huge lists); writes go to the backend in the background.

export interface ProgressState {
  learned: Set<string>
  favorites: Set<string>
}

/** Portable progress shape used by backups: { en: { learned: [...], favorites: [...] } } */
export type ProgressSnapshot = Record<string, { learned: string[]; favorites: string[] }>

export interface UndoPoint {
  reason: 'import' | 'reset'
  createdAt: string
  progress: ProgressSnapshot
}

const EMPTY: ProgressState = { learned: new Set(), favorites: new Set() }

export function createProgressStore(openBackend: () => Promise<ProgressBackend>, userId: string) {
  const states = new Map<string, ProgressState>()
  const listeners = new Set<() => void>()
  let backend: ProgressBackend | null = null
  let ready = false
  let saveError: string | null = null
  let readyPromise: Promise<void> | null = null
  let writeChain: Promise<unknown> = Promise.resolve()

  const notify = () => listeners.forEach((l) => l())

  function fill(records: ProgressRecord[]) {
    states.clear()
    for (const r of records) {
      let s = states.get(r.languageId)
      if (!s) states.set(r.languageId, (s = { learned: new Set(), favorites: new Set() }))
      if (r.learned) s.learned.add(r.contentId)
      if (r.favorite) s.favorites.add(r.contentId)
    }
  }

  function toRecords(snap: ProgressSnapshot): ProgressRecord[] {
    const now = Date.now()
    const out = new Map<string, ProgressRecord>()
    for (const [languageId, { learned, favorites }] of Object.entries(snap)) {
      const rec = (id: string) => {
        const k = `${languageId}\u0000${id}`
        let r = out.get(k)
        if (!r) out.set(k, (r = { userId, languageId, contentId: id, learned: false, favorite: false, updatedAt: now }))
        return r
      }
      learned.forEach((id) => (rec(id).learned = true))
      favorites.forEach((id) => (rec(id).favorite = true))
    }
    return [...out.values()]
  }

  /** Serialize writes so they land in click order; surface failures to the UI. */
  function queue(task: (b: ProgressBackend) => Promise<unknown>) {
    const b = backend
    if (!b) return Promise.resolve()
    const p = writeChain.then(() => task(b))
    writeChain = p.then(
      () => {
        if (saveError) {
          saveError = null
          notify()
        }
      },
      (e) => {
        saveError = String(e?.message ?? e)
        notify()
      },
    )
    return p
  }

  async function reload() {
    if (!backend) return
    fill(await backend.loadAll(userId))
    notify()
  }

  const store = {
    /** Opens storage, migrates old data and loads everything into memory. Idempotent. */
    init(): Promise<void> {
      readyPromise ??= (async () => {
        backend = await openBackend()
        await migrateV1LocalStorage(backend, userId)
        fill(await backend.loadAll(userId))
        ready = true
        notify()
      })()
      return readyPromise
    },
    isReady: () => ready,
    backendName: () => backend?.name ?? '—',
    saveError: () => saveError,
    /** Resolves once every queued write has reached storage. */
    flush: () => writeChain,

    get(languageId: string): ProgressState {
      return states.get(languageId) ?? EMPTY
    },

    set(languageId: string, contentId: string, field: 'learned' | 'favorite', on: boolean) {
      const prev = store.get(languageId)
      const key = field === 'learned' ? 'learned' : 'favorites'
      if (prev[key].has(contentId) === on) return
      const nextSet = new Set(prev[key])
      if (on) nextSet.add(contentId)
      else nextSet.delete(contentId)
      const next = { ...prev, [key]: nextSet }
      states.set(languageId, next)
      notify()
      const record: ProgressRecord = {
        userId,
        languageId,
        contentId,
        learned: next.learned.has(contentId),
        favorite: next.favorites.has(contentId),
        updatedAt: Date.now(),
      }
      queue((b) => b.put(record)).then(broadcast, () => {})
    },
    setLearned: (languageId: string, id: string, on: boolean) => store.set(languageId, id, 'learned', on),
    setFavorite: (languageId: string, id: string, on: boolean) => store.set(languageId, id, 'favorite', on),

    snapshot(): ProgressSnapshot {
      const out: ProgressSnapshot = {}
      for (const [lang, s] of states) {
        if (s.learned.size || s.favorites.size) out[lang] = { learned: [...s.learned], favorites: [...s.favorites] }
      }
      return out
    },

    /** Replaces (or merges into) all progress for this user, after saving an undo point. */
    async restore(snap: ProgressSnapshot, mode: 'replace' | 'merge', reason: UndoPoint['reason']) {
      await store.init()
      await writeChain
      const current = store.snapshot()
      let target = snap
      if (mode === 'merge') {
        target = structuredClone(current)
        for (const [lang, s] of Object.entries(snap)) {
          const t = (target[lang] ??= { learned: [], favorites: [] })
          t.learned = [...new Set([...t.learned, ...s.learned])]
          t.favorites = [...new Set([...t.favorites, ...s.favorites])]
        }
      }
      const undo: UndoPoint = { reason, createdAt: new Date().toISOString(), progress: current }
      await queue(async (b) => {
        await b.setMeta('undo', undo)
        await b.replaceAll(userId, toRecords(target))
      })
      if (saveError) throw new Error(saveError)
      await reload()
      broadcast()
    },

    reset: () => store.restore({}, 'replace', 'reset'),

    async undoPoint(): Promise<UndoPoint | undefined> {
      await store.init()
      return backend?.getMeta<UndoPoint>('undo')
    },

    async undo() {
      const u = await store.undoPoint()
      if (!u) return
      await queue(async (b) => {
        await b.replaceAll(userId, toRecords(u.progress))
        await b.setMeta('undo', undefined)
      })
      if (saveError) throw new Error(saveError)
      await reload()
      broadcast()
    },

    reload,

    subscribe(l: () => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }

  // Keep other open tabs in sync.
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`lingora-progress-${userId}`) : null
  channel?.addEventListener('message', () => void reload())
  function broadcast() {
    channel?.postMessage('changed')
  }

  return store
}

export type ProgressStore = ReturnType<typeof createProgressStore>

async function openDefaultBackend(): Promise<ProgressBackend> {
  try {
    return await openIndexedDbBackend()
  } catch {
    return localStorageBackend()
  }
}

// Single local user for now; accounts would swap userId + backend later.
export const progressStore = createProgressStore(openDefaultBackend, 'local')

export function useProgress(languageId: string): ProgressState {
  return useSyncExternalStore(progressStore.subscribe, () => progressStore.get(languageId))
}

export function useProgressReady(): boolean {
  return useSyncExternalStore(progressStore.subscribe, progressStore.isReady)
}

export function useSaveError(): string | null {
  return useSyncExternalStore(progressStore.subscribe, progressStore.saveError)
}
