import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useProgress } from '../core/progress'
import { progressOf } from '../core/filter'
import { LEVELS, type ContentItem, type Level } from '../core/types'
import { prefs } from '../core/prefs'
import { navigate } from '../router'
import { DashIcon } from '../components/DashIcons'
import { computeGeometry } from './orbitLayout'
import { TONE, DEFAULT_TONE } from '../core/palette'
import type { LangContext } from './LanguageShell'

// Orbit dashboard: a tidy, static layout (see orbitLayout.ts) — centre ring,
// the Kelimeler orb above it with its CEFR level orbs, and the other categories
// on an ellipse around. Orbs only float gently in place; nothing can be dragged.

const LEVEL_TONE: Record<Level, string> = {
  A1: '#cfe0f3',
  A2: '#a9c4e6',
  B1: '#7fa8dc',
  B2: '#5f8fc8',
  C1: '#4a78b0',
  C2: '#f07a45',
}
const LEVEL_NAMES: Record<Level, string> = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Orta üstü',
  C1: 'İleri',
  C2: 'Ustalık',
}
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
const ORBIT_ORDER = [
  'idioms',
  'phrasal-verbs',
  'expressions',
  'collocations',
  'proverbs',
  'abbreviations',
  'daily',
  'slang',
  'grammar',
  'favorites',
]
const fmt = (n: number) => n.toLocaleString('tr-TR')

interface OrbInfo {
  key: string
  label: string
  sub: string
  known: number
  total: number
  color: string
  size: number // diameter px
  icon?: string
  text?: string
  kind: 'cat' | 'words' | 'level'
  onOpen: () => void
  delay: number
}

