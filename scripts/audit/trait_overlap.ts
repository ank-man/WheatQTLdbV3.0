/**
 * Does the trait taxonomy overlap, and where?
 *
 * Every record gets exactly one category, so a clean-looking total says
 * nothing about whether the assignment was contested. This walks every rule
 * against every record instead of stopping at the first match, and reports:
 *
 *   1. how many records more than one category claims;
 *   2. which PAIRS of categories compete, and over what text;
 *   3. which records no rule claims at all ("Other");
 *   4. whether any two categories are near-duplicates - i.e. one category's
 *      records are mostly also claimed by another.
 *
 * Reports only. Run: node scripts/audit/trait_overlap.mjs (built with esbuild)
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  normalizeTrait, matchingCategories, majorClassOf, TRAIT_RULES,
} from '../../src/lib/map'

const DATA = path.join(process.cwd(), 'public', 'data')

function parse(s: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = [] }
    else if (c !== '\r') cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

function read(name: string): Record<string, string>[] {
  const rows = parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
  const hdr = rows[0]
  return rows.slice(1).filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ''])))
}

const recs = [...read('qtl.csv'), ...read('metaqtl.csv')]
console.log(`records: ${recs.length.toLocaleString()}`)
console.log(`rules  : ${TRAIT_RULES.length} (${new Set(TRAIT_RULES.map((r) => r[0])).size} distinct categories)\n`)

// normalizeTrait classifies the TRAIT field alone when it is specific enough,
// and falls back to trait+parameter otherwise. Mirror that, so the overlap
// measured is the overlap that actually decides a record's category.
const GENERIC = /^(agronomic|morphological|physiological|quantitative|multiple|various|other|misc)/i
function textOf(r: Record<string, string>): string {
  const t = (r.trait || '').toLowerCase().trim()
  const p = (r.parameter || '').toLowerCase().trim()
  if (t && !GENERIC.test(t) && matchingCategories(t).length) return t
  return `${t} ${p}`.trim()
}

const pair = new Map<string, number>()
const pairEg = new Map<string, string>()
const claimedBy = new Map<string, number>()
const contestedIn = new Map<string, number>()
let contested = 0
let unclaimed = 0
const unclaimedEg = new Map<string, number>()

recs.forEach((r) => {
  const text = textOf(r)
  const all = matchingCategories(text)
  const chosen = normalizeTrait(r as any)
  all.forEach((c) => claimedBy.set(c, (claimedBy.get(c) ?? 0) + 1))
  if (all.length === 0) {
    unclaimed++
    const k = `${r.trait} || ${r.parameter}`.slice(0, 70)
    unclaimedEg.set(k, (unclaimedEg.get(k) ?? 0) + 1)
    return
  }
  if (all.length > 1) {
    contested++
    contestedIn.set(chosen, (contestedIn.get(chosen) ?? 0) + 1)
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const k = `${all[i]}  vs  ${all[j]}`
        pair.set(k, (pair.get(k) ?? 0) + 1)
        if (!pairEg.has(k)) pairEg.set(k, text.slice(0, 64))
      }
    }
  }
})

const pct = (n: number) => `${(n / recs.length * 100).toFixed(1)}%`
console.log(`records claimed by MORE THAN ONE category : ${contested.toLocaleString()} (${pct(contested)})`)
console.log(`records claimed by NO category            : ${unclaimed.toLocaleString()} (${pct(unclaimed)})\n`)

console.log('competing category pairs, most frequent first')
console.log('(left-hand one wins, because it is earlier in TRAIT_RULES)')
;[...pair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k.padEnd(52)} e.g. "${pairEg.get(k)}"`))

console.log('\nper category: records it wins vs records it also claims but loses')
const rows = [...new Set(TRAIT_RULES.map((r) => r[0]))].map((c) => {
  const won = recs.filter((r) => normalizeTrait(r as any) === c).length
  const claims = claimedBy.get(c) ?? 0
  return { c, won, claims, lost: claims - won }
}).sort((a, b) => b.claims - a.claims)
console.log(`  ${'category'.padEnd(24)}${'wins'.padStart(8)}${'claims'.padStart(9)}${'loses'.padStart(8)}  major class`)
rows.forEach(({ c, won, claims, lost }) =>
  console.log(`  ${c.padEnd(24)}${String(won).padStart(8)}${String(claims).padStart(9)}${String(lost).padStart(8)}  ${majorClassOf(c)}`))

console.log('\nnear-duplicate check: of the records a category WINS, how many')
console.log('would a different category also have taken?')
rows.filter((r) => r.won > 0).forEach(({ c, won }) => {
  const also = recs.filter((r) => normalizeTrait(r as any) === c)
    .map((r) => matchingCategories(textOf(r)).filter((x) => x !== c))
  const n = also.filter((a) => a.length).length
  const top = new Map<string, number>()
  also.flat().forEach((x) => top.set(x, (top.get(x) ?? 0) + 1))
  const worst = [...top.entries()].sort((a, b) => b[1] - a[1])[0]
  const share = (n / won * 100).toFixed(0)
  // Multiple abiotic stress is 100% contested by construction: its rule fires
  // only when two or more single-stress rules would also have fired. That is
  // the definition of the category, not a sign the taxonomy is redundant.
  const byDesign = c === 'Multiple abiotic stress'
  const flag = byDesign ? '  (by construction - see its rule)'
    : n / won > 0.25 ? '  <-- heavily contested' : ''
  console.log(`  ${c.padEnd(24)} ${String(n).padStart(6)}/${String(won).padEnd(6)} = ${share.padStart(3)}%` +
    (worst ? `  mostly with ${worst[0]} (${worst[1]})` : '') + flag)
})

console.log('\nrecords no rule claims (top distinct trait||parameter)')
;[...unclaimedEg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`))

// ---------------------------------------------------------------------------
// Gate, so this is an enforceable invariant rather than a report nobody reads.
// The thresholds are set just above where the taxonomy stands now, which makes
// them a regression test: adding a rule that overlaps an existing category, or
// narrowing one so records fall through, fails the build.
// ---------------------------------------------------------------------------
const MAX_CONTESTED = 0.02   // currently 1.0%
const problems: string[] = []
if (unclaimed > 0) {
  problems.push(`${unclaimed} record(s) match no rule - they would be filed as "Other"`)
}
if (contested / recs.length > MAX_CONTESTED) {
  problems.push(`${pct(contested)} of records are claimed by two or more categories ` +
    `(limit ${(MAX_CONTESTED * 100).toFixed(0)}%)`)
}
// A category that never wins is dead weight in the taxonomy; one whose rule is
// fully shadowed by an earlier rule is worse, because it looks real in the UI.
const dead = rows.filter((r) => r.claims > 0 && r.won === 0).map((r) => r.c)
if (dead.length) problems.push(`category never wins a record: ${dead.join(', ')}`)

console.log('\n' + '='.repeat(60))
if (problems.length) {
  console.log('TAXONOMY CHECKS FAILED:')
  problems.forEach((p) => console.log(`  - ${p}`))
  process.exit(1)
}
console.log(`Taxonomy checks passed: 0 unclaimed, ${pct(contested)} contested, no dead categories.`)
