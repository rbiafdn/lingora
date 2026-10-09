import { Fragment, type ReactNode } from 'react'
import { Modal } from './Modal'
import { progressStore, useProgress } from '../core/progress'
import { POS_LABELS, REGISTERS, REGISTER_HINT } from '../core/labels'
import { UI_LANG, type ContentItem, type Example, type GrammarSection } from '../core/types'

export function DetailModal({
  item,
  categoryLabel,
  showLevel,
  onClose,
}: {
  item: ContentItem
  categoryLabel?: string
  /** CEFR level is only shown for categories that use levels (words). */
  showLevel?: boolean
  onClose: () => void
}) {
  const progress = useProgress(item.languageId)
  const fav = progress.favorites.has(item.id)
  const known = progress.learned.has(item.id)
  const isGrammar = !!item.grammar
  const meanings = item.translations[UI_LANG] ?? []
  const d = item.details ?? {}
  const pos = item.partOfSpeech ? (POS_LABELS[item.partOfSpeech] ?? item.partOfSpeech).split(' · ')[0] : null

  return (
    <Modal onClose={onClose} labelledBy="detail-title" wide={isGrammar}>
      <header className="detail-head">
        <h2 id="detail-title" className={isGrammar ? 'grammar-title' : undefined} lang={item.languageId}>
          {item.sourceText}
        </h2>
        {d.expansion && (
          <div className="detail-expansion" lang={item.languageId}>
            {d.expansion}
          </div>
        )}
        <div className="detail-meta">
          {[pos, showLevel ? item.level : null, categoryLabel].filter(Boolean).join(' · ')}
          {known && <span className="known-tag"> · ✓ Biliyorum</span>}
        </div>
        {meanings.length > 0 && <p className="detail-meaning">{meanings.join(', ')}</p>}
      </header>

      <div className="detail-body">{isGrammar ? <GrammarBody item={item} /> : <LexicalBody item={item} />}</div>

      <footer className="detail-foot">
        <button
          type="button"
          className={`fav-btn${fav ? ' is-fav' : ''}`}
          aria-pressed={fav}
          onClick={() => progressStore.setFavorite(item.languageId, item.id, !fav)}
        >
          <span aria-hidden="true">{fav ? '★' : '☆'}</span> {fav ? 'Favorilerde' : 'Favorilere ekle'}
        </button>
      </footer>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="field-value">{children}</div>
    </div>
  )
}

function Examples({ examples, lang }: { examples: Example[]; lang: string }) {
  return (
    <div className="examples">
      {examples.map((ex, i) => (
        <div className="example" key={i}>
          <div className="example-src" lang={lang}>
            <MarkedText text={ex.text} />
          </div>
          {ex.tr && <div className="example-tr">{ex.tr}</div>}
        </div>
      ))}
    </div>
  )
}

/**
 * Short, same-shaped popup for every non-grammar category: only what helps
 * answer "what do I need to know about this?". Long lists (synonyms, related
 * phrases…) stay in the data but are not shown.
 */
function LexicalBody({ item }: { item: ContentItem }) {
  const d = item.details ?? {}
  const example = item.examples?.[0]
  const explanation = d.explanation ?? d.meaning
  const chips: { text: string; title?: string; cls?: string }[] = []
  if (d.separable !== undefined) chips.push({ text: d.separable ? 'Separable · ayrılabilir' : 'Inseparable · ayrılamaz' })
  if (d.register && d.register !== 'neutral')
    chips.push({ text: REGISTERS.find((r) => r.id === d.register)?.label ?? d.register, cls: `reg-chip reg-${d.register}` })
  if (d.context && item.category === 'abbreviations') chips.push({ text: d.context })

  return (
    <>
      {d.otherMeanings?.length ? <p className="detail-also">Ayrıca: {d.otherMeanings.slice(0, 2).join(', ')}</p> : null}
      {explanation && <p className="detail-text">{explanation}</p>}
      {d.context && item.category !== 'abbreviations' && <p className="detail-text">{d.context}</p>}
      {d.usage && <p className="detail-note">{d.usage}</p>}
      {d.turkishEquivalent && (
        <p className="detail-text">
          <span className="muted">Türkçede:</span> {d.turkishEquivalent}
        </p>
      )}
      {example && (
        <Field label="Örnek">
          <Examples examples={[example]} lang={item.languageId} />
        </Field>
      )}
      {(d.pronunciation?.uk || d.pronunciation?.us) && (
        <p className="detail-pron" lang={item.languageId}>
          {d.pronunciation.uk && (
            <span>
              <b>UK</b> {d.pronunciation.uk}
            </span>
          )}
          {d.pronunciation.uk && d.pronunciation.us && <span className="muted"> · </span>}
          {d.pronunciation.us && (
            <span>
              <b>US</b> {d.pronunciation.us}
            </span>
          )}
        </p>
      )}
      {chips.length > 0 && (
        <div className="detail-chips">
          {chips.map((c) => (
            <span key={c.text} className={`chip ${c.cls ?? ''}`}>
              {c.text}
            </span>
          ))}
        </div>
      )}
      {d.register && d.register !== 'neutral' && d.register !== 'formal' && (
        <p className="register-hint">{REGISTER_HINT[d.register]}</p>
      )}
    </>
  )
}

