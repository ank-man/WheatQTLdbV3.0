import { QTLRecord, MetaQTLRecord, EpistaticRecord } from './types'

export const TRAIT_CATEGORIES = [
  'Yield',
  'Fungal resistance',
  'Quality traits',
  'Drought tolerance',
  'Salt tolerance',
  'Heat stress tolerance',
  'Waterlogging tolerance',
  'Frost tolerance',
  'Biofortification',
  'Bacterial resistance',
  'Nematode resistance',
  'Herbicide tolerance',
  'Developmental',
  'Plant morphology',
  'Grain morphology',
  'Nutrient use efficiency',
  'Physiological traits',
  'Insect resistance',
  'Viral resistance',
  'Pre-harvest sprouting',
  'Other',
] as const

export type TraitCategory = (typeof TRAIT_CATEGORIES)[number]

// The main traits of the curators' trait table (the WheatQTLdb v2.0 vs v3.0
// comparison), in the order that table lists them. The Search page's "Trait
// class" filter and the Statistics breakdown both use exactly these groups, so
// the site's per-class totals can be read straight against that table.
export const TRAIT_MAJOR_CLASSES = [
  'Nutrient use efficiency',
  'Abiotic stress',
  'Biotic stress',
  'Biofortification',
  'Others',
] as const

export type TraitMajorClass = (typeof TRAIT_MAJOR_CLASSES)[number]

// Every category belongs to exactly ONE main trait, so a record counted under
// one is never also counted under another and the classes sum to the record
// total.
export const TRAIT_HIERARCHY: Record<TraitMajorClass, TraitCategory[]> = {
  'Nutrient use efficiency': ['Nutrient use efficiency'],
  'Abiotic stress': [
    'Waterlogging tolerance', 'Salt tolerance', 'Heat stress tolerance',
    'Pre-harvest sprouting', 'Drought tolerance', 'Frost tolerance',
  ],
  'Biotic stress': [
    'Nematode resistance', 'Insect resistance', 'Bacterial resistance',
    'Fungal resistance', 'Viral resistance',
  ],
  Biofortification: ['Biofortification'],
  Others: [
    'Herbicide tolerance', 'Yield', 'Developmental', 'Physiological traits',
    'Plant morphology', 'Grain morphology', 'Quality traits', 'Other',
  ],
}

const CATEGORY_TO_MAJOR: Record<string, TraitMajorClass> = {}
;(Object.keys(TRAIT_HIERARCHY) as TraitMajorClass[]).forEach((m) => {
  TRAIT_HIERARCHY[m].forEach((c) => (CATEGORY_TO_MAJOR[c] = m))
})

export function majorClassOf(category: string): TraitMajorClass {
  return CATEGORY_TO_MAJOR[category] ?? 'Others'
}


// Every trait/parameter string in the data resolves to one of these (see
// normalizeTrait). The former single "Abiotic stress" bucket (26,517 QTL +
// 348 MetaQTL) is split into its dominant, individually well-represented
// stresses - Drought (18,610), Heat (4,164), Salt (3,615), Waterlogging
// (369) - plus "Frost tolerance", curated from a single dedicated source
// ("Frost tolerance final_RishiMuni") covering freezing tolerance, winter
// survival, LT50 and cold-acclimation gene expression - so nothing reads as
// an opaque catch-all bucket. "Other" is kept only as the residual for
// genuine data errors (e.g. a row with no trait/parameter text at all).
//
// At 21 categories, some hue closeness between adjacent swatches is
// unavoidable in a single-channel qualitative palette (the dataviz skill's
// own guidance puts ~16 as the practical ceiling for full colourblind-safe
// separation) - every use of these colours is paired with a text label
// (dropdown option, legend chip, category name), so identity never depends
// on colour alone.
export const TRAIT_COLORS: Record<TraitCategory, string> = {
  Yield: '#2e7d32',
  'Fungal resistance': '#c62828',
  'Quality traits': '#d4a017',
  'Drought tolerance': '#a16207',
  'Salt tolerance': '#0e7490',
  'Heat stress tolerance': '#e11d48',
  'Waterlogging tolerance': '#1565c0',
  'Frost tolerance': '#64748b',
  Biofortification: '#7b1fa2',
  'Bacterial resistance': '#0e8fa0',
  'Nematode resistance': '#ef6c00',
  'Herbicide tolerance': '#5c6bc0',
  Developmental: '#0f9178',
  'Plant morphology': '#a05a2c',
  'Grain morphology': '#c9973f',
  'Nutrient use efficiency': '#0277bd',
  'Physiological traits': '#5e35b1',
  'Insect resistance': '#c2185b',
  'Viral resistance': '#7cb342',
  'Pre-harvest sprouting': '#33691e',
  Other: '#a87025',
}

