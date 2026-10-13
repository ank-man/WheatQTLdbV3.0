import { DEFAULT_ASSEMBLY } from './assemblies'

/**
 * Deep links from a record out to the community resources that hold more about
 * it than this database does.
 *
 * GrainGenes is the curatorial home of wheat gene symbols, markers and maps, so
 * a gene like Vrn-A1 or Fhb1 has a far richer record there than here. Its pages
 * sit behind bot protection, which is why this project does not scrape them -
 * but a person following a link arrives in a normal browser and passes that
 * challenge, so linking is both correct and the right division of labour.
 */

const GG = 'https://graingenes.org/cgi-bin/GG3/report.cgi'

/** A GrainGenes record page for a gene symbol, marker or QTL name. */
export function grainGenesUrl(
  name: string,
  cls: 'gene' | 'marker' | 'qtl' | 'locus' | 'map' = 'gene'
): string | null {
  const n = (name || '').trim()
  if (!n) return null
  // Compound symbols such as "Lr46/Yr29" are two records in GrainGenes; link
  // the first, which is the one the record is filed under.
  const primary = n.split(/[/,;]/)[0].trim()
  if (!primary) return null
  return `${GG}?class=${cls}&name=${encodeURIComponent(primary)}`
}

/**
 * GrainGenes search for a name that may not match a record exactly - its class
 * browser with a wildcard either side, so "Rht-B1" also finds "Rht-B1b".
 */
export function grainGenesSearchUrl(
  query: string,
  cls: 'gene' | 'marker' | 'qtl' | 'locus' | 'map' = 'gene'
): string | null {
  const q = (query || '').trim()
  return q ? `${GG.replace('report.cgi', 'browse.cgi')}?class=${cls}&query=${encodeURIComponent(`*${q}*`)}` : null
}

export type GeneKind = 'symbol' | 'model' | 'text'

/**
 * What kind of thing one candidate-gene value is. A gene MODEL id
 * (TraesCS5A02G391700, TRITD2Bv1G013040) is an annotation feature and belongs
 * in Ensembl Plants; a short SYMBOL (Vrn-A1, Lr34, TaGW2) is what GrainGenes
 * curates; anything longer or with spaces is descriptive text, not an
 * identifier, and is not linked anywhere.
 */
export function geneKind(value: string): GeneKind {
  const g = (value || '').trim().replace(/^\((?:HC|LC)\)\s*/i, '')
  if (/^(Traes|TRITD|TRIAE|TraesTL)/i.test(g)) return 'model'
  if (/^[A-Za-z][\w.-]{1,17}$/.test(g) && /\d|-/.test(g) && !/^\d/.test(g)) return 'symbol'
  return 'text'
}

/**
 * Parse a position that may be written as "~ 575 Mb", "575000000",
 * "12.5-18.3 Mb" or plain base pairs, and return base pairs.
 * Returns null when the value is a genetic-map (cM) position, since those
 * cannot be shown on a physical browser.
 */
export function positionToBp(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).replace(/,/g, '').trim()
  if (!s) return null
  const mb = s.match(/([\d.]+)\s*mb/i)
  if (mb) return Math.round(parseFloat(mb[1]) * 1e6)
  const kb = s.match(/([\d.]+)\s*kb/i)
  if (kb) return Math.round(parseFloat(kb[1]) * 1e3)
  const range = s.match(/^[~≈\s]*([\d.]+)\s*[-–]\s*([\d.]+)/)
  if (range) {
    const a = parseFloat(range[1]), b = parseFloat(range[2])
    const mid = (a + b) / 2
    return mid >= 1000 ? Math.round(mid) : null
  }
  const one = s.match(/^[~≈\s]*([\d.]+)$/)
  if (one) {
    const v = parseFloat(one[1])
    // below 1000 this is almost certainly cM, not bp
    return v >= 1000 ? Math.round(v) : null
  }
  return null
}

/**
 * Ensembl Plants genome-browser view around a physical position.
 *
 * Ensembl Plants serves IWGSC RefSeq v1.0 coordinates for Triticum aestivum,
 * so a position recorded against a different assembly will land in the wrong
 * place. `assembly` is therefore required to be the default (v1.0) for a link
 * to be offered at all, rather than silently sending the user somewhere wrong.
 */
export function ensemblPlantsUrl(
  chromosome: string,
  positionBp: number,
  flankBp = 500_000,
  assembly: string = DEFAULT_ASSEMBLY
): string | null {
  if (!chromosome || !Number.isFinite(positionBp)) return null
  if (assembly !== DEFAULT_ASSEMBLY) return null
  const chr = chromosome.toUpperCase().replace(/^CHR/, '')
  if (!/^[1-7][ABD]$/.test(chr)) return null
  const from = Math.max(1, positionBp - flankBp)
  const to = positionBp + flankBp
  return `https://plants.ensembl.org/Triticum_aestivum/Location/View?r=${chr}:${from}-${to}`
}

/** NCBI assembly page, so a user can see the reference a position belongs to. */
export function ncbiAssemblyUrl(accession: string): string | null {
  return accession ? `https://www.ncbi.nlm.nih.gov/datasets/genome/${accession}/` : null
}

export function doiUrl(doi?: string | null): string | null {
  if (!doi) return null
  const d = String(doi).trim()
  if (!d) return null
  if (/^https?:\/\//i.test(d)) return d
  const m = d.match(/10\.\d{4,9}\/\S+/)
  return m ? `https://doi.org/${m[0]}` : null
}

/**
 * Ensembl Plants gene page for an annotation gene model.
 *
 * Gene-model ids are assembly-specific, and the release is encoded in the id
 * itself: TraesCS5A01G... is IWGSC RefSeq v1.0, ...02G... is v1.1 and ...03G...
 * is v2.1. Ensembl Plants serves the v1.1 annotation for Triticum aestivum, so
 * only an 02G id resolves there; a v1.0 or v2.1 id is returned as null rather
 * than linked to a page that will not exist. Durum models (TRITD...) resolve
 * against Triticum turgidum, which Ensembl Plants also carries.
 */
export function ensemblGeneUrl(gene: string): string | null {
  const g = (gene || '').trim().replace(/^\((?:HC|LC)\)\s*/i, '').replace(/\.\d+$/, '')
  if (!g) return null
  if (/^TraesCS(?:U|[1-7][ABD])02G\d{6}(LC)?$/i.test(g)) {
    return `https://plants.ensembl.org/Triticum_aestivum/Gene/Summary?g=${encodeURIComponent(g)}`
  }
  if (/^TRITD[1-7][ABU]v1G\d{6}$/i.test(g)) {
    return `https://plants.ensembl.org/Triticum_turgidum/Gene/Summary?g=${encodeURIComponent(g)}`
  }
  return null
}

/**
 * EnsemblPlants search, for a gene model from an assembly release Ensembl does
 * not serve directly - it still finds the gene by name in most cases, which is
 * more useful than offering nothing.
 */
export function ensemblSearchUrl(gene: string, species = 'Triticum_aestivum'): string | null {
  const g = (gene || '').trim()
  return g ? `https://plants.ensembl.org/${species}/Search/Results?q=${encodeURIComponent(g)}` : null
}
