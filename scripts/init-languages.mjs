// Creates public/data/<lang>/manifest.json for the new languages (categories with
// empty file lists; scripts/merge-staging.mjs fills them). Existing manifests are
// left untouched so published ids and file lists never change.
//
//   node scripts/init-languages.mjs

import fs from 'node:fs'
import path from 'node:path'

const base = JSON.parse(fs.readFileSync('public/data/en/manifest.json', 'utf8')).categories.map(
  ({ id, label, shortLabel, kind, levels }) => ({ id, label, shortLabel, kind, ...(levels ? { levels } : {}) }),
)
const cat = (id) => ({ ...base.find((c) => c.id === id), files: [] })
const alphabet = (glyph) => ({ id: 'alphabet', label: 'Alfabe ve Okunuş', shortLabel: 'Alfabe', kind: 'alphabet', glyph, files: [] })
const verbs = (label, shortLabel) => ({ ...cat('phrasal-verbs'), label, shortLabel })
const verbPairs = { id: 'verb-pairs', label: 'Fiil Çiftleri', shortLabel: 'Fiil Çiftleri', kind: 'lexical', files: [] }

const rest = ['idioms', 'expressions', 'collocations', 'proverbs', 'abbreviations', 'daily', 'slang', 'grammar'].map(cat)
const LANGS = {
  es: [cat('words'), verbs('Deyimsel Fiiller', 'Deyimsel'), ...rest],
  fr: [cat('words'), verbs('Deyimsel Fiiller', 'Deyimsel'), ...rest],
  it: [cat('words'), verbs('Deyimsel Fiiller', 'Deyimsel'), ...rest],
  pt: [cat('words'), verbs('Deyimsel Fiiller', 'Deyimsel'), ...rest],
  de: [cat('words'), verbs('Ayrılabilen Fiiller', 'Ayrılabilen'), ...rest],
  ru: [alphabet('Бб'), cat('words'), verbPairs, ...rest],
  ar: [alphabet('أ'), cat('words'), ...rest],
  ja: [alphabet('あ'), cat('words'), ...rest],
  ko: [alphabet('한'), cat('words'), ...rest],
  hi: [alphabet('अ'), cat('words'), ...rest],
}

for (const [lang, categories] of Object.entries(LANGS)) {
  const file = path.join('public/data', lang, 'manifest.json')
  if (fs.existsSync(file)) {
    console.log(`${lang}: exists, skipped`)
    continue
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, languageId: lang, categories }, null, 2) + '\n')
  console.log(`${lang}: created`)
}
