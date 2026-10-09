import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyFilters, defaultFilters, progressOf } from './filter'
import { createProgressStore } from './progress'
import { memoryBackend, migrateV1LocalStorage } from './storage'
import { backupFileName, backupStats, createBackup, parseBackup } from './backup'
import { sanitizePreferences } from './prefs'
import { validateLanguage } from './validate'
import type { ContentItem, LanguageManifest } from './types'

const dir = 'public/data/en/'
const manifest: LanguageManifest = JSON.parse(readFileSync(dir + 'manifest.json', 'utf8'))
const files = Object.fromEntries(
  manifest.categories.flatMap((c) => c.files).map((f) => [f, JSON.parse(readFileSync(dir + f, 'utf8'))]),
)
const words: ContentItem[] = manifest.categories.find((c) => c.id === 'words')!.files.flatMap((f) => files[f])

async function storeWith(backend = memoryBackend()) {
  const s = createProgressStore(async () => backend, 'u1')
  await s.init()
  return s
}

describe('content data', () => {
  it('passes schema validation (unique stable ids, required fields, grammar standard)', () => {
    const { errors } = validateLanguage(manifest, files)
    expect(errors).toEqual([])
  })
})

describe('progress store', () => {
  it('persists learned and favorite per user and language', async () => {
    const backend = memoryBackend()
    const a = await storeWith(backend)
    a.setLearned('en', 'en-word-know', true)
    a.setFavorite('en', 'en-word-apple', true)
    await a.flush()

    const reopened = await storeWith(backend)
    expect([...reopened.get('en').learned]).toEqual(['en-word-know'])
    expect([...reopened.get('en').favorites]).toEqual(['en-word-apple'])
    expect(reopened.get('de').learned.size).toBe(0)

    const other = createProgressStore(async () => backend, 'u2')
    await other.init()
    expect(other.get('en').learned.size).toBe(0)

    reopened.setLearned('en', 'en-word-know', false)
    await reopened.flush()
    expect((await storeWith(backend)).get('en').learned.size).toBe(0)
  })

  it('keeps progress for ids that no longer exist without breaking progress math', async () => {
    const s = await storeWith()
    s.setLearned('en', 'en-word-removed-long-ago', true)
    s.setLearned('en', 'en-word-know', true)
    expect(progressOf(words.filter((w) => w.level === 'A1'), s.get('en')).known).toBe(1)
    expect(s.snapshot().en.learned).toContain('en-word-removed-long-ago')
  })

  it('restore replace / merge, reset and undo', async () => {
    const s = await storeWith()
    s.setLearned('en', 'a', true)
    s.setFavorite('en', 'b', true)
    await s.restore({ en: { learned: ['c'], favorites: [] } }, 'merge', 'import')
    expect([...s.get('en').learned].sort()).toEqual(['a', 'c'])
    await s.restore({ en: { learned: ['x'], favorites: ['y'] } }, 'replace', 'import')
    expect([...s.get('en').learned]).toEqual(['x'])
    await s.undo()
    expect([...s.get('en').learned].sort()).toEqual(['a', 'c'])
    await s.reset()
    expect(s.get('en').learned.size).toBe(0)
    expect(s.get('en').favorites.size).toBe(0)
    await s.undo()
    expect([...s.get('en').favorites]).toEqual(['b'])
  })
})

describe('v1 localStorage migration', () => {
  it('moves old progress into the backend and keeps the old data under a new key', async () => {
    const mem = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size
      },
      clear: () => mem.clear(),
    } as Storage
    mem.set('lingora:progress:v1:u1:en', JSON.stringify({ learned: ['en-word-know'], favorites: ['en-word-know', 'x'] }))

    const backend = memoryBackend()
    await backend.put({ userId: 'u1', languageId: 'en', contentId: 'existing', learned: true, favorite: false, updatedAt: 1 })
    const s = await storeWith(backend)
    expect([...s.get('en').learned].sort()).toEqual(['en-word-know', 'existing'])
    expect([...s.get('en').favorites].sort()).toEqual(['en-word-know', 'x'])
    expect(mem.has('lingora:progress:v1:u1:en')).toBe(false)
    expect(mem.has('lingora:progress:v1-migrated:u1:en')).toBe(true)
    expect(await migrateV1LocalStorage(backend, 'u1')).toBe(0)
    // @ts-expect-error cleanup for other tests
    delete globalThis.localStorage
  })
})

