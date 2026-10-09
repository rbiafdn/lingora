import { memo } from 'react'
import { progressStore } from '../core/progress'
import { UI_LANG, type ContentItem, type GrammarSection, type SectionKind } from '../core/types'

export const KIND_LABELS: Record<SectionKind, string> = {
  affirmative: 'Olumlu',
  negative: 'Olumsuz',
  question: 'Soru',
  'negative-question': 'Olumsuz soru',
  wh: 'WH',
  'short-answers': 'Kısa cevap',
  other: '',
}

const PREFERRED: SectionKind[] = ['affirmative', 'negative', 'question', 'wh']

/** The 3–4 structures shown on a topic's overview card. */
export function cardSections(item: ContentItem): GrammarSection[] {
  const withFormula = (item.grammar?.sections ?? []).filter((s) => s.formula?.length)
  const standard = PREFERRED.map((k) => withFormula.find((s) => s.kind === k)).filter(Boolean) as GrammarSection[]
  if (standard.length >= 3) return standard
  return withFormula.slice(0, 4)
}

export const sectionLabel = (s: GrammarSection) => KIND_LABELS[s.kind] || s.title

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
  const sections = cardSections(item)
  return (
    <article className={`grammar-card${known ? ' is-known' : ''}`} role="listitem">
      <header className="gc-head">
        <label className="gc-known">
          <input
            type="checkbox"
            checked={known}
            onChange={(e) => progressStore.setLearned(item.languageId, item.id, e.target.checked)}
            aria-label={`${item.sourceText}: biliyorum`}
          />
          <span className="box" aria-hidden="true" />
        </label>
        <div className="gc-title">
          <h3 lang={item.languageId}>{item.sourceText}</h3>
          <span className="gc-sub">{(item.translations[UI_LANG] ?? [])[0]}</span>
        </div>
      </header>

      <dl className="gc-structs">
        {sections.map((s) => (
          <div key={s.title} className="gc-struct">
            <dt>{sectionLabel(s)}</dt>
            <dd>
              <span className="gc-formula">
                {s.formula!.map((p, i) => (
                  <span key={i} className={`gc-part role-${p.role ?? 'x'}`}>
                    {p.tr}
                  </span>
                ))}
              </span>
              <span className="gc-formula-en" lang={item.languageId}>
                {s.formula!.map((p) => p.en).join(' + ')}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <button type="button" className="gc-detail" onClick={() => onInfo(item)}>
        Detay
      </button>
    </article>
  )
})
