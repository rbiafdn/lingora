import { normalize } from './filter'
import { LEVELS, SECTION_KINDS, type ContentItem, type LanguageManifest } from './types'

// Content validator (see docs/content-schema.md). Run with `npm run validate`.

const ID_PREFIX: Record<string, string> = {
  words: 'word',
  idioms: 'idiom',
  'phrasal-verbs': 'pv',
  expressions: 'expr',
  collocations: 'coll',
  proverbs: 'prov',
  abbreviations: 'abbr',
  daily: 'daily',
  slang: 'slang',
  grammar: 'gr',
  alphabet: 'abc',
  'verb-pairs': 'vp',
}
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*'
const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'determiner', 'interjection', 'particle', 'numeral'])
const REGISTERS = new Set(['formal', 'neutral', 'informal', 'slang', 'offensive', 'vulgar'])
const ROLES = new Set(['s', 'a', 'v', 'o', 'q', 'x'])

export interface ValidationResult {
  errors: string[]
  warnings: string[]
}

export function validateLanguage(
  manifest: LanguageManifest,
  files: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const lang = manifest.languageId
  const ids = new Map<string, string>()
  const texts = new Map<string, string>()

  for (const cat of manifest.categories) {
    const prefix = ID_PREFIX[cat.id] ?? cat.id
    const idRe = new RegExp(`^${lang}-${prefix}-${SLUG}(?:--${SLUG})?$`)
    for (const file of cat.files) {
      const data = files[file]
      if (!Array.isArray(data)) {
        errors.push(`${file}: dizi değil ya da bulunamadı`)
        continue
      }
      data.forEach((raw: ContentItem, i) => {
        const at = `${file}[${i}] ${raw?.id ?? ''}`
        const err = (m: string) => errors.push(`${at}: ${m}`)
        if (!raw || typeof raw !== 'object') return err('kayıt nesne değil')
        if (typeof raw.id !== 'string' || !idRe.test(raw.id)) err(`id biçimi hatalı (beklenen ${lang}-${prefix}-<slug>)`)
        if (ids.has(raw.id)) err(`id tekrar ediyor (${ids.get(raw.id)})`)
        ids.set(raw.id, file)
        if (raw.languageId !== lang) err('languageId hatalı')
        if (raw.category !== cat.id) err(`category "${raw.category}" ≠ "${cat.id}"`)
        if (!(LEVELS as readonly string[]).includes(raw.level)) err('level hatalı')
        if (typeof raw.sourceText !== 'string' || !raw.sourceText.trim()) err('sourceText boş')
        const tr = raw.translations?.tr
        if (!Array.isArray(tr) || !tr.length || tr.some((t) => typeof t !== 'string' || !t.trim()))
          err('translations.tr boş')
        if (raw.partOfSpeech !== undefined && !POS.has(raw.partOfSpeech)) err(`partOfSpeech "${raw.partOfSpeech}" bilinmiyor`)
        if (raw.tags !== undefined && (!Array.isArray(raw.tags) || raw.tags.some((t) => !/^[a-z0-9-]+$/.test(t))))
          err('tags hatalı')
        if (raw.details?.register !== undefined && !REGISTERS.has(raw.details.register)) err('register hatalı')
        for (const ex of raw.examples ?? []) if (typeof ex?.text !== 'string') err('örnek metni yok')

        if (cat.kind === 'grammar') {
          const g = raw.grammar
          if (!g) err('grammar alanı yok')
          else {
            if (!g.summary) err('grammar.summary yok')
            if (!g.uses?.length) err('grammar.uses yok')
            if (!g.sections?.length) err('grammar.sections yok')
            for (const s of g.sections ?? []) {
              if (!SECTION_KINDS.includes(s.kind)) err(`bölüm "${s.title}": kind hatalı`)
              for (const p of s.formula ?? []) {
                if (!p.tr || !p.en) err(`bölüm "${s.title}": formül parçasında tr/en eksik`)
                if (p.role && !ROLES.has(p.role)) err(`bölüm "${s.title}": rol "${p.role}" bilinmiyor`)
              }
              for (const ex of s.examples ?? [])
                for (const m of ex.text.matchAll(/\[(\w+):/g))
                  if (!ROLES.has(m[1])) err(`bölüm "${s.title}": örnekte bilinmeyen rol "${m[1]}"`)
            }
          }
        } else {
          if (raw.grammar) err('grammar alanı sadece dilbilgisi kategorisinde olur')
          if (!raw.examples?.length) warnings.push(`${at}: örnek cümle yok`)
        }

        const key = normalize(raw.sourceText ?? '')
        const prev = texts.get(key)
        if (prev && prev !== cat.id) warnings.push(`${at}: "${raw.sourceText}" ${prev} kategorisinde de var`)
        else if (prev && !raw.id?.includes('--')) err(`"${raw.sourceText}" aynı kategoride iki kez var (farklı anlamsa id'ye --anlam eki ekleyin)`)
        texts.set(key, cat.id)
      })
    }
  }
  for (const cat of manifest.categories)
    for (const id of cat.order ?? []) if (ids.get(id) === undefined) errors.push(`${cat.id}: order listesinde bilinmeyen id ${id}`)
  return { errors, warnings }
}