// Relative centromere positions from the top (short-arm end) of each chromosome.
// Values for 1A, 1B, 1D, 2A, 2B, 2D, 6A, 6B, 6D, 7A, 7B, 7D are midpoints of the
// CENH3-binding regions reported in Su et al. (2019) Plant Cell 31:2035-2052.
// Remaining chromosomes use consensus cytological positions for submetacentric/
// subtelocentric wheat chromosomes.
export const CENTROMERE_POSITIONS: Record<string, number> = {
  '1A': 0.452,
  '1B': 0.484,
  '1D': 0.389,
  '2A': 0.438,
  '2B': 0.434,
  '2D': 0.413,
  '3A': 0.45,
  '3B': 0.45,
  '3D': 0.45,
  '4A': 0.20,
  '4B': 0.20,
  '4D': 0.20,
  '5A': 0.48,
  '5B': 0.48,
  '5D': 0.48,
  '6A': 0.466,
  '6B': 0.490,
  '6D': 0.453,
  '7A': 0.492,
  '7B': 0.375,
  '7D': 0.530,
}

export function centromerePosition(chromosome: string): number {
  return CENTROMERE_POSITIONS[chromosome] ?? 0.5
}

// IWGSC RefSeq v1.0 pseudomolecule lengths in base pairs (GCA_900519105.1).
// Source: International Wheat Genome Sequencing Consortium (2018) Science;
// cross-checked against Ensembl Plants' triticum_aestivum assembly info.
export const CHROMOSOME_LENGTHS: Record<string, number> = {
  '1A': 594102056,
  '1B': 689851870,
  '1D': 495453186,
  '2A': 780798557,
  '2B': 801256715,
  '2D': 651852609,
  '3A': 750843639,
  '3B': 830829764,
  '3D': 615552423,
  '4A': 744588157,
  '4B': 673617499,
  '4D': 509857067,
  '5A': 709773743,
  '5B': 713149757,
  '5D': 566080677,
  '6A': 618079260,
  '6B': 720988478,
  '6D': 473592718,
  '7A': 736706236,
  '7B': 750620385,
  '7D': 638686055,
}

export function chromosomeLength(chromosome: string): number {
  return CHROMOSOME_LENGTHS[chromosome] ?? 600000000
}

// Wheat's three subgenomes (A/B/D) each descend from a different diploid
// ancestor, so every karyotype view (Circos, Ideogram, the manuscript R
// figure) gives each one its own hue instead of a grey/flat shade.
// `currentColor` + a Tailwind text-* class keeps this responsive to the
// light/dark theme without JS.
export const GENOME_COLOR_CLASS: Record<string, string> = {
  A: 'text-[#e8a33d] dark:text-[#8a6220]',
  B: 'text-[#4f8fc0] dark:text-[#2f5878]',
  D: 'text-[#5fa777] dark:text-[#355e42]',
}

export function genomeOf(chromosome: string): string {
  return chromosome.slice(-1)
}

export function normalizeChromosome(chromosome: string): string | null {
  const raw = (chromosome || '').toUpperCase().trim()
  if (!raw || raw === 'UN' || raw === 'UNKNOWN') return null
  // Group arm-level entries into their main chromosome (e.g. 5DL -> 5D)
  const m = raw.match(/^(\d)([ABD])([LS]?)$/)
  if (!m) return null
  return `${m[1]}${m[2]}`
}

// T. durum, T. turgidum subsp./ssp. dicoccoides and T. turgidum subsp./ssp.
// dicoccum are all subspecies of Triticum turgidum, so they're grouped and
// labelled as a single "Triticum turgidum" species everywhere a species name
// is displayed or counted (Search filter, Statistics, homepage species
// count) rather than as four near-duplicate entries.
const TURGIDUM_GROUP = new Set([
  'triticum turgidum',
  'triticum durum',
  'triticum turgidum subsp. dicoccoides',
  'triticum turgidum subsp. dicoccum',
  'triticum turgidum ssp. dicoccoides',
  'triticum turgidum ssp. dicoccum',
])

