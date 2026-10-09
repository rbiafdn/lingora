// Merges content written in the compact staging format (docs/content-staging.md)
// into the real data files, split as public/data/<lang>/<category>/<level>.json.
//
//   node scripts/merge-staging.mjs [lang]
//
// - Existing records are kept with their ids (user progress depends on them).
// - fixes-*.json files patch existing records by id.
// - New records get stable ids; duplicates are skipped and reported.
// - Staging files are deleted after a successful merge.

import fs from 'node:fs'
import path from 'node:path'

const lang = process.argv[2] ?? 'en'
const root = path.resolve('public/data', lang)
const stagingDir = path.join(root, '_staging')
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const PREFIX = {
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
}
const REGISTERS = new Set(['formal', 'neutral', 'informal', 'slang', 'offensive', 'vulgar'])
const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'determiner', 'interjection'])

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
const cleanList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [])
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

// ---------- load existing ----------
const manifest = readJson(path.join(root, 'manifest.json'))
const existing = []
for (const c of manifest.categories) for (const f of c.files) existing.push(...readJson(path.join(root, f)))
const byId = new Map(existing.map((it) => [it.id, it]))
console.log(`existing: ${existing.length}`)

// ---------- fixes ----------
const stagingFiles = fs.existsSync(stagingDir) ? fs.readdirSync(stagingDir).filter((f) => f.endsWith('.json')) : []
let fixed = 0
for (const f of stagingFiles.filter((f) => f.startsWith('fixes-'))) {
  for (const fx of readJson(path.join(stagingDir, f))) {
    const it = byId.get(fx.id)
    if (!it) {
      console.warn(`fix for unknown id ${fx.id}`)
      continue
    }
    it.details ??= {}
    if (Array.isArray(fx.tr) && fx.tr.length) it.translations.tr = cleanList(fx.tr)
    if ('teq' in fx) {
      if (fx.teq) it.details.turkishEquivalent = fx.teq
      else delete it.details.turkishEquivalent
    }
    if (fx.ex_tr && it.examples?.[0]) it.examples[0].tr = fx.ex_tr
    if (fx.exp) {
      if (it.category === 'proverbs') it.details.meaning = fx.exp
      else it.details.explanation = fx.exp
    }
    fixed++
  }
}
console.log(`fixes applied: ${fixed}`)

// ---------- convert staging ----------
const categoryOf = (file) => Object.keys(PREFIX).find((c) => file.startsWith(c + '-'))

function convert(category, r) {
  const level = r.l
  if (!LEVELS.includes(level)) return { error: `bad level ${level}` }
  const tr = cleanList(r.tr).slice(0, 3)
  if (!tr.length) return { error: 'no tr' }
  const ex = str(r.ex) ? [{ text: str(r.ex), ...(str(r.ex_tr) ? { tr: str(r.ex_tr) } : {}) }] : undefined

  if (category === 'grammar') {
    if (!str(r.t) || !r.grammar?.sections?.length) return { error: 'bad grammar' }
    return { item: { level, sourceText: str(r.t), translations: { tr }, grammar: r.grammar } }
  }

  if (category === 'words') {
    const w = str(r.w)
    if (!w) return { error: 'no w' }
    const pos = POS.has(r.pos) ? r.pos : undefined
    const details = {}
    if (str(r.uk) || str(r.us)) details.pronunciation = { ...(str(r.uk) ? { uk: str(r.uk) } : {}), ...(str(r.us) ? { us: str(r.us) } : {}) }
    const om = cleanList(r.om).slice(0, 2)
    if (om.length) details.otherMeanings = om
    if (str(r.note)) details.usage = str(r.note)
    return {
      item: { level, sourceText: w, translations: { tr }, ...(pos ? { partOfSpeech: pos } : {}), details, ...(ex ? { examples: ex } : {}) },
      sense: str(r.sense) ? slug(r.sense) : undefined,
    }
  }

  const t = str(r.t)
  if (!t) return { error: 'no t' }
  const details = {}
  if (typeof r.sep === 'boolean') details.separable = r.sep
  if (str(r.note)) details.usage = str(r.note)
  if (str(r.exp)) {
    if (category === 'proverbs') details.meaning = str(r.exp)
    else details.explanation = str(r.exp)
  }
  if (str(r.teq)) details.turkishEquivalent = str(r.teq)
  if (REGISTERS.has(r.reg)) details.register = r.reg
  if (str(r.full)) details.expansion = str(r.full)
  if (str(r.ctx)) details.context = str(r.ctx)
  const tags = cleanList(r.tags).map(slug).filter(Boolean)
  if (r.kind === 'reduced') tags.push('reduced-form')
  return {
    item: {
      level,
      sourceText: t,
      translations: { tr },
      ...(category === 'phrasal-verbs' ? { partOfSpeech: 'verb' } : {}),
      ...(tags.length ? { tags: [...new Set(tags)] } : {}),
      details,
      ...(ex ? { examples: ex } : {}),
    },
  }
}

