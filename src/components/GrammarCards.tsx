import { memo } from 'react'
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
      {items.map((it) => (
        <GrammarCard key={it.id} item={it} known={learned.has(it.id)} onInfo={onInfo} />
      ))}
    </div>
  )
}

const GrammarCard = memo(function GrammarCard({
  item,
  known,
  onInfo,
}: {
  item: ContentItem
  known: boolean
  onInfo: (item: ContentItem) => void
}) {
  return (
    <article className={`grammar-card${known ? ' is-known' : ''}`} role="listitem">
      <label className="gc-known">
        <input
          type="checkbox"
          checked={known}
          onChange={(e) => progressStore.setLearned(item.languageId, item.id, e.target.checked)}
          aria-label={`${item.sourceText}: biliyorum`}
        />
        <span className="box" aria-hidden="true" />
      </label>
      {/* The whole card opens the detail popup; the checkbox sits above it. */}
      <button type="button" className="gc-open" onClick={() => onInfo(item)}>
        <span className="gc-title-text" lang={item.languageId}>
          {item.sourceText}
        </span>
        <span className="gc-sub">{(item.translations[UI_LANG] ?? [])[0]}</span>
      </button>
    </article>
  )
})
