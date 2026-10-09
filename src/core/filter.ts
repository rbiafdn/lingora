import { UI_LANG, type ContentItem, type Level } from './types'
import type { ProgressState } from './progress'

export type StatusFilter = 'all' | 'unknown' | 'known' | 'favorites'
export type SortOrder = 'default' | 'az' | 'za'

export interface Filters {
  status: StatusFilter
  level: Level | 'all'
  pos: string
  category: string
  query: string
  sort: SortOrder
}

export const defaultFilters: Filters = {
  status: 'all',
  level: 'all',
  pos: 'all',
  category: 'all',
  query: '',
  sort: 'default',
}

/** Case- and accent-insensitive form, so "BİLMEK", "bilmek" and "bilmek" all match. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const searchIndex = new WeakMap<ContentItem, string>()
function haystack(item: ContentItem): string {
  let h = searchIndex.get(item)
  if (h === undefined) {
    h = normalize([item.sourceText, ...(item.translations[UI_LANG] ?? []), item.details?.expansion ?? ''].join(' | '))
    searchIndex.set(item, h)
  }
  return h
}

export function applyFilters(items: ContentItem[], f: Filters, p: ProgressState): ContentItem[] {
  const q = normalize(f.query.trim())
  const out = items.filter((it) => {
    if (f.level !== 'all' && it.level !== f.level) return false
    if (f.category !== 'all' && it.category !== f.category) return false
    if (f.pos !== 'all' && it.partOfSpeech !== f.pos) return false
    if (f.status === 'known' && !p.learned.has(it.id)) return false
    if (f.status === 'unknown' && p.learned.has(it.id)) return false
    if (f.status === 'favorites' && !p.favorites.has(it.id)) return false
    if (q && !haystack(it).includes(q)) return false
    return true
  })
  if (f.sort !== 'default') {
    const dir = f.sort === 'az' ? 1 : -1
    out.sort((a, b) => dir * a.sourceText.localeCompare(b.sourceText, 'en', { sensitivity: 'base' }))
  }
  return out
}

/** Counts per status tab for an already-filtered list (status not applied). */
export function statusCounts(items: ContentItem[], p: ProgressState): Record<StatusFilter, number> {
  let known = 0
  let favorites = 0
  for (const it of items) {
    if (p.learned.has(it.id)) known++
    if (p.favorites.has(it.id)) favorites++
  }
  return { all: items.length, known, unknown: items.length - known, favorites }
}

export function progressOf(items: ContentItem[], p: ProgressState) {
  const total = items.length
  let known = 0
  for (const it of items) if (p.learned.has(it.id)) known++
  return { known, total, pct: total ? Math.round((known / total) * 100) : 0 }
}
