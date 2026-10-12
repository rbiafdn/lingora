import { useMemo, type CSSProperties } from 'react'
import { useProgress } from '../core/progress'
import { progressOf } from '../core/filter'
import { LEVELS, type CategoryDef, type ContentItem } from '../core/types'
import { prefs } from '../core/prefs'
import { href, navigate } from '../router'
import { ProgressBar } from '../components/ProgressBar'
import { DashIcon } from '../components/DashIcons'
import type { LangContext } from './LanguageShell'

// One muted tone per category; tiles use it for icon, ring and a soft glow.
const TONES: Record<string, string> = {
  words: '#6d7cf0',
  idioms: '#e0795a',
  'phrasal-verbs': '#4fb3a9',
  expressions: '#5b9bd5',
  collocations: '#9b7fd6',
  proverbs: '#c9a24a',
  abbreviations: '#5fa8c9',
  daily: '#d08a5c',
  slang: '#d0607f',
  grammar: '#62b37a',
  favorites: '#e0b23a',
}

// Short static descriptions (not previews) shown under each tile title.
const DESCRIPTIONS: Record<string, string> = {
  idioms: 'Mecazlı kalıp sözler',
  'phrasal-verbs': 'Fiil + edat öbekleri',
  expressions: 'Hazır söz kalıpları',
  collocations: 'Birlikte kullanılan kelimeler',
  proverbs: 'Halk deyişleri',
  abbreviations: 'ASAP, FYI, e.g. …',
  daily: 'Konuşmada sık duyulanlar',
  slang: 'Gündelik ve sokak dili',
  grammar: 'Yapılar ve kurallar',
  favorites: 'Kaydettiğin içerikler',
}

const LEVEL_NAMES: Record<string, string> = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Orta üstü',
  C1: 'İleri',
  C2: 'Ustalık',
}

function orderItems(c: CategoryDef, items: ContentItem[]) {
  if (!c.order?.length) return items
  const rank = new Map(c.order.map((id, i) => [id, i]))
  return [...items].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9))
}

export function Dashboard({ ctx }: { ctx: LangContext }) {
  const { languageId, manifest, allItems } = ctx
  const progress = useProgress(languageId)

  const byCategory = useMemo(() => {
    const m = new Map<string, ContentItem[]>()
    for (const it of allItems) {
      let list = m.get(it.category)
      if (!list) m.set(it.category, (list = []))
      list.push(it)
    }
    for (const c of manifest.categories) m.set(c.id, orderItems(c, m.get(c.id) ?? []))
    return m
  }, [allItems, manifest])

  const favItems = useMemo(
    () => allItems.filter((it) => progress.favorites.has(it.id)),
    [allItems, progress.favorites],
  )
  const levelled = manifest.categories.filter((c) => c.levels)
  const others = manifest.categories.filter((c) => !c.levels)
  let i = 0
  const anim = (tone?: string) => ({ '--i': i++, ...(tone ? { '--tone': tone } : {}) }) as CSSProperties

  return (
    <div className="dashboard">
      <div className="dash-panels">
        {levelled.map((c) => {
          const items = byCategory.get(c.id) ?? []
          const p = progressOf(items, progress)
          return (
            <section key={c.id} className="dash-panel dash-words tile-anim" style={anim(TONES[c.id])}>
              <header className="dash-words-head">
                <span className="tile-icon">
                  <DashIcon name={c.id} />
                </span>
                <div className="dash-words-title">
                  <h2>{c.label}</h2>
                  <span className="muted small">
                    {fmt(p.known)} / {fmt(p.total)} kelime biliniyor
                  </span>
                </div>
              </header>
              <div className="level-grid">
                {LEVELS.map((l) => {
                  const lp = progressOf(
                    items.filter((it) => it.level === l),
                    progress,
                  )
                  return (
                    <button
                      key={l}
                      type="button"
                      className="level-card tile-anim"
                      style={anim()}
                      onClick={() => {
                        prefs.setLevel(languageId, l)
                        navigate(`${languageId}/c/${c.id}`)
                      }}
                    >
                      <span className="level-name">{l}</span>
                      <span className="tile-desc">{LEVEL_NAMES[l]}</span>
                      <span className="tile-count">
                        {fmt(lp.known)} / {fmt(lp.total)}
                      </span>
                      <ProgressBar pct={lp.pct} />
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {others.map((c) => {
          const p = progressOf(byCategory.get(c.id) ?? [], progress)
          return (
            <a key={c.id} className="dash-panel cat-tile tile-anim" href={href(`${languageId}/c/${c.id}`)} style={anim(TONES[c.id])}>
              <DashIcon name={c.id} className="tile-watermark" />
              <span className="tile-icon">
                <DashIcon name={c.id} />
              </span>
              <span className="cat-tile-name">{c.shortLabel ?? c.label}</span>
              <span className="tile-desc">{DESCRIPTIONS[c.id]}</span>
              <span className="tile-count">
                {fmt(p.known)} / {fmt(p.total)}
              </span>
              <ProgressBar pct={p.pct} label={c.label} />
            </a>
          )
        })}

        <a className="dash-panel cat-tile tile-anim" href={href(`${languageId}/favorites`)} style={anim(TONES.favorites)}>
          <DashIcon name="favorites" className="tile-watermark" />
          <span className="tile-icon">
            <DashIcon name="favorites" />
          </span>
          <span className="cat-tile-name">Favoriler</span>
          <span className="tile-desc">{DESCRIPTIONS.favorites}</span>
          <span className="tile-count fav-count">★ {fmt(favItems.length)}</span>
        </a>
      </div>
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('tr-TR')
