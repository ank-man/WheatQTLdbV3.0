/**
 * Summary tables behind the manuscript figure panels.
 *
 * The figures are drawn in R (scripts/manuscript_panels.R), but the trait
 * classification lives in src/lib/map.ts. Rather than restate those rules in
 * R - where they would drift from the site, as the old statistics figure's
 * did - this script classifies every record with the site's own code and
 * writes small CSVs for R to plot. The numbers in the figures are therefore
 * the numbers on the Statistics page.
 *
 * Run through scripts/manuscript_panels.R, or directly:
 *   node_modules/.bin/esbuild scripts/manuscript_panel_data.ts --bundle \
 *     --platform=node --format=esm --outfile=scripts/manuscript_panel_data.mjs
 *   node scripts/manuscript_panel_data.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import {
  normalizeTrait, normalizeSubTrait, normalizeSpecies, normalizeChromosome, majorClassOf,
  parsePositionInterval, qtlPhysicalPoint, chromosomeSortKey, CHROMOSOME_LENGTHS, centromerePosition,
  TRAIT_MAJOR_CLASSES, TRAIT_HIERARCHY, TRAIT_SUBCATEGORIES,
} from '../src/lib/map'

const DATA = path.join(process.cwd(), 'public', 'data')
const OUT = path.join(process.cwd(), 'manuscript_figures', 'data')
fs.mkdirSync(OUT, { recursive: true })

const read = (name: string) =>
  Papa.parse(fs.readFileSync(path.join(DATA, name), 'utf8'), { header: true, skipEmptyLines: true }).data as any[]
const write = (name: string, rows: object[]) =>
  fs.writeFileSync(path.join(OUT, name), Papa.unparse(rows) + '\n')

const qtl = read('qtl.csv')
const mqtl = read('metaqtl.csv')
const epi = read('epistatic.csv')

/** main trait x sub-category counts, in the order of the curators' table */
function traitTable(rows: any[]) {
  const n = new Map<string, number>()
  const bump = (k: string) => n.set(k, (n.get(k) ?? 0) + 1)
  rows.forEach((r) => {
    bump(`cat:${normalizeTrait(r)}`)
    const sub = normalizeSubTrait(r)
    if (sub) bump(`sub:${sub}`)
  })
  const out: { main_trait: string; sub_category: string; records: number }[] = []
  TRAIT_MAJOR_CLASSES.forEach((major) => {
    const cats = TRAIT_HIERARCHY[major]
    const subs = cats.length === 1 ? TRAIT_SUBCATEGORIES[cats[0]] : undefined
    ;(subs ? subs.map((s) => [s, n.get(`sub:${s}`) ?? 0] as const)
           : cats.map((c) => [c as string, n.get(`cat:${c}`) ?? 0] as const))
      .filter(([, v]) => v > 0)
      .forEach(([name, v]) => out.push({ main_trait: major, sub_category: name, records: v }))
  })
  return out
}

write('qtl_by_trait.csv', traitTable(qtl))
write('metaqtl_by_trait.csv', traitTable(mqtl))
write('epistatic_by_trait.csv', traitTable(epi))

const byChr = new Map<string, number>()
qtl.forEach((r) => { const c = normalizeChromosome(r.chromosome) ?? 'Un'; byChr.set(c, (byChr.get(c) ?? 0) + 1) })
write('qtl_by_chromosome.csv', [...byChr.entries()]
  .sort((a, b) => chromosomeSortKey(a[0]) - chromosomeSortKey(b[0]))
  .map(([chromosome, records]) => ({ chromosome, subgenome: chromosome === 'Un' ? 'Un' : chromosome.slice(-1), records })))

const thisYear = new Date().getFullYear()
const byYear = new Map<number, number>()
let undated = 0
qtl.forEach((r) => {
  const y = Number(r.year)
  if (Number.isInteger(y) && y >= 1980 && y <= thisYear) byYear.set(y, (byYear.get(y) ?? 0) + 1)
  else undated++
})
write('qtl_by_year.csv', [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, records]) => ({ year, records })))

