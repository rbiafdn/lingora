import { memo, useState, type CSSProperties } from 'react'
import { progressStore } from '../core/progress'
import { UI_LANG, type ContentItem } from '../core/types'

/** Letter tiles for the "Alfabe ve Okunuş" category: big glyph, its reading and sound. */
export function AlphabetCards({
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
  if (!items.length) return <div className="empty">{emptyText ?? 'Bu filtrelere uyan harf yok.'}</div>
  return (
    <div className="alphabet-grid" role="list">
      {items.map((it, i) => (
        <LetterCard key={it.id} item={it} index={i} known={learned.has(it.id)} onInfo={onInfo} />
      ))}
    </div>
  )
}

const LetterCard = memo(function LetterCard({
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
      className={`letter-card${known ? ' is-known' : ''}`}
      role="listitem"
      style={{ '--i': Math.min(index, 30) } as CSSProperties}
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
          {pop && <span className="check-burst" onAnimationEnd={(e) => e.animationName === 'check-burst' && setPop(false)} />}
        </span>
      </label>
      {/* The whole tile opens the detail popup; the checkbox sits above it. */}
      <button type="button" className="letter-open" onClick={() => onInfo(item)}>
        <span className="letter-glyph" lang={item.languageId} dir="auto">
          {item.sourceText}
        </span>
        <span className="letter-reading">{item.details?.reading}</span>
        <span className="letter-sound">{(item.translations[UI_LANG] ?? [])[0]}</span>
      </button>
    </article>
  )
})