// key for duplicate detection
const wordKey = (text, pos) => `${norm(text)}|${pos ?? ''}`
const seenWords = new Map() // text|pos -> id
const seenWordText = new Set()
const seenPhrase = new Map() // category -> Set(norm text)
const phraseOwner = new Map() // norm text -> category (multi-word, non-word categories)
const ids = new Set(existing.map((i) => i.id))
for (const it of existing) {
  if (it.category === 'words') {
    seenWords.set(wordKey(it.sourceText, it.partOfSpeech), it.id)
    seenWordText.add(norm(it.sourceText))
  } else {
    const k = norm(it.sourceText)
    if (!seenPhrase.has(it.category)) seenPhrase.set(it.category, new Set())
    seenPhrase.get(it.category).add(k)
    if (it.category !== 'grammar' && !phraseOwner.has(k)) phraseOwner.set(k, it.category)
  }
}

const added = []
const skipped = { duplicate: 0, crossCategory: 0, invalid: 0 }
const skippedList = []
// Process lower levels first so a word written at two levels keeps the lower one.
const records = []
for (const f of stagingFiles.filter((f) => !f.startsWith('fixes-'))) {
  const category = categoryOf(f)
  if (!category) {
    console.warn(`skip unknown staging file ${f}`)
    continue
  }
  for (const r of readJson(path.join(stagingDir, f))) records.push({ category, r, f })
}
records.sort((a, b) => LEVELS.indexOf(a.r.l) - LEVELS.indexOf(b.r.l))

for (const { category, r, f } of records) {
  const res = convert(category, r)
  if (res.error) {
    skipped.invalid++
    skippedList.push(`${f}: ${res.error} ${JSON.stringify(r).slice(0, 80)}`)
    continue
  }
  const it = res.item
  const k = norm(it.sourceText)
  let id
  if (category === 'words') {
    const wk = wordKey(it.sourceText, it.partOfSpeech)
    if (seenWords.has(wk) && !res.sense) {
      skipped.duplicate++
      continue
    }
    id = `${lang}-word-${slug(it.sourceText)}`
    if (ids.has(id)) id = `${id}--${res.sense ?? it.partOfSpeech ?? 'x'}`
    if (ids.has(id)) {
      skipped.duplicate++
      continue
    }
    seenWords.set(wk, id)
    seenWordText.add(k)
  } else {
    const set = seenPhrase.get(category) ?? new Set()
    seenPhrase.set(category, set)
    if (set.has(k)) {
      skipped.duplicate++
      continue
    }
    // Same multi-word phrase already owned by another category → one record only.
    const owner = phraseOwner.get(k)
    if (category !== 'grammar' && owner && owner !== category && k.includes(' ')) {
      skipped.crossCategory++
      skippedList.push(`cross-category: "${it.sourceText}" (${category}) already in ${owner}`)
      continue
    }
    id = `${lang}-${PREFIX[category]}-${slug(it.sourceText)}`
    let n = 2
    while (ids.has(id)) id = `${lang}-${PREFIX[category]}-${slug(it.sourceText)}--${n++}`
    set.add(k)
    if (category !== 'grammar' && !phraseOwner.has(k)) phraseOwner.set(k, category)
  }
  ids.add(id)
  added.push({ id, languageId: lang, category, ...it })
}

// ---------- write split files ----------
const all = [...existing, ...added]
const order = (a, b) => 0
const out = new Map() // category -> level -> items
for (const it of all) {
  if (!out.has(it.category)) out.set(it.category, new Map())
  const m = out.get(it.category)
  if (!m.has(it.level)) m.set(it.level, [])
  m.get(it.level).push(it)
}
const oldFiles = new Set(manifest.categories.flatMap((c) => c.files))
for (const c of manifest.categories) {
  const m = out.get(c.id) ?? new Map()
  const files = []
  fs.mkdirSync(path.join(root, c.id), { recursive: true })
  for (const lv of LEVELS) {
    const items = (m.get(lv) ?? []).sort(order)
    const rel = `${c.id}/${lv.toLowerCase()}.json`
    const abs = path.join(root, rel)
    if (!items.length) {
      if (fs.existsSync(abs)) fs.rmSync(abs)
      continue
    }
    fs.writeFileSync(abs, '[\n' + items.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n')
    files.push(rel)
    oldFiles.delete(rel)
  }
  c.files = files
}
for (const f of oldFiles) {
  const abs = path.join(root, f)
  if (fs.existsSync(abs)) fs.rmSync(abs)
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

for (const f of stagingFiles) fs.rmSync(path.join(stagingDir, f))
if (fs.existsSync(stagingDir) && !fs.readdirSync(stagingDir).length) fs.rmdirSync(stagingDir)

console.log(`added: ${added.length}`, skipped)
if (skippedList.length) fs.writeFileSync(path.resolve('scripts/last-merge-skipped.txt'), skippedList.join('\n') + '\n')
const summary = {}
for (const [cat, m] of out) summary[cat] = Object.fromEntries(LEVELS.map((l) => [l, m.get(l)?.length ?? 0]))
console.table(summary)
console.log('total', all.length)
