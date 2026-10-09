import { useMemo, type CSSProperties } from 'react'
import { useProgress } from '../core/progress'
import { progressOf } from '../core/filter'
import { LEVELS, UI_LANG, type CategoryDef, type ContentItem } from '../core/types'
import { prefs } from '../core/prefs'
import { href, navigate } from '../router'
import { ProgressBar } from '../components/ProgressBar'
import { ProgressRing } from '../components/ProgressRing'
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

const meaning = (it: ContentItem) => (it.translations[UI_LANG] ?? [])[0]

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
  // Most recently added favorites first (the Set keeps insertion order).
  const recentFavs = useMemo(() => {
    const byId = new Map(favItems.map((it) => [it.id, it]))
    return [...progress.favorites]
      .reverse()
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 3) as ContentItem[]
  }, [favItems, progress.favorites])

  // The next few items the user hasn't marked yet, in learning/data order.
  const nextUnknown = (items: ContentItem[], n = 3) => {
    const out: ContentItem[] = []
    for (const it of items) {
      if (!progress.learned.has(it.id)) out.push(it)
      if (out.length === n) break
    }
    return out
  }

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
                <ProgressRing pct={p.pct} size={52} stroke={5} />
              </header>
              <div className="level-grid">
                {LEVELS.map((l) => {
                  const lv = items.filter((it) => it.level === l)
                  const lp = progressOf(lv, progress)
                  const next = nextUnknown(lv)
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
                      <span className="level-row">
                        <span className="level-name">{l}</span>
                        <span className="level-pct">%{lp.pct}</span>
                      </span>
                      <ProgressBar pct={lp.pct} />
                      {next.length > 0 && (
                        <span className="tile-next">
                          <span className="tile-next-label">Sıradaki</span>
                          {next.map((it) => (
                            <span key={it.id} className="tile-next-text" lang={languageId}>
                              <b>{it.sourceText}</b> · {meaning(it)}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="muted small">
                        {fmt(lp.known)} / {fmt(lp.total)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {others.map((c) => {
          const items = byCategory.get(c.id) ?? []
          const p = progressOf(items, progress)
          const next = nextUnknown(items)
          return (
            <a key={c.id} className="dash-panel cat-tile tile-anim" href={href(`${languageId}/c/${c.id}`)} style={anim(TONES[c.id])}>
              <DashIcon name={c.id} className="tile-watermark" />
              <span className="tile-top">
                <span className="tile-icon">
                  <DashIcon name={c.id} />
                </span>
                <ProgressRing pct={p.pct} size={50} stroke={5} />
              </span>
              <span className="cat-tile-name">{c.shortLabel ?? c.label}</span>
              {next.length ? (
                <span className="tile-next">
                  <span className="tile-next-label">Sıradaki</span>
                  {next.map((it) => (
                    <span key={it.id} className="tile-next-text" lang={languageId}>
                      <b>{it.sourceText}</b>
                      {c.kind !== 'grammar' && <> · {meaning(it)}</>}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="tile-next tile-done">Hepsini biliyorsun ✓</span>
              )}
              <span className="muted small">
                {fmt(p.known)} / {fmt(p.total)}
              </span>
            </a>
          )
        })}

        <a className="dash-panel cat-tile tile-anim" href={href(`${languageId}/favorites`)} style={anim(TONES.favorites)}>
          <DashIcon name="favorites" className="tile-watermark" />
          <span className="tile-top">
            <span className="tile-icon">
              <DashIcon name="favorites" />
            </span>
            <span className="fav-count">{fmt(favItems.length)}</span>
          </span>
          <span className="cat-tile-name">Favoriler</span>
          {recentFavs.length ? (
            <span className="tile-next">
              <span className="tile-next-label">Son eklenenler</span>
              {recentFavs.map((it) => (
                <span key={it.id} className="tile-next-text" lang={languageId}>
                  <b>{it.sourceText}</b>
                </span>
              ))}
            </span>
          ) : (
            <span className="tile-next">
              <span className="tile-next-text tile-hint">Bir içeriğin (?) penceresinden ☆ ile ekleyebilirsin.</span>
            </span>
          )}
          <span className="muted small">kayıtlı içerik</span>
        </a>
      </div>
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('tr-TR')
