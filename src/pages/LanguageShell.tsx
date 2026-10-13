import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAllItems, useLanguages, useManifest } from '../core/hooks'
import { useProgress, useProgressReady, useSaveError } from '../core/progress'
import { prefs } from '../core/prefs'
import { progressOf } from '../core/filter'
import { LEVELS, type ContentItem, type Level, type LanguageManifest } from '../core/types'
import { goBack, href, navigate, useRoute } from '../router'
import { Logo } from '../components/Logo'
import { ScrollTopButton } from '../components/ScrollTopButton'
import { Dashboard } from './Dashboard'
import { CategoryPage } from './CategoryPage'
import { FavoritesPage } from './FavoritesPage'
import { SettingsPage } from './SettingsPage'
import { Drawer } from '../components/Drawer'
import { StarField } from '../components/StarField'
import { SearchPage } from './SearchPage'

export interface LangContext {
  languageId: string
  languageName: string
  manifest: LanguageManifest
  allItems: ContentItem[]
}

export function LanguageShell({ languageId }: { languageId: string }) {
  const route = useRoute()
  const { data: languages } = useLanguages()
  const { data: manifest, error: mErr } = useManifest(languageId)
  const { data: allItems, error: iErr } = useAllItems(languageId)
  const progress = useProgress(languageId)
  const progressReady = useProgressReady()
  const saveError = useSaveError()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const language = languages?.find((l) => l.id === languageId)
  const [, section, sub] = route.path
  const error = mErr || iErr

  useEffect(() => {
    if (manifest) prefs.setLastLanguage(languageId)
  }, [manifest, languageId])

  // Old links carried the level in the URL (?level=A1); it is now a saved preference.
  const urlLevel = route.params.get('level')
  useEffect(() => {
    if (!urlLevel) return
    if ((LEVELS as readonly string[]).includes(urlLevel)) prefs.setLevel(languageId, urlLevel as Level)
    navigate(route.path.join('/'), {}, true)
  }, [urlLevel, languageId, route.path])

  // Settings is a right-side drawer now; old #/<lang>/settings links just open it.
  useEffect(() => {
    if (section !== 'settings') return
    setSettingsOpen(true)
    navigate(languageId, {}, true)
  }, [section, languageId])

  const overall = useMemo(() => (allItems ? progressOf(allItems, progress) : null), [allItems, progress])

  let ctx: LangContext | null = null
  let page: ReactNode = <div className="loading">Yükleniyor…</div>
  if (error) page = <p className="error">İçerik yüklenemedi: {error}</p>
  else if (manifest && allItems && progressReady) {
    ctx = { languageId, languageName: language?.name ?? languageId.toUpperCase(), manifest, allItems }
    if (section === 'c' && sub) page = <CategoryPage key={sub} ctx={ctx} categoryId={sub} />
    else if (section === 'favorites') page = <FavoritesPage ctx={ctx} />
    else if (section === 'search') page = <SearchPage ctx={ctx} query={route.params.get('q') ?? ''} />
    else page = <Dashboard ctx={ctx} />
  }

  return (
    <div className="shell">
      <StarField />
      <header className="topbar">
        <div className="topbar-row">
          <a href={href(languageId)} className="topbar-logo" aria-label="Lingora panel">
            <Logo />
          </a>
          <GlobalSearch
            languageId={languageId}
            onSearchPage={section === 'search'}
            query={section === 'search' ? (route.params.get('q') ?? '') : ''}
          />
          <a href={href('')} className="lang-pill" title="Dil değiştir">
            {language?.nativeName ?? languageId.toUpperCase()}
          </a>
          <button
            type="button"
            className={`icon-link${settingsOpen ? ' is-current' : ''}`}
            aria-label="Ayarlar"
            title="Ayarlar"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.5-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.5 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.5-2-1.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {overall && (
            <div
              className="topbar-progress"
              title={`${overall.known.toLocaleString('tr-TR')} / ${overall.total.toLocaleString('tr-TR')} içerik biliniyor`}
            >
              <span className="tp-label">İlerleme</span>
              <span className="tp-pct">
                {overall.known.toLocaleString('tr-TR')} / {overall.total.toLocaleString('tr-TR')}
              </span>
            </div>
          )}
        </div>

      </header>

      {saveError && (
        <div className="save-error" role="alert">
          Son değişiklik cihaza kaydedilemedi ({saveError}). Sayfayı yenilemeden önce Ayarlar’dan yedek almanı öneririz.
        </div>
      )}

      {settingsOpen && ctx && (
        <Drawer title="Ayarlar" onClose={() => setSettingsOpen(false)}>
          <SettingsPage ctx={ctx} />
        </Drawer>
      )}

      <main className="content">
        {section && (
          <button type="button" className="back-btn" onClick={() => goBack(languageId)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Geri
          </button>
        )}
        {page}
      </main>
      <ScrollTopButton />
    </div>
  )
}

/** Searches all content of the language; results live on #/<lang>/search?q=… */
function GlobalSearch({ languageId, onSearchPage, query }: { languageId: string; onSearchPage: boolean; query: string }) {
  const [value, setValue] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setValue(onSearchPage ? query : '')
  }, [onSearchPage, query])

  // "/" focuses the search box from anywhere (unless typing in another field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="global-search" role="search">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder="Tüm içerikte ara…"
        aria-label="Tüm içerikte ara (İngilizce veya Türkçe)"
        onChange={(e) => {
          const v = e.target.value
          setValue(v)
          navigate(`${languageId}/search`, { q: v || undefined }, onSearchPage)
        }}
      />
    </div>
  )
}
