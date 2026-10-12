import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { progressStore } from '../core/progress'
import { UI_LANG, type ContentItem } from '../core/types'

// Items are shown as compact cards in an auto-fill grid. The grid is
// virtualized by row against the window scroll: only rows near the viewport are
// in the DOM, so tens of thousands of items stay fast.

const MIN_CARD = 230
const GAP = 8

interface Props {
  items: ContentItem[]
  learned: Set<string>
  onInfo: (item: ContentItem) => void
  emptyText?: string
  /** Small category label on each card (used for mixed result lists). */
  tagOf?: (item: ContentItem) => string | undefined
}

export function ItemList({ items, learned, onInfo, emptyText, tagOf }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const [margin, setMargin] = useState(0)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const measure = () => {
      setMargin(el.getBoundingClientRect().top + window.scrollY)
      setWidth(el.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    ro.observe(el)
    return () => ro.disconnect()
  }, [items.length > 0])

  // Rows on screen when the page opens fade in one after another.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1100)
    return () => clearTimeout(t)
  }, [])

  const cols = Math.max(1, Math.floor((width + GAP) / (MIN_CARD + GAP)))
  const rowCount = Math.ceil(items.length / cols)
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 44 + GAP,
    overscan: 8,
    scrollMargin: margin,
    getItemKey: (i) => `${cols}:${i}`,
  })

  if (!items.length) return <div className="empty">{emptyText ?? 'Bu filtrelere uyan içerik yok.'}</div>

  return (
    <div ref={listRef} className="card-grid" role="list" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((v) => (
        <div
          key={v.key}
          data-index={v.index}
          ref={virtualizer.measureElement}
          className={`card-row${intro ? ' row-in' : ''}`}
          style={
            {
              transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)`,
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              '--i': Math.min(v.index, 16),
            } as CSSProperties
          }
        >
          {items.slice(v.index * cols, v.index * cols + cols).map((item) => (
            <ItemCard key={item.id} item={item} known={learned.has(item.id)} onInfo={onInfo} tag={tagOf?.(item)} />
          ))}
        </div>
      ))}
    </div>
  )
}

const ItemCard = memo(function ItemCard({
  item,
  known,
  onInfo,
  tag,
}: {
  item: ContentItem
  known: boolean
  onInfo: (item: ContentItem) => void
  tag?: string
}) {
  const isGrammar = !!item.grammar
  const meaning = (item.translations[UI_LANG] ?? []).join(', ')
  const [pop, setPop] = useState(false)
  return (
    <div className={`item-card${known ? ' is-known' : ''}`} role="listitem">
      {/* Only the checkbox toggles "known": tapping the text does nothing, so a
          stray tap while scrolling can't change progress. */}
      <label className={`item-check${pop ? ' pop' : ''}`}>
        <input
          type="checkbox"
          checked={known}
          onChange={(e) => {
            progressStore.setLearned(item.languageId, item.id, e.target.checked)
            if (e.target.checked) setPop(true)
          }}
          aria-label={`${item.sourceText}: biliyorum`}
        />
        <span className="box" aria-hidden="true">
          {/* A small sparkle when an item is marked as known. */}
          {pop && <span className="check-burst" onAnimationEnd={(e) => e.animationName === 'check-burst' && setPop(false)} />}
        </span>
      </label>
      <span className="item-text">
        <span className="item-source" lang={item.languageId}>
          {item.sourceText}
        </span>
        {meaning && (
          <>
            <span className="item-sep">{isGrammar ? ' · ' : ' : '}</span>
            <span className="item-meaning">{meaning}</span>
          </>
        )}
        {tag && <span className="item-tag">{tag}</span>}
      </span>
      <button type="button" className="info-btn" onClick={() => onInfo(item)} aria-label={`${item.sourceText} detayları`}>
        ?
      </button>
    </div>
  )
})