export function Dashboard({ ctx }: { ctx: LangContext }) {
  const { languageId, manifest, allItems } = ctx
  const progress = useProgress(languageId)
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ W: 0, H: 0 })

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () =>
      setSize((s) => (s.W === el.clientWidth && s.H === el.clientHeight ? s : { W: el.clientWidth, H: el.clientHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const byCategory = useMemo(() => {
    const m = new Map<string, ContentItem[]>()
    for (const it of allItems) {
      let list = m.get(it.category)
      if (!list) m.set(it.category, (list = []))
      list.push(it)
    }
    return m
  }, [allItems])

  const wordsCat = manifest.categories.find((c) => c.levels)
  const words = wordsCat ? (byCategory.get(wordsCat.id) ?? []) : []
  const wordsP = progressOf(words, progress)
  const favCount = useMemo(
    () => allItems.reduce((n, it) => n + (progress.favorites.has(it.id) ? 1 : 0), 0),
    [allItems, progress.favorites],
  )

  const catIds = ORBIT_ORDER.filter((id) => id === 'favorites' || manifest.categories.some((c) => c.id === id))
  for (const c of manifest.categories) if (!c.levels && !catIds.includes(c.id)) catIds.splice(-1, 0, c.id)

  const geo = useMemo(() => computeGeometry(size.W, size.H, catIds.length), [size.W, size.H, catIds.length])

  let delay = 0
  const cluster: OrbInfo[] = []
  if (wordsCat && geo) {
    cluster.push({
      key: wordsCat.id,
      label: wordsCat.label,
      sub: 'Tüm seviyeler',
      known: wordsP.known,
      total: wordsP.total,
      color: TONE.words,
      size: geo.wordsR * 2,
      icon: wordsCat.id,
      kind: 'words',
      onOpen: () => {
        prefs.setLevel(languageId, 'all')
        navigate(`${languageId}/c/${wordsCat.id}`)
      },
      delay: delay++,
    })
    for (const l of LEVELS) {
      const p = progressOf(
        words.filter((it) => it.level === l),
        progress,
      )
      cluster.push({
        key: `lvl-${l}`,
        label: l,
        sub: LEVEL_NAMES[l],
        known: p.known,
        total: p.total,
        color: LEVEL_TONE[l],
        size: geo.levelR * 2,
        text: l,
        kind: 'level',
        onOpen: () => {
          prefs.setLevel(languageId, l)
          navigate(`${languageId}/c/${wordsCat.id}`)
        },
        delay: delay++,
      })
    }
  }
  const cats: OrbInfo[] = catIds.map((id) => {
    if (id === 'favorites')
      return {
        key: id,
        label: 'Favoriler',
        sub: DESCRIPTIONS.favorites,
        known: favCount,
        total: -1,
        color: TONE.favorites,
        size: geo?.catSize ?? 0,
        icon: 'favorites',
        kind: 'cat',
        onOpen: () => navigate(`${languageId}/favorites`),
        delay: delay++,
      }
    const c = manifest.categories.find((x) => x.id === id)!
    const p = progressOf(byCategory.get(id) ?? [], progress)
    return {
      key: id,
      label: c.shortLabel ?? c.label,
      sub: DESCRIPTIONS[id] ?? '',
      known: p.known,
      total: p.total,
      color: TONE[id] ?? DEFAULT_TONE,
      size: geo?.catSize ?? 0,
      icon: id,
      kind: 'cat',
      onOpen: () => navigate(`${languageId}/c/${id}`),
      delay: delay++,
    }
  })

  return (
    <div className="orbit-dash">
      <div className="orbit-stage" ref={stageRef}>
        {geo && (
          <>
            <svg className="orbit-lines" viewBox={`0 0 ${geo.W} ${geo.H}`} aria-hidden="true">
              <circle className="orbit-ring" cx={geo.center.x} cy={geo.center.y} r={geo.ringR * 1.3} />
              <circle
                className="orbit-ring orbit-ring-outer"
                cx={geo.center.x}
                cy={geo.center.y}
                r={geo.ringR * 1.75}
              />
            </svg>


            {/* Ring, Kelimeler badge and levels float together as one piece. */}
            <div className="cluster-float">
              <CenterRing
                known={wordsP.known}
                total={wordsP.total}
                style={
                  { left: geo.center.x, top: geo.center.y, width: geo.ringR * 2, '--ring': `${geo.ringR * 2}px` } as CSSProperties
                }
              />
              <svg className="orbit-lines" viewBox={`0 0 ${geo.W} ${geo.H}`} aria-hidden="true">
                {LEVELS.map((l, i) => (
                  <line
                    key={l}
                    className="orbit-link"
                    x1={geo.words.x}
                    y1={geo.words.y}
                    x2={geo.levels[i].x}
                    y2={geo.levels[i].y}
                    style={{ stroke: LEVEL_TONE[l] }}
                  />
                ))}
              </svg>
              {cluster.map((o, i) => {
                const p = i === 0 ? geo.words : geo.levels[i - 1]
                return <Orb key={o.key} o={o} style={{ left: p.x, top: p.y }} tipLeft={p.x > geo.W * 0.6} />
              })}
            </div>

            {cats.map((o, i) => {
              const p = geo.slots[i] ?? geo.center
              return (
                <Orb
                  key={o.key}
                  o={o}
                  labelSize={geo.catLabel}
                  floating
                  style={{ left: p.x, top: p.y }}
                  tipLeft={p.x > geo.W * 0.6}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function Orb({
  o,
  style,
  labelSize,
  tipLeft,
  floating,
}: {
  o: OrbInfo
  style: CSSProperties
  labelSize?: number
  tipLeft?: boolean
  /** Category orbs float on their own; the words cluster floats as a group. */
  floating?: boolean
}) {
  const pct = o.total > 0 ? Math.round((o.known / o.total) * 100) : 0
  return (
    <button
      type="button"
      className={`orbit-node orbit-${o.kind}${tipLeft ? ' tip-left' : ''}${floating ? ' is-floating' : ''}`}
      style={
        {
          ...style,
          '--c': o.color,
          '--d': o.delay,
          '--node': `${o.size}px`,
          ...(labelSize ? { '--label': `${labelSize}px` } : {}),
        } as CSSProperties
      }
      onClick={o.onOpen}
      aria-label={`${o.label}: ${o.total >= 0 ? `${fmt(o.known)} / ${fmt(o.total)}` : `${fmt(o.known)} favori`}`}
    >
      <span className="orbit-bubble">
        {o.text ? <span className="orbit-text">{o.text}</span> : <DashIcon name={o.icon!} />}
        {o.kind === 'words' && <span className="orbit-inner-label">{o.label}</span>}
      </span>
      {o.kind === 'cat' && <span className="orbit-label">{o.label}</span>}
      <span className="orbit-tip" role="tooltip">
        <b>{o.label}</b>
        <span className="orbit-tip-sub">{o.sub}</span>
        <span className="orbit-tip-count">
          {o.total >= 0 ? `${fmt(o.known)} / ${fmt(o.total)}` : `★ ${fmt(o.known)} kayıt`}
        </span>
        {o.total > 0 && (
          <span className="orbit-tip-bar">
            <i style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
    </button>
  )
}

function CenterRing({ known, total, style }: { known: number; total: number; style: CSSProperties }) {
  const [shown, setShown] = useState(0)
  const pct = total ? known / total : 0
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <div className="orbit-center" style={style}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#cfe0f3" />
            <stop offset="100%" stopColor="#6f9bcf" />
          </linearGradient>
        </defs>
        <circle className="center-track" cx="50" cy="50" r={r} />
        <circle
          className="center-fill"
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="center-text">
        <span className="center-num">
          {fmt(known)}
          <small> / {fmt(total)}</small>
        </span>
        <span className="center-sub">kelime biliniyor</span>
      </div>
    </div>
  )
}
