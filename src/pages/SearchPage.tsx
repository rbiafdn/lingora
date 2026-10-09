import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useProgress } from '../core/progress'
import { applyFilters, defaultFilters, normalize, statusCounts, type Filters } from '../core/filter'
import type { ContentItem } from '../core/types'
import { FilterBar } from '../components/FilterBar'
import { ItemList } from '../components/ItemList'
import { DetailModal } from '../components/DetailModal'
import { PageHead } from '../components/ProgressBar'
import type { LangContext } from './LanguageShell'

/** Global search across every category of the language. */
export function SearchPage({ ctx, query }: { ctx: LangContext; query: string }) {
  const { languageId, manifest, allItems } = ctx
  const progress = useProgress(languageId)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [open, setOpen] = useState<ContentItem | null>(null)
  const closeModal = useCallback(() => setOpen(null), [])
  const q = useDeferredValue(query.trim())

  const { status, category, sort } = filters
  const results = useMemo(() => {
    if (!q) return []
    const found = applyFilters(allItems, { ...defaultFilters, query: q, category, sort }, progress)
    if (sort !== 'default') return found
    // Best matches first: exact, then starts-with, then anywhere.
    const nq = normalize(q)
    const rank = (it: ContentItem) => {
      const s = normalize(it.sourceText)
      return s === nq ? 0 : s.startsWith(nq) ? 1 : 2
    }
    return found.map((it, i) => [rank(it), i, it] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2])
  }, [allItems, q, category, sort, progress])
  const visible = useMemo(
    () => (status === 'all' ? results : applyFilters(results, { ...defaultFilters, status }, progress)),
    [results, status, progress],
  )
  const counts = useMemo(() => statusCounts(results, progress), [results, progress])

  const catOf = useCallback((id: string) => manifest.categories.find((c) => c.id === id), [manifest])
  // Only categories with levels (words) show the CEFR level in the tag.
  const tagOf = useCallback((it: ContentItem) => {
    const c = catOf(it.category)
    return c?.levels ? `${c.shortLabel ?? c.label} · ${it.level}` : c?.shortLabel
  }, [catOf])

  return (
    <div className="category-page">
      <PageHead title="Arama" sub={q ? `“${q}” için ${results.length} sonuç` : 'Üstteki kutuya yazarak tüm kategorilerde ara.'} />
      {q && (
        <>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            categories={manifest.categories}
            statusCounts={counts}
            hideLevel
            hideSearch
          />
          <ItemList
            items={visible}
            learned={progress.learned}
            onInfo={setOpen}
            tagOf={tagOf}
            emptyText="Sonuç bulunamadı."
          />
        </>
      )}
      {open && <DetailModal
          item={open}
          categoryLabel={catOf(open.category)?.label}
          showLevel={!!catOf(open.category)?.levels}
          onClose={closeModal}
        />}
    </div>
  )
}
