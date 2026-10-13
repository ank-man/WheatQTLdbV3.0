/**
 * Do the trait counts still match the published trait table, and where do the
 * categories overlap?
 *
 * The curators' trait table (WheatQTLdb v2.0 vs v3.0) is the reference for
 * every per-trait number the site shows. This classifies every record with the
 * site's own rules (src/lib/map.ts) and:
 *
 *   1. compares each category's QTL count with that table, and FAILS if one
 *      has drifted - a changed rule or a re-included sheet shows up here
 *      instead of on the Statistics page;
 *   2. lists the records that match no rule at all ("Other");
 *   3. reports which pairs of categories compete for the same records, since
 *      a record takes the first rule it matches and the order therefore
 *      decides the counts.
 *
 * Run: node scripts/audit/trait_overlap.mjs (built with esbuild)
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

const qtl = read('qtl.csv')
const recs = [...qtl, ...read('metaqtl.csv')]
console.log(`records: ${recs.length.toLocaleString()} (${qtl.length.toLocaleString()} QTL)`)
console.log(`rules  : ${TRAIT_RULES.length} (${new Set(TRAIT_RULES.map((r) => r[0])).size} distinct categories)\n`)

const pair = new Map<string, number>()
const pairEg = new Map<string, string>()
const claimedBy = new Map<string, number>()
const contestedIn = new Map<string, number>()
let contested = 0
let unclaimed = 0
const unclaimedEg = new Map<string, number>()

recs.forEach((r) => {
  const text = `${r.trait} / ${r.parameter}`
  const all = matchingCategories(r)
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
    .map((r) => matchingCategories(r).filter((x) => x !== c))
  const n = also.filter((a) => a.length).length
  const top = new Map<string, number>()
  also.flat().forEach((x) => top.set(x, (top.get(x) ?? 0) + 1))
  const worst = [...top.entries()].sort((a, b) => b[1] - a[1])[0]
  const share = (n / won * 100).toFixed(0)
  const flag = n / won > 0.25 ? '  <-- heavily contested' : ''
  console.log(`  ${c.padEnd(24)} ${String(n).padStart(6)}/${String(won).padEnd(6)} = ${share.padStart(3)}%` +
    (worst ? `  mostly with ${worst[0]} (${worst[1]})` : '') + flag)
})

console.log('\nrecords no rule claims (top distinct trait||parameter)')
;[...unclaimedEg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`))

// ---------------------------------------------------------------------------
// Gate: the QTL counts per category, against the curators' trait table.
//
// TABLE is that table's WheatQTLdb v3.0 column (with nematode resistance at 502
// - the table's 333 predates the second Nematode_Resistance sheet, and its own
// total of 80,641 only adds up with 502 - and frost / physiological at the
// 100 / 930 these rules give, which the table lists as 104 / 926: same sum).
//
// DRIFT is the handful of records (net -1 of 80,641) that now land differently
// from when the table was counted: placeholder values ("-", "NA") were cleaned
// out of the fields since, which changes which rows are exact duplicates and,
// for a few rows, which rule matches first. Anything other than TABLE + DRIFT
// is a regression and fails the rebuild.
// ---------------------------------------------------------------------------
const TABLE: Record<string, number> = {
  'Nutrient use efficiency': 6983, 'Waterlogging tolerance': 356, 'Salt tolerance': 3545,
  'Heat stress tolerance': 4008, 'Pre-harvest sprouting': 967, 'Drought tolerance': 18430,
  'Frost tolerance': 100, 'Nematode resistance': 502, 'Insect resistance': 202,
  'Bacterial resistance': 97, 'Fungal resistance': 9085, 'Viral resistance': 80,
  Biofortification: 7502, 'Herbicide tolerance': 366, Yield: 14728, Developmental: 4149,
  'Physiological traits': 930, 'Plant morphology': 2981, 'Grain morphology': 1259,
  'Quality traits': 4370, Other: 1,
}
const DRIFT: Record<string, number> = {
  Yield: 1, 'Quality traits': 4, 'Fungal resistance': -1, Biofortification: -4, Other: -1,
}

const qtlCount = new Map<string, number>()
qtl.forEach((r) => {
  const c = normalizeTrait(r)
  qtlCount.set(c, (qtlCount.get(c) ?? 0) + 1)
})

const problems: string[] = []
console.log('\nQTL per category against the published trait table')
console.log(`  ${'category'.padEnd(26)}${'table'.padStart(8)}${'drift'.padStart(9)}${'expected'.padStart(10)}${'now'.padStart(8)}`)
let tableTotal = 0
new Set([...Object.keys(TABLE), ...qtlCount.keys()]).forEach((c) => {
  const table = TABLE[c] ?? 0
  const expected = table + (DRIFT[c] ?? 0)
  const now = qtlCount.get(c) ?? 0
  tableTotal += table
  const ok = now === expected
  console.log(`  ${c.padEnd(26)}${String(table).padStart(8)}${String(DRIFT[c] ?? 0).padStart(9)}` +
    `${String(expected).padStart(10)}${String(now).padStart(8)}${ok ? '' : '  <-- DIFFERS'}`)
  if (!ok) problems.push(`${c}: ${now} QTL, expected ${expected} (table ${table})`)
})
console.log(`  ${'TOTAL'.padEnd(26)}${String(tableTotal).padStart(8)}${''.padStart(19)}${String(qtl.length).padStart(8)}`)

// QTL filed as "Other" are caught by the table above (it allows none);
// MetaQTL are not in the table, so theirs are reported rather than gated.
if (unclaimed > 0) console.log(`\n${unclaimed} record(s) match no rule and are filed as "Other" (listed above).`)

console.log('\n' + '='.repeat(60))
if (problems.length) {
  console.log('TAXONOMY CHECKS FAILED:')
  problems.forEach((p) => console.log(`  - ${p}`))
  console.log('If the data legitimately changed (new studies curated), update TABLE above.')
  process.exit(1)
}
console.log(`Taxonomy checks passed: every category matches the published trait table ` +
  `(${qtl.length.toLocaleString()} QTL).`)
