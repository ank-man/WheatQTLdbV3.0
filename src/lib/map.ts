import { QTLRecord, MetaQTLRecord, EpistaticRecord } from './types'

export const TRAIT_CATEGORIES = [
  'Yield',
  'Fungal resistance',
  'Quality traits',
  'Drought tolerance',
  'Salt tolerance',
  'Heat stress tolerance',
  'Waterlogging tolerance',
  'Abiotic stress (other)',
  'Biofortification',
  'Bacterial resistance',
  'Nematode resistance',
  'Herbicide tolerance',
  'Developmental',
  'Plant morphology',
  'Grain morphology',
  'Nitrogen Use efficiency',
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
export const TRAIT_GROUPS: Record<string, TraitCategory[]> = {
  'Abiotic stress': ['Drought tolerance', 'Salt tolerance', 'Heat stress tolerance', 'Waterlogging tolerance', 'Abiotic stress (other)'],
  'Biotic stress': ['Fungal resistance', 'Bacterial resistance', 'Viral resistance', 'Nematode resistance', 'Insect resistance'],
}

// Every trait/parameter string in the data resolves to one of these (see
// normalizeTrait). The former single "Abiotic stress" bucket (26,517 QTL +
// 348 MetaQTL) is split into its dominant, individually well-represented
// stresses - Drought (18,610), Heat (4,164), Salt (3,615), Waterlogging
// (369) - with a residual "Abiotic stress (other)" for frost/cold, osmotic,
// aluminium toxicity and genuinely combined multi-stress records (~430),
// so nothing reads as an opaque catch-all bucket. "Other" (distinct from
// "Abiotic stress (other)") is kept only as the residual for genuine data
// errors (e.g. a row with no trait/parameter text at all).
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
  'Abiotic stress (other)': '#64748b',
  Biofortification: '#7b1fa2',
  'Bacterial resistance': '#0e8fa0',
  'Nematode resistance': '#ef6c00',
  'Herbicide tolerance': '#5c6bc0',
  Developmental: '#0f9178',
  'Plant morphology': '#a05a2c',
  'Grain morphology': '#c9973f',
  'Nitrogen Use efficiency': '#0277bd',
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

export function normalizeTrait(record: QTLRecord | MetaQTLRecord): TraitCategory {
  const t = ((record as QTLRecord).trait || (record as MetaQTLRecord).trait || '').toLowerCase().trim()
  const p = ((record as QTLRecord).parameter || (record as MetaQTLRecord).parameter || '').toLowerCase().trim()
  const c = `${t} ${p}`

  if (t.includes('yield') || p.includes('yield') || p.includes('grain weight') || p.includes('tgw')) return 'Yield'
  // "puccinia" covers rust pathogens reported by Latin genus name only
  // (Puccinia striiformis/graminis/triticina) with no English "rust" nearby.
  if (c.includes('fungal') || c.includes('fhb') || c.includes('rust') || c.includes('mildew') || c.includes('blight') || c.includes('smut') || c.includes('bunt') || c.includes('powdery') || c.includes('septoria') || c.includes('tan spot') || c.includes('puccinia')) return 'Fungal resistance'
  if (c.includes('quality') || c.includes('protein') || c.includes('gluten') || c.includes('hardness') || c.includes('sediment') || c.includes('dough') || c.includes('test weight')) return 'Quality traits'
  if (c.includes('sprouting') || c.includes('dormancy')) return 'Pre-harvest sprouting'
  // Former single "Abiotic stress" bucket, split into its dominant
  // individual stresses. Order matters for records mentioning more than one
  // stress together (e.g. "drought and heat stress tolerance") - drought is
  // checked first as the single largest category in the source data.
  // "heat" is matched as a whole word (hasWord), not includes() - "wheat"
  // (in "wheat dwarf virus", "wheat blossom midge", etc.) contains "heat" as
  // a bare substring and was wrongly landing disease/insect QTL here.
  if (c.includes('drought')) return 'Drought tolerance'
  if (c.includes('salt')) return 'Salt tolerance'
  if (hasWord(c, 'heat')) return 'Heat stress tolerance'
  // "waterlogging" is spelled inconsistently across source studies
  // (waterlogging / water-logging / water logging) - match regardless of
  // the separator.
  if (c.includes('water-log') || c.includes('water log') || c.includes('waterlog')) return 'Waterlogging tolerance'
  if (c.includes('cold') || c.includes('abiotic') || c.includes('osmotic') || c.includes('alumin') || c.includes('frost') || c.includes('toxic')) return 'Abiotic stress (other)'
  // Nutrient *use efficiency* (agronomic input efficiency) is biologically
  // distinct from *biofortification* (grain nutrient content for nutrition)
  // below, so it's checked first even though both mention the same elements.
  // "nue" is matched as a whole word - as a bare substring it also matches
  // inside unrelated words ("continue", "genuine", "revenue", ...).
  if (c.includes('use efficiency') || c.includes('n-use') || c.includes('n use') || hasWord(c, 'nue') || c.includes('nitrogen')) return 'Nitrogen Use efficiency'
  // "bioforitif" is a known source-data typo for "biofortification" (letters
  // transposed: ...bioFORITIFcation instead of ...bioforTIFIcation).
  if (c.includes('zinc') || c.includes('iron') || c.includes('selenium') || c.includes('biofort') || c.includes('bioforitif') || c.includes('mineral') || c.includes('cadmium') || c.includes('calcium') || c.includes('magnesium') || c.includes('sulph') || c.includes('sulfur') || c.includes('manganese') || c.includes('copper') || c.includes('nickel') || c.includes('molybden') || c.includes('phosphor') || c.includes('potassium') || c.includes('cobalt') || c.includes('rubidium') || c.includes('lead') || c.includes('strontium') || c.includes('arsenic') || c.includes('sodium') || c.includes('boron') || c.includes('lithium') || c.includes('barium') || c.includes('platinum') || c.includes('co ') || c.includes('mo ') || c.includes('grain fe') || c.includes('grain zn')) return 'Biofortification'
  if (c.includes('bacterial') || c.includes('leaf streak') || c.includes('bls')) return 'Bacterial resistance'
  if (c.includes('virus') || c.includes('viral')) return 'Viral resistance'
  if (c.includes('nematode') || c.includes('cereal cyst')) return 'Nematode resistance'
  if (c.includes('insect')) return 'Insect resistance'
  // Bare "disease severity" with no pathogen named defaults to fungal, the
  // overwhelmingly dominant disease type in this dataset; bacterial/viral/
  // nematode/insect above already had first claim on anything more specific.
  if (c.includes('disease')) return 'Fungal resistance'
  if (c.includes('herbicide')) return 'Herbicide tolerance'
  if (c.includes('development') || c.includes('heading') || c.includes('vernal') || c.includes('photoperiod') || c.includes('earliness') || c.includes('flowering') || c.includes('maturity')) return 'Developmental'
  // Grain/kernel morphology (size and shape of the seed itself) is
  // agronomically and visually distinct from whole-plant morphology (height,
  // tillering, spike length, awns): curated from a dedicated source file
  // ("Grain morphology.xlsx", 1,028 records, always trait="Grain Morphology")
  // as well as size/shape parameters recorded under the generic
  // "Morphological trait(s)" label in "Morphological traits_combined.xls" -
  // kept as its own category rather than merged into one opaque
  // "Morphological" bucket. Deliberately excludes weight/count parameters
  // ("kernel weight", "kernels per spike") - those are yield components, not
  // morphology, and fall through to whichever category (often 'Other')
  // already handled them before this split.
  if (
    t.includes('grain morphology') ||
    c.includes('seed morphology') ||
    c.includes('grain length') || c.includes('grain width') || c.includes('grain diameter') ||
    c.includes('grain thickness') || c.includes('grain area') || c.includes('grain perimeter') ||
    c.includes('grain circumference') || c.includes('grain shape') ||
    c.includes('kernel length') || c.includes('kernel width') || c.includes('kernel diameter') ||
    c.includes('kernel thickness') || c.includes('kernel area') || c.includes('kernel perimeter') ||
    c.includes('kernel circumference') || c.includes('kernel shape') || c.includes('kernel size') ||
    c.includes('seed shape') || c.includes('seed size') || c.includes('characterization system')
  ) return 'Grain morphology'
  if (c.includes('morpholog') || c.includes('plant height') || c.includes('tiller') || c.includes('awn') || c.includes('spike length')) return 'Plant morphology'
  if (c.includes('physiological')) return 'Physiological traits'

  return 'Other'
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
