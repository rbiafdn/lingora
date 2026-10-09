import { useSyncExternalStore } from 'react'
import { LEVELS, type Level } from './types'
import type { SortOrder, StatusFilter } from './filter'

// Small device-local preferences. Kept in localStorage because they're tiny and
// needed synchronously at startup (e.g. reopening the last language).

export interface SavedFilters {
  status?: StatusFilter
  pos?: string
  sort?: SortOrder
  category?: string
}

export interface Preferences {
  lastLanguage?: string
  /** Selected CEFR level per language ('all' = no level selected). */
  level: Record<string, Level | 'all'>
  /** Last used filters per "<language>:<category>" (search text is not kept). */
  filters: Record<string, SavedFilters>
}

const KEY = 'lingora:prefs:v1'
const EMPTY: Preferences = { level: {}, filters: {} }

function read(): Preferences {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? sanitizePreferences(JSON.parse(raw)) : EMPTY
  } catch {
    return EMPTY
  }
}

const STATUSES: StatusFilter[] = ['all', 'unknown', 'known', 'favorites']
const SORTS: SortOrder[] = ['default', 'az', 'za']

/** Accepts anything (e.g. from a backup file) and keeps only well-formed values. */
export function sanitizePreferences(v: unknown): Preferences {
  const out: Preferences = { level: {}, filters: {} }
  if (!v || typeof v !== 'object') return out
  const o = v as Record<string, unknown>
  if (typeof o.lastLanguage === 'string' && /^[a-z]{2,3}$/.test(o.lastLanguage)) out.lastLanguage = o.lastLanguage
  if (o.level && typeof o.level === 'object')
    for (const [k, l] of Object.entries(o.level))
      if (l === 'all' || (LEVELS as readonly unknown[]).includes(l)) out.level[k] = l as Level | 'all'
  if (o.filters && typeof o.filters === 'object')
    for (const [k, f] of Object.entries(o.filters as Record<string, unknown>)) {
      if (!f || typeof f !== 'object') continue
      const src = f as Record<string, unknown>
      const s: SavedFilters = {}
      if (STATUSES.includes(src.status as StatusFilter)) s.status = src.status as StatusFilter
      if (SORTS.includes(src.sort as SortOrder)) s.sort = src.sort as SortOrder
      if (typeof src.pos === 'string') s.pos = src.pos
      if (typeof src.category === 'string') s.category = src.category
      out.filters[k] = s
    }
  return out
}

let current = read()
const listeners = new Set<() => void>()

function write(next: Preferences) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* unavailable: keep in memory for this session */
  }
  listeners.forEach((l) => l())
}

export const prefs = {
  get: () => current,
  replace: (p: Preferences) => write(sanitizePreferences(p)),
  setLastLanguage: (id: string) => current.lastLanguage !== id && write({ ...current, lastLanguage: id }),
  setLevel: (languageId: string, level: Level | 'all') =>
    write({ ...current, level: { ...current.level, [languageId]: level } }),
  setFilters: (key: string, f: SavedFilters) => write({ ...current, filters: { ...current.filters, [key]: f } }),
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function usePrefs(): Preferences {
  return useSyncExternalStore(prefs.subscribe, prefs.get)
}

export function useLevel(languageId: string): Level | 'all' {
  return usePrefs().level[languageId] ?? 'all'
}