let physical = 0, genetic = 0
qtl.forEach((r) => {
  const chr = normalizeChromosome(r.chromosome)
  if (chr && qtlPhysicalPoint(r, chr) !== null) physical++
  else if (chr && parsePositionInterval(r.position_interval || '').point !== null) genetic++
})
write('qtl_by_position_type.csv', [
  { position_type: 'Physical position (bp)', records: physical },
  { position_type: 'Genetic position only (cM)', records: genetic },
  { position_type: 'No usable position', records: qtl.length - physical - genetic },
])

// A record naming several species in one field ("A; B") is an interspecific
// study. It is counted once, under its own row, so the rows still sum to the
// record total instead of listing each combination as if it were a species.
const speciesOf = (raw: string) => {
  const names = [...new Set((raw || '').split(/[;/]/).map((x) => normalizeSpecies(x)).filter(Boolean))]
  return names.length === 0 ? 'Not recorded' : names.length === 1 ? names[0] : 'Two or more species'
}
const species = new Map<string, number>()
qtl.forEach((r) => { const s = speciesOf(r.species); species.set(s, (species.get(s) ?? 0) + 1) })
write('qtl_by_species.csv', [...species.entries()].sort((a, b) => b[1] - a[1]).map(([name, records]) => ({ species: name, records })))

// QTL density along each chromosome, for the karyotype heat map: physical
// positions only, in 10 Mb windows on IWGSC RefSeq v1.0.
const BIN = 10_000_000
const density = new Map<string, number>()
qtl.forEach((r) => {
  const chr = normalizeChromosome(r.chromosome)
  if (!chr) return
  const p = qtlPhysicalPoint(r, chr)
  if (p === null) return
  const bin = Math.floor(Math.min(p, CHROMOSOME_LENGTHS[chr] - 1) / BIN)
  density.set(`${chr}|${bin}`, (density.get(`${chr}|${bin}`) ?? 0) + 1)
})
const densityRows: object[] = []
Object.keys(CHROMOSOME_LENGTHS)
  .sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b))
  .forEach((chr) => {
    const n = Math.ceil(CHROMOSOME_LENGTHS[chr] / BIN)
    for (let b = 0; b < n; b++) {
      densityRows.push({
        chromosome: chr,
        start_mb: (b * BIN) / 1e6,
        end_mb: Math.min((b + 1) * BIN, CHROMOSOME_LENGTHS[chr]) / 1e6,
        records: density.get(`${chr}|${b}`) ?? 0,
      })
    }
  })
write('qtl_density_10mb.csv', densityRows)
write('chromosomes.csv', Object.keys(CHROMOSOME_LENGTHS)
  .sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b))
  .map((chr) => ({
    chromosome: chr,
    length_mb: CHROMOSOME_LENGTHS[chr] / 1e6,
    centromere_mb: (centromerePosition(chr) * CHROMOSOME_LENGTHS[chr]) / 1e6,
  })))

const classOf = (r: any) => majorClassOf(normalizeTrait(r))
const cls = (rows: any[]) => TRAIT_MAJOR_CLASSES.map((m) => rows.filter((r) => classOf(r) === m).length)
const [q, m, e] = [cls(qtl), cls(mqtl), cls(epi)]
write('records_by_type_and_main_trait.csv', TRAIT_MAJOR_CLASSES.map((main_trait, i) => ({
  main_trait, qtl: q[i], metaqtl: m[i], epistatic: e[i],
})))

write('totals.csv', [{
  qtl: qtl.length, metaqtl: mqtl.length, epistatic: epi.length,
  publications: read('publications.csv').length, qtl_without_year: undated,
}])
console.log(`panel data written to ${path.relative(process.cwd(), OUT)} (${qtl.length} QTL, ${mqtl.length} MetaQTL, ${epi.length} epistatic)`)
