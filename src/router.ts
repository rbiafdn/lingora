import { useSyncExternalStore } from 'react'

// Minimal hash router: #/en/c/words?level=A1

export interface Route {
  path: string[]
  params: URLSearchParams
}

function parse(): Route {
  const hash = location.hash.replace(/^#\/?/, '')
  const [p, q = ''] = hash.split('?')
  return { path: p.split('/').filter(Boolean), params: new URLSearchParams(q) }
}

// Each history entry created inside the app carries its depth ({ i }), so the
// back button knows whether there is an in-app page to return to.
type Entry = { i: number }
const depthOf = (s: unknown) => (s && typeof (s as Entry).i === 'number' ? (s as Entry).i : null)

let depth = depthOf(history.state) ?? 0
if (depthOf(history.state) === null) history.replaceState({ i: depth }, '')

let current = parse()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('hashchange', () => {
  const d = depthOf(history.state)
  if (d === null) {
    // A plain link (<a href="#/…">) created a new entry.
    depth += 1
    history.replaceState({ i: depth }, '')
  } else {
    depth = d
  }
  current = parse()
  emit()
})

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => current,
  )
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v)
  const qs = q.toString()
  return `#/${path}${qs ? `?${qs}` : ''}`
}

export function navigate(path: string, params?: Record<string, string | undefined>, replace = false) {
  const h = href(path, params)
  if (replace) history.replaceState({ i: depth }, '', h)
  else history.pushState({ i: ++depth }, '', h)
  current = parse()
  emit()
}

/** Back to the previous in-app page; if there is none, go to `fallback` instead of leaving the app. */
export function goBack(fallback: string) {
  if (depth > 0) history.back()
  else navigate(fallback, {}, true)
}