export function normalizeSpecies(s: string): string {
  const trimmed = s.trim()
  const key = trimmed.toLowerCase().replace(/\s+/g, ' ')
  return TURGIDUM_GROUP.has(key) ? 'Triticum turgidum' : trimmed
}

export function chromosomeSortKey(chromosome: string): number {
  const m = chromosome.match(/^(\d)([ABD])$/)
  if (!m) return 999
  const genomeOrder: Record<string, number> = { A: 0, B: 1, D: 2 }
  return parseInt(m[1], 10) * 10 + genomeOrder[m[2]]
}

export interface ParsedPosition {
  point: number | null
  start: number | null
  end: number | null
}

export function parsePositionInterval(value: string): ParsedPosition {
  const none: ParsedPosition = { point: null, start: null, end: null }
  let v = (value || '').replace(/,/g, '').trim()
  if (!v || v === '-' || v === 'NA' || v === 'N/A') return none

  // The sources write the same position many ways - "99.79Mb", "417502036 bp",
  // "29 cM", "32.7—42.6", "510051474..510054986", "5BL: 528589968",
  // "12.3/3.9-17.3" (peak / confidence interval). Each was unreadable here, so
  // 4,000-odd records with a perfectly good position were reported as having
  // none, and the megabase ones were missing from the physical map. Reduce
  // them to the plain forms handled below; anything genuinely ambiguous
  // ("610/748", "86.1-92.1/162.7-189.7") is still left unparsed, not guessed.
  let scale = 1
  const unit = v.match(/^(.*\d)\s*(mbp|mb|bp|cm)\**$/i)
  if (unit) {
    v = unit[1].trim()
    if (unit[2].toLowerCase().startsWith('mb')) scale = 1e6
  }
  v = v
    .replace(/^[1-7][ABD][LS]?:\s*/i, '')          // "5BL: 528589968"
    .replace(/\*+$/, '')
    .replace(/\s*(?:—|–|−|~|\.\.|\bto\b)\s*/g, '-')
    .trim()
  const peak = v.match(/^(\d+(?:\.\d+)?)\/(?:-|(\d+(?:\.\d+)?-\d+(?:\.\d+)?))?$/)
  if (peak) {
    // Only a peak that lies inside its own interval is "peak / confidence
    // interval". "182/274.5-288.5" is a cM position beside a physical
    // interval - two coordinate systems in one cell - and stays unparsed.
    const [lo, hi] = (peak[2] ?? '').split('-').map(Number)
    if (peak[2] && !(Number(peak[1]) >= Math.min(lo, hi) && Number(peak[1]) <= Math.max(lo, hi))) return none
    v = peak[2] ? `${peak[1]}(${peak[2]})` : peak[1]
  }
  const bare = v.match(/^\((\d+(?:\.\d+)?-\d+(?:\.\d+)?)\)$/)
  if (bare) v = bare[1]

  const parsed = parsePlainPosition(v)
  if (scale === 1 || parsed.point === null) return parsed
  return {
    point: parsed.point * scale,
    start: parsed.start === null ? null : parsed.start * scale,
    end: parsed.end === null ? null : parsed.end * scale,
  }
}

function parsePlainPosition(v: string): ParsedPosition {
  // 46.8(43.5-50.1) or 46.8 (43.5-50.1) - the "(" must actually be present:
  // with it optional, a plain "667717050-670783640" range (no parens at all)
  // also satisfies this pattern via regex backtracking, since \d+ can give
  // up nearly all of its digits to the "point" group and leave just the
  // trailing digit(s) for "start" - e.g. point="66771705", start="0", end=
  // "670783640", corrupting the true start to 0 and making the interval
  // look like it spans from the chromosome origin. Requiring "(" (and its
  // matching ")") makes this pattern match ONLY genuine point+interval
  // strings, so a bare range correctly falls through to the next pattern.
  const paren = v.match(/^(\d+(?:\.\d+)?)\s*\(\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*\)$/)
  if (paren) {
    const start = parseFloat(paren[2])
    const end = parseFloat(paren[3])
    return { point: parseFloat(paren[1]), start: Math.min(start, end), end: Math.max(start, end) }
  }

  // 100-110.9
  const range = v.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/)
  if (range) {
    const start = parseFloat(range[1])
    const end = parseFloat(range[2])
    const mid = (start + end) / 2
    return { point: mid, start: Math.min(start, end), end: Math.max(start, end) }
  }

  // single numeric value
  const single = v.match(/^(\d+(?:\.\d+)?)$/)
  if (single) {
    const point = parseFloat(single[1])
    return { point, start: point, end: point }
  }

  return { point: null, start: null, end: null }
}

