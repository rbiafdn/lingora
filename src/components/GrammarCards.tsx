import { memo, useState, type CSSProperties } from 'react'
import { progressStore } from '../core/progress'
import { UI_LANG, type ContentItem } from '../core/types'

export function GrammarCards({
  items,
  learned,
  onInfo,
  emptyText,
}: {
  items: ContentItem[]
  learned: Set<string>
  onInfo: (item: ContentItem) => void
  emptyText?: string
}) {
  if (!items.length) return <div className="empty">{emptyText ?? 'Bu filtrelere uyan konu yok.'}</div>
  return (
    <div className="grammar-grid" role="list">
      {items.map((it, i) => (
        <GrammarCard key={it.id} item={it} index={i} known={learned.has(it.id)} onInfo={onInfo} />
      ))}
    </div>
  )
}

const GrammarCard = memo(function GrammarCard({
  item,
  index,
  known,
  onInfo,
}: {
  item: ContentItem
  index: number
  known: boolean
  onInfo: (item: ContentItem) => void
}) {
  const [pop, setPop] = useState(false)
  return (
    <article
      className={`grammar-card${known ? ' is-known' : ''}`}
      role="listitem"
      style={{ '--i': Math.min(index, 24) } as CSSProperties}
    >
      <label className={`gc-known${pop ? ' pop' : ''}`}>
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
      {/* The whole card opens the detail popup; the checkbox sits above it. */}
      <button type="button" className="gc-open" onClick={() => onInfo(item)}>
        <span className="gc-title-text" lang={item.languageId} dir="auto">
          {item.sourceText}
        </span>
        {item.details?.reading && <span className="gc-reading">{item.details.reading}</span>}
        <span className="gc-sub">{(item.translations[UI_LANG] ?? [])[0]}</span>
      </button>
    </article>
  )
})
