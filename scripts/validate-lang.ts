// Validates one language's data (optionally under another root, e.g. a trial merge copy).
//
//   npx vite-node scripts/validate-lang.ts [root] <lang>

import { readFileSync } from 'node:fs'
import { validateLanguage } from '../src/core/validate'
import type { LanguageManifest } from '../src/core/types'

const args = process.argv.slice(2)
const [root, lang] = args.length > 1 ? args : ['.', args[0]]
const d = `${root}/public/data/${lang}/`
const m: LanguageManifest = JSON.parse(readFileSync(d + 'manifest.json', 'utf8'))
const f = Object.fromEntries(m.categories.flatMap((c) => c.files).map((x) => [x, JSON.parse(readFileSync(d + x, 'utf8'))]))
const r = validateLanguage(m, f)
console.log(`${lang}: errors ${r.errors.length}, warnings ${r.warnings.length}`)
if (r.errors.length) console.log(r.errors.slice(0, 30).join('\n'))