// Whole-word substring match - unlike String.includes(), doesn't fire on a
// keyword that merely occurs INSIDE a longer, unrelated word (e.g. "heat"
// inside "wheat", "nue" inside "continue").
function hasWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(haystack)
}

const has = (c: string, ...words: string[]) => words.some((w) => c.includes(w))

/**
 * The classification rules, in priority order: a record takes the category of
 * the FIRST rule it satisfies. Each rule sees the lower-cased trait (t), the
 * parameter (p), and the two joined (c).
 *
 * THESE RULES DEFINE THE PUBLISHED TRAIT STATISTICS. The curators' trait table
 * (80,641 QTL: Yield 14,728, Drought tolerance 18,430, Heat 4,008, Salt 3,545,
 * Biofortification 7,502, Nutrient use efficiency 6,983, ...) was counted with
 * exactly this rule set, and scripts/audit/trait_overlap.ts checks every
 * category against that table on each data rebuild. A reordering or a new rule
 * moves records between categories and silently changes the published numbers
 * - which is what happened when classification was switched to "trait field
 * first": Yield fell to 9,813, Drought rose to 20,913 and a "Multiple abiotic
 * stress" category appeared that the table does not have.
 *
 * The order matters most for Yield, which is tested first on the parameter: a
 * QTL for grain yield or grain weight is counted as a yield QTL whichever
 * source file it was curated in, including when it was mapped under drought,
 * heat or salt stress.
 */
export const TRAIT_RULES: [TraitCategory, (c: string, t: string, p: string) => boolean][] = [
  ['Yield', (_c, t, p) => t.includes('yield') || has(p, 'yield', 'grain weight', 'tgw')],
  // "puccinia" covers rust pathogens reported by Latin genus name only
  // (Puccinia striiformis/graminis/triticina) with no English "rust" nearby.
  ['Fungal resistance', (c) => has(c, 'fungal', 'fhb', 'rust', 'mildew', 'blight', 'smut',
    'bunt', 'powdery', 'septoria', 'tan spot', 'puccinia')],
  ['Quality traits', (c) => has(c, 'quality', 'protein', 'gluten', 'hardness', 'sediment',
    'dough', 'test weight')],
  ['Pre-harvest sprouting', (c) => has(c, 'sprouting', 'dormancy')],
  // Drought is checked first among the stresses as the single largest one, so
  // a record naming several ("drought and heat stress tolerance") is drought.
  ['Drought tolerance', (c) => c.includes('drought')],
  ['Salt tolerance', (c) => c.includes('salt')],
  // "heat" as a whole word - "wheat" (in "wheat dwarf virus", "wheat blossom
  // midge") contains it as a bare substring.
  ['Heat stress tolerance', (c) => hasWord(c, 'heat')],
  // Spelled waterlogging / water-logging / water logging across sources.
  ['Waterlogging tolerance', (c) => has(c, 'water-log', 'water log', 'waterlog')],
  // Deliberately narrow (not a generic "cold/osmotic" catch-all), which used
  // to pull in unrelated "osmotic potential" physiological-trait rows.
  ['Frost tolerance', (c) => has(c, 'frost', 'freez', 'winter surviv', 'lt50', 'cold-respons',
    'cold acclimat', 'cold harden', 'snow mold')],
  // Nutrient USE EFFICIENCY is distinct from biofortification (grain nutrient
  // content) below, so it is checked first even though both name the same
  // elements. "nue" is matched as a whole word ("continue", "revenue").
  ['Nutrient use efficiency', (c) => has(c, 'use efficiency', 'n-use', 'n use', 'nitrogen') ||
    hasWord(c, 'nue')],
  // "bioforitif" is a known source-data typo for "biofortification".
  ['Biofortification', (c) => has(c, 'zinc', 'iron', 'selenium', 'biofort', 'bioforitif',
    'mineral', 'cadmium', 'calcium', 'magnesium', 'sulph', 'sulfur', 'manganese', 'copper',
    'nickel', 'molybden', 'phosphor', 'potassium', 'cobalt', 'rubidium', 'lead', 'strontium',
    'arsenic', 'sodium', 'boron', 'lithium', 'barium', 'platinum', 'co ', 'mo ', 'grain fe',
    'grain zn')],
  ['Bacterial resistance', (c) => has(c, 'bacterial', 'leaf streak', 'bls')],
  ['Viral resistance', (c) => has(c, 'virus', 'viral')],
  ['Nematode resistance', (c) => has(c, 'nematode', 'cereal cyst')],
  ['Insect resistance', (c) => c.includes('insect')],
  // Bare "disease severity" with no pathogen named defaults to fungal, the
  // overwhelmingly dominant disease type here; the specific pathogens above
  // already had first claim.
  ['Fungal resistance', (c) => c.includes('disease')],
  ['Herbicide tolerance', (c) => c.includes('herbicide')],
  ['Developmental', (c) => has(c, 'development', 'heading', 'vernal', 'photoperiod',
    'earliness', 'flowering', 'maturity')],
  // Size and shape of the seed itself, as opposed to whole-plant morphology.
  // Excludes weight/count parameters ("kernel weight", "kernels per spike"),
  // which are yield components.
  ['Grain morphology', (c, t) => t.includes('grain morphology') || has(c, 'seed morphology',
    'grain length', 'grain width', 'grain diameter', 'grain thickness', 'grain area',
    'grain perimeter', 'grain circumference', 'grain shape', 'kernel length', 'kernel width',
    'kernel diameter', 'kernel thickness', 'kernel area', 'kernel perimeter',
    'kernel circumference', 'kernel shape', 'kernel size', 'seed shape', 'seed size',
    'characterization system')],
  ['Plant morphology', (c) => has(c, 'morpholog', 'plant height', 'tiller', 'awn',
    'spike length')],
  ['Physiological traits', (c) => c.includes('physiological')],
]

