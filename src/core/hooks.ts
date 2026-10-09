import { useEffect, useState } from 'react'
import { repository } from './repository'
import type { ContentItem, Language, LanguageManifest } from './types'

type Async<T> = { data?: T; error?: string }

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): Async<T> {
  const [state, setState] = useState<Async<T>>({})
  useEffect(() => {
    let alive = true
    setState({})
    fn().then(
      (data) => alive && setState({ data }),
      (e) => alive && setState({ error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, deps)
  return state
}

export const useLanguages = () => useAsync<Language[]>(() => repository.languages(), [])

export const useManifest = (languageId: string) =>
  useAsync<LanguageManifest>(() => repository.manifest(languageId), [languageId])

export const useAllItems = (languageId: string) =>
  useAsync<ContentItem[]>(() => repository.allItems(languageId), [languageId])

export function useCategoryItems(languageId: string, categoryId: string) {
  return useAsync<ContentItem[]>(async () => {
    const m = await repository.manifest(languageId)
    const cat = m.categories.find((c) => c.id === categoryId)
    if (!cat) throw new Error('Kategori bulunamadı')
    return repository.items(languageId, cat)
  }, [languageId, categoryId])
}
