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

/** Free-text GrainGenes search, for names that may not match a record exactly. */
export function grainGenesSearchUrl(query: string): string | null {
  const q = (query || '').trim()
  return q ? `https://graingenes.org/GG3/search_node?keys=${encodeURIComponent(q)}` : null
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
