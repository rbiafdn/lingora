import { useEffect, useRef, useState } from 'react'
import { POS_LABELS, STATUS_LABELS } from '../core/labels'
import { defaultFilters, type Filters, type SortOrder, type StatusFilter } from '../core/filter'
import { LEVELS, type CategoryDef, type Level } from '../core/types'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  posOptions?: string[]
  categories?: CategoryDef[]
  statusCounts?: Partial<Record<StatusFilter, number>>
  hideFavoritesStatus?: boolean
  /** Hide the level chips (e.g. on the search page). */
  hideLevel?: boolean
  /** Hide the in-page search box (when the page already has one). */
  hideSearch?: boolean
}

export function FilterBar({
  filters,
  onChange,
  posOptions,
  categories,
  statusCounts,
  hideFavoritesStatus,
  hideLevel,
  hideSearch,
}: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v })
  const statuses = (Object.keys(STATUS_LABELS) as StatusFilter[]).filter(
    (s) => !(hideFavoritesStatus && s === 'favorites'),
  )
  // "Filtreleri temizle" never touches the level: leaving a level is a separate, explicit action.
  const filtersActive =
    filters.status !== 'all' ||
    filters.pos !== 'all' ||
    filters.sort !== 'default' ||
    filters.category !== 'all' ||
    filters.query !== ''

  // Everything except the search box lives in a small "Filtre" menu, so the
  // page header stays a single row.
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (!hideLevel && filters.level !== 'all' ? 1 : 0) +
    (filters.pos !== 'all' ? 1 : 0) +
    (filters.sort !== 'default' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0)

  return (
    <div className="filter-bar">
      {!hideSearch && (
        <div className="fb-search">
          <input
            type="search"
            placeholder="Bu listede ara"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            aria-label="Bu listede ara"
          />
        </div>
      )}

      <div className="fb-menu" ref={menuRef}>
        <button
          type="button"
          className={`fb-toggle${open ? ' is-open' : ''}${activeCount ? ' is-active' : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {filters.status !== 'all' ? STATUS_LABELS[filters.status] : 'Filtre'}
          {activeCount > 0 && <span className="fb-badge">{activeCount}</span>}
        </button>

        {open && (
          <div className="fb-pop" role="dialog" aria-label="Filtreler">
            <div className="fb-section">
              <span className="fb-title">Durum</span>
              <div className="fb-group segmented" role="tablist" aria-label="Durum">
                {statuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={filters.status === s}
                    className={filters.status === s ? 'is-on' : ''}
                    onClick={() => set('status', s)}
                  >
                    {STATUS_LABELS[s]}
                    {statusCounts?.[s] !== undefined && <span className="count">{statusCounts[s]}</span>}
                  </button>
                ))}
              </div>
            </div>

            {!hideLevel && (
              <div className="fb-section">
                <span className="fb-title">Seviye</span>
                <div className="fb-group level-chips" role="group" aria-label="CEFR seviyesi">
                  {(['all', ...LEVELS] as (Level | 'all')[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={filters.level === l}
                      className={filters.level === l ? 'is-on' : ''}
                      onClick={() => set('level', l)}
                    >
                      {l === 'all' ? 'Tümü' : l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="fb-section">
              <span className="fb-title">Sırala</span>
              <div className="fb-group selects">
                {categories && (
                  <select value={filters.category} onChange={(e) => set('category', e.target.value)} aria-label="İçerik türü">
                    <option value="all">Tüm türler</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortLabel ?? c.label}
                      </option>
                    ))}
                  </select>
                )}
                {posOptions && posOptions.length > 0 && (
                  <select value={filters.pos} onChange={(e) => set('pos', e.target.value)} aria-label="Kelime türü">
                    <option value="all">Kelime türü</option>
                    {posOptions.map((p) => (
                      <option key={p} value={p}>
                        {POS_LABELS[p] ?? p}
                      </option>
                    ))}
                  </select>
                )}
                <select value={filters.sort} onChange={(e) => set('sort', e.target.value as SortOrder)} aria-label="Sıralama">
                  <option value="default">Sıra</option>
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                </select>
              </div>
            </div>

            {(filtersActive || (!hideLevel && filters.level !== 'all')) && (
              <div className="fb-group fb-links">
                {filtersActive && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onChange({ ...defaultFilters, level: filters.level })}
                  >
                    Filtreleri temizle
                  </button>
                )}
                {!hideLevel && filters.level !== 'all' && (
                  <button type="button" className="link-btn" onClick={() => set('level', 'all')}>
                    Seviye seçimini kaldır
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
