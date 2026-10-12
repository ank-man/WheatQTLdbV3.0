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
  'Multiple abiotic stress',
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

// Broader umbrella groupings shown as homepage "highlight" tiles (Home.tsx),
// each spanning several of the real, individually-filterable categories
// above. Kept as an explicit map (rather than baking "Abiotic stress" or
// "Biotic stress" into TRAIT_CATEGORIES itself) so the Search page's trait
// dropdown/filter can recognise a group name too - selecting one matches any
// QTL whose normalizeTrait() result is one of its listed categories.
export const TRAIT_MAJOR_CLASSES = [
  'Abiotic stress',
  'Biotic stress',
  'Yield & agronomy',
  'Grain quality & composition',
  'Development & morphology',
  'Nutrient use efficiency',
  'Other',
] as const

export type TraitMajorClass = (typeof TRAIT_MAJOR_CLASSES)[number]

// Every category belongs to exactly ONE major class, so a record counted under
// a major class is never also counted under another. The earlier TRAIT_GROUPS
// was an overlapping set of umbrella labels shown alongside the categories
// themselves, which meant a "by group" total and a "by category" total could
// not be reconciled.
export const TRAIT_HIERARCHY: Record<TraitMajorClass, TraitCategory[]> = {
  'Abiotic stress': [
    'Drought tolerance', 'Heat stress tolerance', 'Salt tolerance',
    'Waterlogging tolerance', 'Frost tolerance', 'Multiple abiotic stress',
  ],
  'Biotic stress': [
    'Fungal resistance', 'Bacterial resistance', 'Viral resistance',
    'Nematode resistance', 'Insect resistance',
  ],
  'Yield & agronomy': ['Yield', 'Plant morphology', 'Pre-harvest sprouting'],
  'Grain quality & composition': ['Quality traits', 'Grain morphology', 'Biofortification'],
  'Development & morphology': ['Developmental', 'Physiological traits'],
  'Nutrient use efficiency': ['Nutrient use efficiency'],
  Other: ['Herbicide tolerance', 'Other'],
}

const CATEGORY_TO_MAJOR: Record<string, TraitMajorClass> = {}
;(Object.keys(TRAIT_HIERARCHY) as TraitMajorClass[]).forEach((m) => {
  TRAIT_HIERARCHY[m].forEach((c) => (CATEGORY_TO_MAJOR[c] = m))
})

