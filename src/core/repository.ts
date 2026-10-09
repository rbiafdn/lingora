import type { CategoryDef, ContentItem, Language, LanguageManifest } from './types'

// Content data layer. Everything is fetched from /data so content can grow,
// be swapped for an API, or gain new languages without touching UI code.

const base = `${import.meta.env.BASE_URL}data`
const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${base}/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const repository = {
  languages: () => load<Language[]>('languages.json'),
  manifest: (languageId: string) => load<LanguageManifest>(`${languageId}/manifest.json`),
  async items(languageId: string, category: CategoryDef): Promise<ContentItem[]> {
    const parts = await Promise.all(category.files.map((f) => load<ContentItem[]>(`${languageId}/${f}`)))
    return parts.flat()
  },
  async allItems(languageId: string): Promise<ContentItem[]> {
    const m = await repository.manifest(languageId)
    const lists = await Promise.all(m.categories.map((c) => repository.items(languageId, c)))
    return lists.flat()
  },
}