function fields(record: { trait?: string; parameter?: string }): [string, string, string] {
  const t = (record.trait || '').toLowerCase().trim()
  const p = (record.parameter || '').toLowerCase().trim()
  return [`${t} ${p}`, t, p]
}

export function normalizeTrait(record: { trait?: string; parameter?: string }): TraitCategory {
  const [c, t, p] = fields(record)
  for (const [category, matches] of TRAIT_RULES) if (matches(c, t, p)) return category
  return 'Other'
}

/**
 * Every category whose rule fires for this record, in priority order, not just
 * the winner. Used by scripts/audit/trait_overlap.ts to report where the
 * categories compete for the same records.
 */
export function matchingCategories(record: { trait?: string; parameter?: string }): TraitCategory[] {
  const [c, t, p] = fields(record)
  const out: TraitCategory[] = []
  for (const [category, matches] of TRAIT_RULES) {
    if (matches(c, t, p) && !out.includes(category)) out.push(category)
  }
  return out
}

// Finer-grained breakdown within the two categories that bundle several
// distinct nutrients under one label, matching the sub-categories of the
// curators' trait table (N / P / K use efficiency; Zn, Fe and Se content vs
// other minerals). The Search page only renders a sub-trait dropdown for a
// category present here.
export const TRAIT_SUBCATEGORIES: Partial<Record<TraitCategory, string[]>> = {
  'Nutrient use efficiency': [
    'Nitrogen use efficiency',
    'Phosphorus use efficiency',
    'Potassium use efficiency',
    'Other nutrient use efficiency',
  ],
  Biofortification: [
    'Zinc',
    'Iron',
    'Selenium',
    'Calcium',
    'Other minerals',
  ],
}

