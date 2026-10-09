import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useProgress } from '../core/progress'
import { applyFilters, defaultFilters, statusCounts, type Filters } from '../core/filter'
import type { ContentItem } from '../core/types'
import { prefs } from '../core/prefs'
import { FilterBar } from '../components/FilterBar'
import { ItemList } from '../components/ItemList'
import { DetailModal } from '../components/DetailModal'
import { PageHead } from '../components/ProgressBar'
import type { LangContext } from './LanguageShell'

export function FavoritesPage({ ctx }: { ctx: LangContext }) {
  const { languageId, manifest, allItems } = ctx
  const progress = useProgress(languageId)
  const prefsKey = `${languageId}:favorites`
  const [filters, setFiltersState] = useState<Filters>(() => ({ ...defaultFilters, ...prefs.get().filters[prefsKey] }))
  const setFilters = (f: Filters) => {
    setFiltersState(f)
    prefs.setFilters(prefsKey, { status: f.status, pos: f.pos, sort: f.sort, category: f.category })
  }
  const [open, setOpen] = useState<ContentItem | null>(null)
  const closeModal = useCallback(() => setOpen(null), [])

  const favItems = useMemo(
    () => allItems.filter((it) => progress.favorites.has(it.id)),
    [allItems, progress.favorites],
  )
  const query = useDeferredValue(filters.query)
  const { status, category, sort } = filters
  const level = 'all' as const
  const visible = useMemo(
    () => applyFilters(favItems, { ...defaultFilters, status, level, category, sort, query }, progress),
    [favItems, progress, status, level, category, sort, query],
  )
  const counts = useMemo(
    () => statusCounts(applyFilters(favItems, { ...defaultFilters, level, category, query }, progress), progress),
    [favItems, progress, level, category, query],
  )
  const label = (id: string) => manifest.categories.find((c) => c.id === id)?.label
  const catOf = (id: string) => manifest.categories.find((c) => c.id === id)
  const tagOf = useCallback(
    (it: ContentItem) => {
      const c = manifest.categories.find((x) => x.id === it.category)
      return c?.levels ? `${c.shortLabel ?? c.label} · ${it.level}` : c?.shortLabel
    },
    [manifest],
  )

  return (
    <div className="category-page">
      <PageHead title="Favoriler" sub={`${favItems.length} içerik · tüm kategorilerden`} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={manifest.categories}
        statusCounts={counts}
        hideFavoritesStatus
        hideLevel
      />

      <ItemList
        items={visible}
        learned={progress.learned}
        onInfo={setOpen}
        tagOf={tagOf}
        emptyText={
          favItems.length
            ? 'Bu filtrelere uyan favori yok.'
            : 'Henüz favori yok. Bir içeriğin (?) penceresinden ☆ Favorilere ekle ile kaydedebilirsin.'
        }
      />

      {open && <DetailModal
          item={open}
          categoryLabel={label(open.category)}
          showLevel={!!catOf(open.category)?.levels}
          onClose={closeModal}
        />}
    </div>
  )
}