function GrammarBody({ item }: { item: ContentItem }) {
  const g = item.grammar!
  const lang = item.languageId
  return (
    <>
      {g.summary && <p className="grammar-summary">{g.summary}</p>}
      {g.uses?.length ? (
        <div className="gr-uses">
          <span className="field-label">Ne zaman?</span>
          {g.uses.map((u) => (
            <span key={u} className="chip">
              {u}
            </span>
          ))}
        </div>
      ) : null}
      <Legend />
      {g.sections.map((s) => (
        <GrammarBlock key={s.title} section={s} lang={item.languageId} />
      ))}
      {g.rules?.length ? (
        <section className="gr-extra">
          <h3>Önemli kurallar</h3>
          <ul>
            {g.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {g.exceptions?.length ? (
        <section className="gr-extra">
          <h3>İstisnalar</h3>
          <ul>
            {g.exceptions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {g.mistakes?.length ? (
        <section className="gr-extra">
          <h3>Yaygın hatalar</h3>
          <div className="mistakes">
            {g.mistakes.map((m) => (
              <div className="mistake" key={m.wrong}>
                <div className="mistake-wrong" lang={lang}>
                  <span aria-label="Yanlış">✗</span> {m.wrong}
                </div>
                <div className="mistake-right" lang={lang}>
                  <span aria-label="Doğru">✓</span> {m.right}
                </div>
                {m.note && <div className="mistake-note">{m.note}</div>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

function GrammarBlock({ section, lang }: { section: GrammarSection; lang: string }) {
  return (
    <section className="gr-section">
      <h3>{section.title}</h3>
      {section.formula && (
        <div className="formula" aria-label="Cümle yapısı">
          {section.formula.map((p, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="plus">+</span>}
              <span className={`part role-${p.role ?? 'x'}`}>
                <span className="part-tr">{p.tr}</span>
                <span className="part-en">{p.en}</span>
              </span>
            </Fragment>
          ))}
        </div>
      )}
      {section.formula && (
        <div className="formula-text">
          <div>
            <b>TR</b> {section.formula.map((p) => p.tr).join(' + ')}
          </div>
          <div lang={lang}>
            <b>EN</b> {section.formula.map((p) => p.en).join(' + ')}
          </div>
        </div>
      )}
      {section.examples && <Examples examples={section.examples} lang={lang} />}
      {section.notes?.map((n) => (
        <p className="gr-note" key={n}>
          <b>Not:</b> {n}
        </p>
      ))}
    </section>
  )
}

const ROLES: [string, string][] = [
  ['q', 'Soru kelimesi'],
  ['s', 'Özne'],
  ['a', 'Yardımcı fiil'],
  ['v', 'Fiil'],
  ['o', 'Nesne / tümleç'],
]

function Legend() {
  return (
    <div className="legend" aria-hidden="true">
      {ROLES.map(([r, l]) => (
        <span key={r} className={`legend-item role-${r}`}>
          <i />
          {l}
        </span>
      ))}
    </div>
  )
}

/** Renders "[s:He] [v:plays]" with each marked part underlined by its role color. */
function MarkedText({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /\[(\w):([^\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <span key={m.index} className={`mark role-${m[1]}`}>
        {m[2]}
      </span>,
    )
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