export function majorClassOf(category: string): TraitMajorClass {
  return CATEGORY_TO_MAJOR[category] ?? 'Other'
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
  // Deliberately a mix of the drought and heat hues: it IS the combination.
  'Multiple abiotic stress': '#b45309',
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
  const v = (value || '').replace(/−/g, '-').replace(/,/g, '').trim()
  if (!v || v === '-' || v === '' || v === 'NA' || v === 'N/A') {
    return { point: null, start: null, end: null }
  }

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

/**
 * Elements measured as a grain concentration or content in this dataset.
 *
 * Deliberately a closed list of element names rather than a pattern: "boron"
 * and "barium" are grain minerals, "bread-making" and "basal" are not, and a
 * loose rule here would quietly reclassify unrelated traits. Zinc, iron and
 * selenium are included so every element reaches the category by one rule.
 */
const MINERAL_ELEMENTS = [
  'zinc', 'iron', 'selenium', 'calcium', 'magnesium', 'manganese', 'copper',
  'sulphur', 'sulfur', 'sodium', 'cadmium', 'nickel', 'cobalt', 'chromium',
  'lead', 'arsenic', 'mercury', 'aluminium', 'aluminum', 'boron', 'barium',
  'molybdenum', 'rubidium', 'strontium', 'lithium', 'caesium', 'cesium',
  'platinum', 'titanium', 'vanadium', 'silicon', 'iodine', 'chloride',
  'phosphorus', 'phosphorous', 'potassium',
] as const

// Matches when an element name appears alongside a composition measurement
// ("Sulphur / Grain Sulphur Concentration"), or when the text names a grain
// element directly. The measurement requirement is what keeps nitrogen,
// phosphorus and potassium USE-EFFICIENCY rows out of this category.
const GRAIN_MINERAL = new RegExp(
  '(^|[^a-z])(' + MINERAL_ELEMENTS.join('|') + ')([^a-z]|$)' +
  '(?=[\\s\\S]*(concentration|content|conc\\.|accumulation|/grain))' +
  '|\\bgrain\\s+(' + MINERAL_ELEMENTS.join('|') + ')\\b', 'i')

/**
 * Classify a record into one trait category.
 *
 * The TRAIT field states what the study was about; the PARAMETER field states
 * what was measured. These are different questions, and conflating them was
 * the source of a large miscount: a drought-tolerance study that scores grain
 * yield under drought has trait="Drought tolerance", parameter="Grain yield",
 * and the old rules - which tested trait and parameter together - filed it
 * under Yield. That moved 4,880 records out of the stress categories and into
 * Yield, inflating Yield from ~9,800 to ~14,700 while emptying the categories
 * the studies were actually about.
 *
 * So the trait field is classified FIRST and alone. The parameter is consulted
 * only when the trait text is too generic to place (empty, or something like
 * "agronomic traits"), where it is the only signal available.
 */
/**
 * How many DISTINCT abiotic stresses a trait description names.
 *
 * Each stress is counted once however many ways it is spelled in the string,
 * so "drought stress, drought tolerance" is one stress and "heat and drought"
 * is two. Used only to recognise combined-stress studies; a single stress
 * falls through to its own rule below.
 */
const STRESS_TERMS: [string, RegExp][] = [
  ['drought', /drought|water deficit|water stress/],
  ['heat', /\bheat\b|high temperature/],
  ['salt', /\bsalt|salin/],
  ['waterlogging', /water-?\s?log/],
  ['cold', /frost|freez|cold acclimat|cold harden|winter surviv/],
  ['sprouting', /sprouting|dormancy/],
  ['aluminium', /alumini?um|\bal toxicity/],
  ['boron', /boron toxicity/],
]

function countStresses(c: string): number {
  return STRESS_TERMS.filter(([, rx]) => rx.test(c)).length
}

/**
 * The classification rules, in priority order, as data rather than as a chain
 * of returns.
 *
 * Written this way for one reason: the order is doing real work, and that is
 * only auditable if the rules can be walked more than once. `classifyText`
 * takes the first match, while `matchingCategories` returns every rule that
 * fires - which is what scripts/audit_trait_overlap.ts uses to report where
 * two categories compete for the same records, and how often. A chain of
 * early returns hides that entirely: it always produces exactly one answer and
 * never admits that a second rule would also have matched.
 */
export const TRAIT_RULES: [TraitCategory, (c: string) => boolean][] = [
  // Pathogen names first: they are unambiguous, and a disease study often also
  // mentions yield or quality in the same string.
  ['Fungal resistance', (c) =>
    c.includes('fungal') || c.includes('fhb') || c.includes('rust') || c.includes('mildew') ||
    c.includes('blight') || c.includes('smut') || c.includes('bunt') || c.includes('powdery') ||
    c.includes('septoria') || c.includes('tan spot') || c.includes('puccinia')],
  ['Bacterial resistance', (c) =>
    c.includes('bacterial') || c.includes('leaf streak') || c.includes('bls')],
  ['Viral resistance', (c) => c.includes('virus') || c.includes('viral')],
  ['Nematode resistance', (c) => c.includes('nematode') || c.includes('cereal cyst')],
  ['Insect resistance', (c) => c.includes('insect')],

  // Combined-stress studies, before the single-stress rules.
  //
  // 571 records read "heat and drought tolerance" and a further ~250 name three
  // or more stresses ("multiple abiotic stress tolerance: drought and heat
  // stress, salinity, pre-harvest sprouting"). First-match ordering filed every
  // one of them under whichever stress happened to be listed earliest in the
  // rules, so a jointly mapped drought+heat QTL was counted as drought only and
  // the heat total lost it entirely. A combined-stress QTL is its own finding -
  // tolerance to two stresses at one locus is the thing such a study reports -
  // so it gets its own category rather than being forced into one of them.
  ['Multiple abiotic stress', (c) => countStresses(c) >= 2],

  // Abiotic stresses: the stress IS the subject of such a study, whatever
  // phenotype was used to score it.
  ['Drought tolerance', (c) => c.includes('drought')],
  ['Salt tolerance', (c) => c.includes('salt') || c.includes('salin')],
  ['Heat stress tolerance', (c) => hasWord(c, 'heat') || c.includes('high temperature')],
  ['Waterlogging tolerance', (c) =>
    c.includes('water-log') || c.includes('water log') || c.includes('waterlog')],
  ['Frost tolerance', (c) =>
    c.includes('frost') || c.includes('freez') || c.includes('winter surviv') ||
    c.includes('lt50') || c.includes('cold-respons') || c.includes('cold acclimat') ||
    c.includes('cold harden') || c.includes('snow mold')],

  // Grain mineral composition, before the nutrient-use-efficiency rule.
  //
  // The Minerals files record one element per row - trait "Sulphur",
  // "Manganese", "Cadmium", "Nickel" and so on, with parameter "Grain <X>
  // Concentration". None of those words appeared in any rule, so 2,948
  // records - every element outside Zn/Fe/Se/Ca - fell through to 'Other',
  // which made Other the fourth-largest category in the database and hid real
  // grain-composition data from the Biofortification view it belongs to.
  //
  // This sits above the nutrient-use rule because "Phosphorous / Grain
  // Phosphorus Concentration" is a composition measurement whereas
  // "Phosphorous use efficiency" is an efficiency trait - the explicit
  // "use efficiency" wording is what separates them.
  ['Biofortification', (c) =>
    GRAIN_MINERAL.test(c) && !/use efficiency|uptake efficien/.test(c)],

  ['Nutrient use efficiency', (c) =>
    c.includes('use efficiency') || c.includes('n-use') || c.includes('n use') ||
    hasWord(c, 'nue') || c.includes('nitrogen') || c.includes('phosphor') ||
    c.includes('potassium')],

  ['Pre-harvest sprouting', (c) => c.includes('sprouting') || c.includes('dormancy')],
  ['Herbicide tolerance', (c) => c.includes('herbicide')],

  // Zinc, iron and selenium are biofortification targets whatever phenotype
  // was scored, so they do not need a composition word the way the other
  // elements do. Requiring one left 73 records unclassified entirely -
  // "Iron / GFeC", "Zinc / Zn deficiency score", "Iron / Fe bioavailability" -
  // because the measurement is named in an abbreviation the rule did not know.
  ['Biofortification', (c) =>
    c.includes('biofort') || c.includes('bioforitif') || c.includes('mineral') ||
    /\b(zinc|iron|selenium)\b/.test(c) || /\bgrain\s+(fe|zn|se)\b/.test(c) ||
    /\b(gfec|gznc|gzn|gfe)\b/.test(c)],

  ['Yield', (c) => c.includes('yield') || c.includes('grain weight') || c.includes('tgw')],

  ['Quality traits', (c) =>
    c.includes('quality') || c.includes('protein') || c.includes('gluten') ||
    c.includes('hardness') || c.includes('sediment') || c.includes('dough') ||
    c.includes('test weight')],

  ['Grain morphology', (c) =>
    c.includes('grain morphology') || c.includes('seed morphology') ||
    c.includes('grain length') || c.includes('grain width') || c.includes('grain shape') ||
    c.includes('kernel length') || c.includes('kernel width') || c.includes('kernel shape') ||
    c.includes('kernel size') || c.includes('seed size')],

  ['Developmental', (c) =>
    c.includes('development') || c.includes('heading') || c.includes('vernal') ||
    c.includes('photoperiod') || c.includes('earliness') || c.includes('flowering') ||
    c.includes('maturity')],

  // "morpholog" alone also matches "grain morphology", so all 1,419 grain
  // morphology records were claimed by this rule too and only lost it because
  // Grain morphology happens to be listed first. A rule that is correct only
  // because of its position is a latent bug: reorder the list and the records
  // move. The grain/seed/kernel qualifiers are excluded explicitly instead.
  ['Plant morphology', (c) =>
    (c.includes('morpholog') && !/\b(grain|seed|kernel|spike)\s+morpholog/.test(c)) ||
    c.includes('plant height') || c.includes('tiller') ||
    c.includes('awn') || c.includes('spike length')],

  ['Physiological traits', (c) => c.includes('physiolog')],
  // Last resort: "disease resistance" with no pathogen named. Fungal pathogens
  // are the overwhelming majority of wheat disease QTL, but this is a guess,
  // and it is deliberately the final rule so a named pathogen always wins.
  ['Fungal resistance', (c) => c.includes('disease')],
]

function classifyText(c: string): TraitCategory | null {
  if (!c.trim()) return null
  for (const [category, matches] of TRAIT_RULES) if (matches(c)) return category
  return null
}

/**
 * Every category whose rule fires for this text, in priority order, not just
 * the winner. Used to audit where the taxonomy genuinely overlaps.
 */
export function matchingCategories(c: string): TraitCategory[] {
  if (!c.trim()) return []
  const out: TraitCategory[] = []
  for (const [category, matches] of TRAIT_RULES) {
    if (matches(c) && !out.includes(category)) out.push(category)
  }
  return out
}

// Trait strings too generic to classify on their own - for these the measured
// parameter is the only usable signal.
const GENERIC_TRAIT = /^(agronomic|morphological|physiological|quantitative|multiple|various|other|misc)/i

export function normalizeTrait(record: QTLRecord | MetaQTLRecord): TraitCategory {
  const t = ((record as QTLRecord).trait || '').toLowerCase().trim()
  const p = ((record as QTLRecord).parameter || '').toLowerCase().trim()

  if (t && !GENERIC_TRAIT.test(t)) {
    const fromTrait = classifyText(t)
    if (fromTrait) return fromTrait
  }
  // trait absent, generic, or unrecognised: fall back to the parameter
  const fromParam = classifyText(`${t} ${p}`)
  return fromParam ?? 'Other'
}

// Finer-grained breakdown within the two categories that actually bundle
// several distinct nutrients/elements under one umbrella label: a record's
// TraitCategory alone doesn't distinguish grain Zn content from grain Se
// content, or N-use efficiency from K-use efficiency, even though those are
// separately meaningful to a user searching for a specific nutrient. Listed
// only for categories where the underlying data supports a real split (see
// normalizeSubTrait) - every other category has none, and the Search page
// only renders a sub-trait dropdown for a category present here.
export const TRAIT_SUBCATEGORIES: Partial<Record<TraitCategory, string[]>> = {
  'Nutrient use efficiency': [
    'Nitrogen use efficiency',
    'Phosphorus use efficiency',
    'Potassium use efficiency',
    'Other nutrient use efficiency',
  ],
  // One entry per element actually present, because a single "Other minerals"
  // bucket is what made this category unusable: it held cadmium, lead and
  // arsenic - contaminants a breeder selects DOWN - alongside manganese and
  // copper, micronutrients to select UP.
  Biofortification: [
    'Zinc', 'Iron', 'Selenium', 'Calcium', 'Magnesium', 'Manganese', 'Copper',
    'Sulphur', 'Phosphorus', 'Potassium', 'Sodium', 'Molybdenum', 'Boron',
    'Cadmium', 'Lead', 'Arsenic', 'Nickel', 'Cobalt', 'Chromium',
    'Other minerals',
  ],
}

// Sub-trait within 'Nutrient use efficiency' / 'Biofortification' only - null
// for every other category (those have no meaningful further split). Reuses
// the same trait+parameter blob as normalizeTrait so a record's sub-trait is
// always consistent with which top-level category it was bucketed into.
export function normalizeSubTrait(record: QTLRecord | MetaQTLRecord): string | null {
  const category = normalizeTrait(record)
  const t = ((record as QTLRecord).trait || (record as MetaQTLRecord).trait || '').toLowerCase().trim()
  const p = ((record as QTLRecord).parameter || (record as MetaQTLRecord).parameter || '').toLowerCase().trim()
  const c = `${t} ${p}`

  if (category === 'Nutrient use efficiency') {
    // Checked in this order so a record mentioning several nutrients still
    // resolves to its most specific match; "nitrogen"/NUE is the broad
    // default since it's both the dominant case in this dataset and the
    // literal name most "use efficiency" rows without a named element imply.
    if (c.includes('phosphor')) return 'Phosphorus use efficiency'
    if (c.includes('potassium') || hasWord(c, 'kue')) return 'Potassium use efficiency'
    if (c.includes('nitrogen') || c.includes('n-use') || c.includes('n use') || hasWord(c, 'nue')) return 'Nitrogen use efficiency'
    return 'Other nutrient use efficiency'
  }

  if (category === 'Biofortification') {
    // Most specific first, so "Zn and Fe concentration" is filed under Zinc
    // rather than falling into the catch-all.
    const byElement: [string, RegExp][] = [
      ['Zinc', /zinc|\bzn\b/], ['Iron', /iron|\bfe\b/], ['Selenium', /selenium|\bse\b/],
      ['Calcium', /calcium|\bca\b/], ['Magnesium', /magnesium|\bmg\b/],
      ['Manganese', /manganese|\bmn\b/], ['Copper', /copper|\bcu\b/],
      ['Sulphur', /sulphur|sulfur/], ['Phosphorus', /phosphor/],
      ['Potassium', /potassium/], ['Sodium', /sodium|\bna\b/],
      ['Molybdenum', /molybdenum/], ['Boron', /boron/], ['Cadmium', /cadmium|\bcd\b/],
      ['Lead', /\blead\b|\bpb\b/], ['Arsenic', /arsenic|\bas\b/],
      ['Nickel', /nickel/], ['Cobalt', /cobalt/], ['Chromium', /chromium/],
    ]
    for (const [label, rx] of byElement) if (rx.test(c)) return label
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

export function prepareItems(qtl: QTLRecord[], metaqtl: MetaQTLRecord[]): MapItem[] {
  const items: MapItem[] = []

  qtl.forEach((r) => {
    const chr = normalizeChromosome(r.chromosome)
    const pos = parsePositionInterval(r.position_interval || '')
    if (!chr || pos.point === null || !isPhysicalPosition(pos)) return
    items.push({
      id: r.id,
      type: 'qtl',
      chromosome: chr,
      point: Math.min(pos.point, chromosomeLength(chr)),
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