// Sub-trait within 'Nutrient use efficiency' / 'Biofortification' only - null
// for every other category. Reads the same trait+parameter text as
// normalizeTrait so a record's sub-trait is always consistent with its
// category.
export function normalizeSubTrait(record: { trait?: string; parameter?: string }): string | null {
  const category = normalizeTrait(record)
  const [c] = fields(record)

  if (category === 'Nutrient use efficiency') {
    // "nitrogen"/NUE is the default named element since it is both the
    // dominant case and what most "use efficiency" rows without one imply.
    if (c.includes('phosphor')) return 'Phosphorus use efficiency'
    if (c.includes('potassium') || hasWord(c, 'kue')) return 'Potassium use efficiency'
    if (has(c, 'nitrogen', 'n-use', 'n use') || hasWord(c, 'nue')) return 'Nitrogen use efficiency'
    return 'Other nutrient use efficiency'
  }

  if (category === 'Biofortification') {
    if (c.includes('zinc')) return 'Zinc'
    if (c.includes('iron')) return 'Iron'
    if (c.includes('selenium')) return 'Selenium'
    if (c.includes('calcium')) return 'Calcium'
    return 'Other minerals'
  }

  return null
}

// A QTL/MTA is "multi-trait" (pleiotropic) when one locus was reported against
// two or more distinct traits.
//
// The decision is made in convert_datasets.py and shipped in the data, not
// recomputed here, because it needs whole-dataset context that a single record
// cannot supply. Two corrections it applies that a naive "parameter contains a
// comma" test misses:
//
//   * trait x environment combinations collapse to one trait ("Grain
//     yield_M_17, Grain yield_S_18" is one trait in two environments); and
//   * a long parameter string repeated across many rows of one source is the
//     list of traits that STUDY phenotyped, pasted onto every marker row -
//     not a claim that each marker affects all of them. In the wheat data that
//     single artefact accounted for 457 of 1,651 supposed pleiotropic records.
export function multiTraitList(record: Pick<QTLRecord, 'parameter'>): string[] {
  return (record.parameter || '')
    .split(/[,&]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isMultiTraitQTL(record: Pick<QTLRecord, 'parameter' | 'multi_trait'>): boolean {
  return String((record as QTLRecord).multi_trait ?? '').toLowerCase() === 'yes'
}

/** Distinct locus x study key - the same locus reported for several traits is
 *  several records but ONE locus, which is what a "how many QTL" headline
 *  should reflect. */
export function locusKey(r: QTLRecord): string {
  return [r.qtl_name, r.associated_markers, r.chromosome, r.position_interval, r.doi].join('|')
}

export interface QTLItem {
  id: string
  type: 'qtl'
  chromosome: string
  point: number
  trait: TraitCategory
  name: string
  raw: QTLRecord
}

export interface MetaQTLItem {
  id: string
  type: 'metaqtl'
  chromosome: string
  point: number
  start: number
  end: number
  trait: TraitCategory
  name: string
  raw: MetaQTLRecord
}

export type MapItem = QTLItem | MetaQTLItem

// Per repo convention (see convert_datasets.py / scripts/metaqtl_circos_figure.R),
// a parsed position is treated as physical bp when any of its numbers is >=1000,
// otherwise it's a genetic-distance (cM) value from a linkage map. cM and bp
// don't scale linearly along a chromosome (recombination rate varies sharply
// near telomeres vs. centromeres), so a proportional cM->bp guess would give a
// false sense of physical precision. Physical-coordinate views (Circos,
// ideogram/karyotype) only plot records with a genuine physical position;
// cM-only records are excluded from those views rather than estimated onto
// the physical axis.
export function isPhysicalPosition(pos: ParsedPosition): boolean {
  return [pos.point, pos.start, pos.end].some((v) => v !== null && v >= 1000)
}

/**
 * Physical (bp) position of a QTL on its chromosome, or null if it has none.
 *
 * The position field is used when it is physical. Otherwise a coordinate
 * written into the marker name itself ("chr3B_559428575") is used - the same
 * rule the epistatic links already follow. A cM-only record returns null.
 */
export function qtlPhysicalPoint(r: QTLRecord, chr: string): number | null {
  const pos = parsePositionInterval(r.position_interval || '')
  if (pos.point !== null && isPhysicalPosition(pos)) return pos.point
  return markerPosition(r.associated_markers || '', chr)
}

export function prepareItems(qtl: QTLRecord[], metaqtl: MetaQTLRecord[]): MapItem[] {
  const items: MapItem[] = []

  qtl.forEach((r) => {
    const chr = normalizeChromosome(r.chromosome)
    if (!chr) return
    const point = qtlPhysicalPoint(r, chr)
    if (point === null) return
    items.push({
      id: r.id,
      type: 'qtl',
      chromosome: chr,
      point: Math.min(point, chromosomeLength(chr)),
      trait: normalizeTrait(r),
      name: r.qtl_name || r.id,
      raw: r,
    })
  })

  metaqtl.forEach((r) => {
    const chr = normalizeChromosome(r.chromosome)
    const pos = parsePositionInterval(r.position_interval || '')
    if (!chr || pos.point === null || !isPhysicalPosition(pos)) return
    const len = chromosomeLength(chr)
    const point = Math.min(pos.point, len)
    items.push({
      id: r.id,
      type: 'metaqtl',
      chromosome: chr,
      point,
      start: pos.start !== null ? Math.min(pos.start, len) : point,
      end: pos.end !== null ? Math.min(pos.end, len) : point,
      trait: normalizeTrait(r),
      name: r.mqtl_name || r.id,
      raw: r,
    })
  })

  return items
}

export interface EpistaticLink {
  id: string
  chromosome1: string
  point1: number
  chromosome2: string
  point2: number
  trait: TraitCategory
  name: string
  raw: EpistaticRecord
}

/**
 * Extract a physical bp coordinate from marker names such as
 * "chr3B_559428575" or "chr3B_559428575/chr3B_628777199".
 * When the marker describes an interval, the midpoint is returned.
 * Only coordinates on the requested chromosome are considered.
 */
export function markerPosition(marker: string, chromosome: string): number | null {
  if (!marker) return null
  const re = /chr([1-7][ABD])[_-](\d+)/gi
  const coords: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(marker)) !== null) {
    if (m[1].toUpperCase() === chromosome.toUpperCase()) {
      coords.push(parseInt(m[2], 10))
    }
  }
  if (coords.length === 0) return null
  return (Math.min(...coords) + Math.max(...coords)) / 2
}

