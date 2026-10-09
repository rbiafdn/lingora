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

let current = parse()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = parse()
  listeners.forEach((l) => l())
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
  if (replace) history.replaceState(null, '', h)
  else history.pushState(null, '', h)
  current = parse()
  listeners.forEach((l) => l())
}
