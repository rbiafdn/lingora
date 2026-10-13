import { useCallback, useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import { useProgress } from '../core/progress'
import { applyFilters, defaultFilters, progressOf, statusCounts, type Filters } from '../core/filter'
import type { ContentItem } from '../core/types'
import { prefs, useLevel } from '../core/prefs'
import { FilterBar } from '../components/FilterBar'
import { ItemList } from '../components/ItemList'
import { PageHead } from '../components/ProgressBar'
import { GrammarCards } from '../components/GrammarCards'
import { AlphabetCards } from '../components/AlphabetCards'
import { DetailModal } from '../components/DetailModal'
import { TONE, DEFAULT_TONE } from '../core/palette'
import type { LangContext } from './LanguageShell'

export function CategoryPage({ ctx, categoryId }: { ctx: LangContext; categoryId: string }) {
  const { languageId, manifest, allItems } = ctx
  const category = manifest.categories.find((c) => c.id === categoryId)
  const progress = useProgress(languageId)

  // Level is a per-language preference shared with the dashboard; the other
  // filters (except the search text) are remembered per category.
  // Only categories that opt in (manifest "levels") use CEFR levels in the UI.
  const showLevels = !!category?.levels
  const savedLevel = useLevel(languageId)
  const level = showLevels ? savedLevel : 'all'
  const prefsKey = `${languageId}:${categoryId}`
  const [local, setLocal] = useState<Omit<Filters, 'level'>>(() => ({
    ...defaultFilters,
    ...prefs.get().filters[prefsKey],
  }))
  const filters: Filters = { ...local, level }
  const setFilters = (f: Filters) => {
    const { level: nextLevel, ...rest } = f
    setLocal(rest)
    prefs.setFilters(prefsKey, { status: rest.status, pos: rest.pos, sort: rest.sort })
    if (showLevels && nextLevel !== level) prefs.setLevel(languageId, nextLevel)
  }

  const [open, setOpen] = useState<ContentItem | null>(null)
  const closeModal = useCallback(() => setOpen(null), [])

  const items = useMemo(() => {
    const list = allItems.filter((it) => it.category === categoryId)
    const order = category?.order
    if (!order?.length) return list
    const rank = new Map(order.map((id, i) => [id, i]))
    return list
      .map((it, i) => [rank.get(it.id) ?? order.length + i, it] as const)
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1])
  }, [allItems, categoryId, category])
  const posOptions = useMemo(
    () => [...new Set(items.map((it) => it.partOfSpeech).filter(Boolean) as string[])].sort(),
    [items],
  )

  // Deferred so typing in the search box stays responsive on huge lists.
  const query = useDeferredValue(local.query)
  const { status, pos, sort } = local
  const visible = useMemo(
    () => applyFilters(items, { ...defaultFilters, status, pos, sort, level, query }, progress),
    [items, progress, status, pos, sort, level, query],
  )
  const counts = useMemo(
    () => statusCounts(applyFilters(items, { ...defaultFilters, pos, level, query }, progress), progress),
    [items, progress, pos, level, query],
  )

  if (!category) return <p className="error">Kategori bulunamadı.</p>

  const scope = level === 'all' ? items : items.filter((it) => it.level === level)
  const p = progressOf(scope, progress)
  const emptyText =
    filters.status === 'favorites' ? 'Henüz favori yok. Bir içeriğin (?) penceresinden ☆ ile ekleyebilirsin.' : undefined

  return (
    <div className="category-page" style={{ '--cat': TONE[categoryId] ?? DEFAULT_TONE } as CSSProperties}>
      <div className="list-head">
        <PageHead
        title={
          <>
            {level !== 'all' && <span className="muted">{level} </span>}
            {category.label}
          </>
        }
        progress={p}
        />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          posOptions={posOptions}
          statusCounts={counts}
          hideLevel={!showLevels}
        />
      </div>

      {category.kind === 'grammar' ? (
        <GrammarCards items={visible} learned={progress.learned} onInfo={setOpen} emptyText={emptyText} />
      ) : category.kind === 'alphabet' ? (
        <AlphabetCards items={visible} learned={progress.learned} onInfo={setOpen} emptyText={emptyText} />
      ) : (
        <ItemList items={visible} learned={progress.learned} onInfo={setOpen} emptyText={emptyText} />
      )}

      {open && <DetailModal item={open} categoryLabel={category.label} showLevel={showLevels} onClose={closeModal} />}
    </div>
  )
}