/**
 * Convert epistatic QTL pairs into normalized links between two genomic points.
 *
 * The curated epistatic sheet frequently leaves position_interval2 blank while
 * still recording physical coordinates inside the marker names, so marker-derived
 * bp positions are preferred and position_interval is used as the fallback. A
 * pair is only plotted when BOTH loci resolve to a genuine physical (bp)
 * position; a cM-only fallback is not proportionally guessed onto the
 * physical axis (see isPhysicalPosition above) - such pairs are dropped here
 * rather than shown at a fabricated position.
 */
export function prepareEpistaticLinks(epistatic: EpistaticRecord[]): EpistaticLink[] {
  const resolve = (chr: string, marker?: string, interval?: string): number | null => {
    const fromMarker = markerPosition(marker || '', chr)
    if (fromMarker !== null) return fromMarker
    const point = parsePositionInterval(interval || '').point
    return point !== null && point >= 1000 ? point : null
  }

  const links: EpistaticLink[] = []
  epistatic.forEach((r) => {
    const chr1 = normalizeChromosome(r.chromosome1)
    const chr2 = normalizeChromosome(r.chromosome2)
    if (!chr1 || !chr2) return
    const p1 = resolve(chr1, r.markers1, r.position_interval1)
    const p2 = resolve(chr2, r.markers2, r.position_interval2)
    if (p1 === null || p2 === null) return
    links.push({
      id: r.id,
      chromosome1: chr1,
      point1: Math.min(p1, chromosomeLength(chr1)),
      chromosome2: chr2,
      point2: Math.min(p2, chromosomeLength(chr2)),
      trait: normalizeTrait(r as unknown as QTLRecord),
      name: [r.qtl1, r.qtl2].filter(Boolean).join(' × ') || r.id,
      raw: r,
    })
  })
  return links
}

export function chromosomeRanges(items: MapItem[]): Map<string, { min: number; max: number }> {
  const ranges = new Map<string, { min: number; max: number }>()
  items.forEach((item) => {
    const p = item.type === 'metaqtl' ? item.end : item.point
    if (!ranges.has(item.chromosome)) {
      ranges.set(item.chromosome, { min: p, max: p })
    } else {
      const r = ranges.get(item.chromosome)!
      r.min = Math.min(r.min, item.type === 'metaqtl' ? item.start : item.point)
      r.max = Math.max(r.max, p)
    }
  })
  return ranges
}

export function sortedChromosomes(items: MapItem[]): string[] {
  const ranges = chromosomeRanges(items)
  const chromosomes = Array.from(ranges.keys())
  return chromosomes.sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b))
}