describe('backup', () => {
  const progress = { en: { learned: ['en-word-know', 'gone'], favorites: ['en-word-apple'] } }

  it('round-trips', () => {
    const b = createBackup(progress, { level: { en: 'A1' }, filters: {} }, new Date('2026-10-09T10:00:00Z'))
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok && r.backup.progress).toEqual(progress)
    expect(r.ok && r.backup.preferences.level.en).toBe('A1')
    expect(backupFileName(new Date(2026, 9, 9))).toBe('lingora-backup-2026-10-09.json')
  })

  it('rejects broken or foreign files', () => {
    expect(parseBackup('{not json').ok).toBe(false)
    expect(parseBackup('[]').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'other', kind: 'backup', formatVersion: 1, progress: {} })).ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'lingora', kind: 'backup', formatVersion: 99, progress: {} })).ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'lingora', kind: 'backup', formatVersion: 1 })).ok).toBe(false)
  })

  it('drops malformed entries with a warning and reports unknown ids', () => {
    const r = parseBackup(
      JSON.stringify({
        app: 'lingora',
        kind: 'backup',
        formatVersion: 1,
        progress: { en: { learned: ['en-word-know', 42, '<script>'], favorites: [] }, 'BAD LANG': {} },
        preferences: { level: { en: 'Z9' }, lastLanguage: 'en' },
      }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.progress.en.learned).toEqual(['en-word-know'])
    expect(r.warnings.length).toBe(1)
    expect(r.backup.preferences.level.en).toBeUndefined()
    const known = new Set(words.map((w) => w.id))
    expect(backupStats(progress, () => known).unknownIds).toBe(1)
  })

  it('sanitizes preferences', () => {
    expect(sanitizePreferences({ filters: { 'en:words': { status: 'known', sort: 'nope' } } }).filters['en:words']).toEqual({
      status: 'known',
    })
  })
})

describe('filters', async () => {
  const store = await storeWith()
  store.setLearned('en', 'en-word-know', true)
  store.setLearned('en', 'en-word-borrow', true)
  store.setFavorite('en', 'en-word-apple', true)
  const p = store.get('en')

  it('searches English and Turkish, case-insensitively', () => {
    expect(applyFilters(words, { ...defaultFilters, query: 'BİLMEK' }, p).map((i) => i.sourceText)).toContain('know')
    expect(applyFilters(words, { ...defaultFilters, query: 'Know' }, p).map((i) => i.sourceText)).toContain('know')
    expect(applyFilters(words, { ...defaultFilters, query: 'odunc' }, p).map((i) => i.sourceText)).toContain('borrow')
  })

  it('combines level + status + part of speech', () => {
    const unknownA1Verbs = applyFilters(words, { ...defaultFilters, level: 'A1', status: 'unknown', pos: 'verb' }, p)
    expect(unknownA1Verbs.length).toBeGreaterThan(10)
    expect(unknownA1Verbs.every((i) => i.level === 'A1' && i.partOfSpeech === 'verb')).toBe(true)
    expect(unknownA1Verbs.some((i) => i.id === 'en-word-know')).toBe(false)
    expect(applyFilters(words, { ...defaultFilters, status: 'known' }, p).map((i) => i.id)).toEqual([
      'en-word-know',
      'en-word-borrow',
    ])
    expect(applyFilters(words, { ...defaultFilters, status: 'favorites' }, p).map((i) => i.id)).toEqual(['en-word-apple'])
  })

  it('sorts A-Z and Z-A', () => {
    const az = applyFilters(words, { ...defaultFilters, sort: 'az' }, p).map((i) => i.sourceText)
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
    expect(applyFilters(words, { ...defaultFilters, sort: 'za' }, p).map((i) => i.sourceText)).toEqual([...az].reverse())
  })

  it('computes progress from checkboxes only', () => {
    const a1 = words.filter((w) => w.level === 'A1')
    expect(progressOf(a1, p)).toEqual({ known: 1, total: a1.length, pct: Math.round((1 / a1.length) * 100) })
  })
})
