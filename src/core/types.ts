// Content model. Content records never hold user state (learned / favorite);
// that lives in the progress store, keyed by user + language + item id.

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

/** Language the interface (and translations) are shown in. */
export const UI_LANG = 'tr'

export interface Language {
  id: string
  name: string
  nativeName: string
  active: boolean
}

export type CategoryKind = 'lexical' | 'grammar'

export interface CategoryDef {
  id: string
  label: string
  /** Compact label for the top navigation. */
  shortLabel?: string
  kind: CategoryKind
  /** Show CEFR levels (filter, labels, progress) for this category. Levels stay in the data either way. */
  levels?: boolean
  /** Learning order of item ids; items not listed follow in data order. */
  order?: string[]
  /** One or more data files; large categories can be split (e.g. by level). */
  files: string[]
}

export const CONTENT_SCHEMA_VERSION = 1

export interface LanguageManifest {
  schemaVersion: number
  languageId: string
  categories: CategoryDef[]
}

export interface Example {
  text: string
  tr?: string
}

export type Register = 'formal' | 'neutral' | 'informal' | 'slang' | 'offensive' | 'vulgar'

export interface ItemDetails {
  expansion?: string
  pronunciation?: { uk?: string; us?: string }
  literal?: string
  meaning?: string
  explanation?: string
  usage?: string
  context?: string
  register?: Register
  separable?: boolean
  otherMeanings?: string[]
  turkishEquivalent?: string
  synonyms?: string[]
  similar?: string[]
  related?: string[]
}

/** One block of a grammar formula, e.g. [Özne / Subject]. */
export interface FormulaPart {
  tr: string
  en: string
  role?: string
}

export const SECTION_KINDS = [
  'affirmative',
  'negative',
  'question',
  'negative-question',
  'wh',
  'short-answers',
  'other',
] as const
export type SectionKind = (typeof SECTION_KINDS)[number]

export interface GrammarSection {
  /** Standard structure this section shows; 'other' for topic-specific ones (Active → Passive, …). */
  kind: SectionKind
  title: string
  formula?: FormulaPart[]
  /** Example text may mark parts as "[s:He] [a:does not] [v:play]". */
  examples?: Example[]
  notes?: string[]
}

export interface GrammarMistake {
  wrong: string
  right: string
  note?: string
}

export interface GrammarDetails {
  /** Temel açıklama */
  summary: string
  /** Ne zaman kullanılır? */
  uses: string[]
  sections: GrammarSection[]
  /** Önemli kurallar */
  rules?: string[]
  /** İstisnalar */
  exceptions?: string[]
  /** Yaygın hatalar */
  mistakes?: GrammarMistake[]
}

export interface ContentItem {
  /** Permanent, unique id. Progress is keyed by it, so it never changes once published. */
  id: string
  languageId: string
  category: string
  level: Level
  sourceText: string
  translations: Record<string, string[]>
  partOfSpeech?: string
  /** Free-form cross-category relations, e.g. "discourse-marker", "business". */
  tags?: string[]
  details?: ItemDetails
  grammar?: GrammarDetails
  examples?: Example[]
}
