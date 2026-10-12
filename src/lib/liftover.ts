import { ASSEMBLIES, Assembly, DEFAULT_ASSEMBLY, assemblyFor, lengthDelta } from './assemblies'

/**
 * Conversion of coordinates between wheat reference assemblies.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not invent a conversion. Two assemblies of the same genome differ by
 * insertions, deletions and local rearrangements, not by a constant factor, so
 * there is no arithmetic that converts v1.0 coordinates to v2.1. Scaling a
 * position by the ratio of chromosome lengths would produce a plausible-looking
 * number that is wrong by megabases in exactly the regions that were
 * restructured - the regions a QTL study is most likely to care about.
 *
 * A real conversion needs an alignment-derived correspondence between the two
 * assemblies. The IWGSC publishes these through URGI, but that site runs
 * anti-automation protection, so the file cannot be fetched by this pipeline
 * and has to be downloaded by hand and dropped in as public/data/liftover/.
 * Until one is present, `convert()` reports that conversion is unavailable
 * rather than guessing.
 *
 * What the module DOES provide without a correspondence file:
 *   - the assembly a record's coordinates belong to,
 *   - detection of cross-assembly comparisons, and
 *   - the size of the discrepancy, so a user can judge whether it matters.
 */

export interface LiftoverSegment {
  chromosome: string
  /** Half-open interval on the source assembly. */
  srcStart: number
  srcEnd: number
  /** Corresponding interval on the target assembly. */
  dstStart: number
  dstEnd: number
}

export interface LiftoverChain {
  from: string
  to: string
  segments: LiftoverSegment[]
}

export type ConversionResult =
  | { ok: true; position: number; assembly: string; method: 'correspondence' }
  | { ok: false; reason: string; discrepancyPct?: number }

/** Chains supplied at runtime (see loadChain). Empty until one is provided. */
const chains = new Map<string, LiftoverChain>()

const chainKey = (from: string, to: string) => `${from}=>${to}`

/**
 * Register a correspondence file.
 *
 * Expected shape, one segment per line (tab or comma separated):
 *     chromosome  srcStart  srcEnd  dstStart  dstEnd
 * which is what an alignment-derived correspondence table reduces to. Segments
 * need not cover the whole chromosome; positions falling in a gap are reported
 * as unconvertible rather than interpolated, because a gap is precisely where
 * the two assemblies disagree.
 */
export function loadChain(from: string, to: string, text: string): number {
  const segments: LiftoverSegment[] = []
  text.split(/\r?\n/).forEach((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const p = t.split(/[\t,]/).map((x) => x.trim())
    if (p.length < 5) return
    const [chrom, a, b, c, d] = p
    const srcStart = Number(a), srcEnd = Number(b)
    const dstStart = Number(c), dstEnd = Number(d)
    if (![srcStart, srcEnd, dstStart, dstEnd].every(Number.isFinite)) return
    segments.push({ chromosome: chrom, srcStart, srcEnd, dstStart, dstEnd })
  })
  segments.sort((x, y) =>
    x.chromosome === y.chromosome ? x.srcStart - y.srcStart
      : x.chromosome.localeCompare(y.chromosome))
  chains.set(chainKey(from, to), { from, to, segments })
  return segments.length
}

export function hasChain(from: string, to: string): boolean {
  return chains.has(chainKey(from, to))
}

export function availableConversions(): string[] {
  return Array.from(chains.keys())
}

/**
 * Convert one position between assemblies.
 *
 * Within a segment the position is placed proportionally, which is valid
 * because a segment is by construction a colinear block - the assemblies agree
 * on its internal order. Between segments it is not, so those return ok:false.
 */
export function convert(
  chromosome: string,
  position: number,
  from: string,
  to: string
): ConversionResult {
  if (from === to) return { ok: true, position, assembly: to, method: 'correspondence' }

  const chain = chains.get(chainKey(from, to))
  if (!chain) {
    const delta = lengthDelta(from, to, chromosome)
    return {
      ok: false,
      reason:
        `No correspondence file loaded for ${from} → ${to}. ` +
        `Conversion between wheat assemblies requires an alignment-derived ` +
        `mapping; it cannot be computed from chromosome lengths alone.`,
      discrepancyPct: delta === null ? undefined : delta * 100,
    }
  }

  // binary search for the segment containing `position`
  const segs = chain.segments.filter((s) => s.chromosome === chromosome)
  let lo = 0, hi = segs.length - 1, hit: LiftoverSegment | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const s = segs[mid]
    if (position < s.srcStart) hi = mid - 1
    else if (position >= s.srcEnd) lo = mid + 1
    else { hit = s; break }
  }
  if (!hit) {
    return {
      ok: false,
      reason:
        `Position ${chromosome}:${position.toLocaleString()} falls outside every ` +
        `aligned block between ${from} and ${to} — the assemblies do not ` +
        `correspond here, so no position can be assigned.`,
    }
  }

  const srcSpan = hit.srcEnd - hit.srcStart
  const dstSpan = hit.dstEnd - hit.dstStart
  const frac = srcSpan > 0 ? (position - hit.srcStart) / srcSpan : 0
  return {
    ok: true,
    position: Math.round(hit.dstStart + frac * dstSpan),
    assembly: to,
    method: 'correspondence',
  }
}

/**
 * Whether two records can be compared directly, and how badly they would
 * disagree if compared anyway.
 */
export function comparabilityWarning(
  chromosome: string,
  assemblyA?: string | null,
  assemblyB?: string | null
): string | null {
  const a = assemblyA || DEFAULT_ASSEMBLY
  const b = assemblyB || DEFAULT_ASSEMBLY
  if (a === b) return null
  const delta = lengthDelta(a, b, chromosome)
  if (delta === null) {
    return `Positions are on different assemblies (${a} vs ${b}) and cannot be compared directly.`
  }
  const pct = Math.abs(delta * 100)
  const mb = Math.abs(
    ((ASSEMBLIES[b]?.lengths[chromosome] ?? 0) - (ASSEMBLIES[a]?.lengths[chromosome] ?? 0)) / 1e6
  )
  return (
    `Positions are on different assemblies (${a} vs ${b}). ` +
    `Chromosome ${chromosome} differs by ${mb.toFixed(1)} Mb (${pct.toFixed(2)}%) between them, ` +
    `so an uncorrected comparison is wrong by at least that much.`
  )
}

/** Assembly a record's coordinates belong to, falling back to the default. */
export function recordAssembly(record: { assembly?: string | null }): Assembly | null {
  return assemblyFor(record.assembly)
}

export { ASSEMBLIES, DEFAULT_ASSEMBLY, assemblyFor, lengthDelta }
