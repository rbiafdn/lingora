import type { ProgressSnapshot } from './progress'
import { sanitizePreferences, type Preferences } from './prefs'

// Backup file format. Plain JSON so users can keep it anywhere.

export const BACKUP_FORMAT_VERSION = 1
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export interface BackupFile {
  app: 'lingora'
  kind: 'backup'
  formatVersion: number
  exportedAt: string
  progress: ProgressSnapshot
  preferences: Preferences
}

export function createBackup(progress: ProgressSnapshot, preferences: Preferences, now = new Date()): BackupFile {
  return {
    app: 'lingora',
    kind: 'backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    progress,
    preferences,
  }
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `lingora-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName(new Date(backup.exportedAt))
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ParseResult =
  | { ok: true; backup: BackupFile; warnings: string[] }
  | { ok: false; error: string }

const ID_RE = /^[\w.:-]{1,200}$/

/**
 * Validates an untrusted backup file. Rejects anything that isn't a well-formed
 * Lingora backup; drops (and reports) individual malformed entries.
 */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'Dosya çok büyük; bir Lingora yedeği olamaz.' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Dosya okunamadı: geçerli bir JSON dosyası değil ya da bozuk.' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, error: 'Bu dosya bir Lingora yedeği değil.' }
  const o = raw as Record<string, unknown>
  if (o.app !== 'lingora' || o.kind !== 'backup') return { ok: false, error: 'Bu dosya bir Lingora yedeği değil.' }
  if (typeof o.formatVersion !== 'number' || o.formatVersion < 1)
    return { ok: false, error: 'Yedeğin sürüm bilgisi eksik ya da hatalı.' }
  if (o.formatVersion > BACKUP_FORMAT_VERSION)
    return { ok: false, error: 'Bu yedek Lingora’nın daha yeni bir sürümüyle alınmış; bu sürüm onu okuyamıyor.' }
  if (!o.progress || typeof o.progress !== 'object' || Array.isArray(o.progress))
    return { ok: false, error: 'Yedekte ilerleme verisi bulunamadı.' }

  const warnings: string[] = []
  let dropped = 0
  const progress: ProgressSnapshot = {}
  for (const [lang, v] of Object.entries(o.progress as Record<string, unknown>)) {
    if (!/^[a-z]{2,3}$/.test(lang) || !v || typeof v !== 'object') {
      dropped++
      continue
    }
    const entry = v as Record<string, unknown>
    const clean = (list: unknown) => {
      if (!Array.isArray(list)) return []
      const ok = list.filter((id): id is string => typeof id === 'string' && ID_RE.test(id))
      dropped += list.length - ok.length
      return [...new Set(ok)]
    }
    progress[lang] = { learned: clean(entry.learned), favorites: clean(entry.favorites) }
  }
  if (dropped) warnings.push(`${dropped} hatalı kayıt yok sayıldı.`)

  return {
    ok: true,
    warnings,
    backup: {
      app: 'lingora',
      kind: 'backup',
      formatVersion: o.formatVersion,
      exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
      progress,
      preferences: sanitizePreferences(o.preferences),
    },
  }
}

export interface BackupStats {
  learned: number
  favorites: number
  /** Ids not present in the currently installed content (kept, but not shown). */
  unknownIds: number
  languages: string[]
}

export function backupStats(progress: ProgressSnapshot, knownIds: (languageId: string) => Set<string> | undefined): BackupStats {
  let learned = 0
  let favorites = 0
  let unknownIds = 0
  for (const [lang, s] of Object.entries(progress)) {
    learned += s.learned.length
    favorites += s.favorites.length
    const known = knownIds(lang)
    if (known) for (const id of new Set([...s.learned, ...s.favorites])) if (!known.has(id)) unknownIds++
  }
  return { learned, favorites, unknownIds, languages: Object.keys(progress) }
}
