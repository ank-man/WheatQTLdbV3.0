import { RefObject, useMemo, useState } from 'react'
import { CHROMOSOME_LENGTHS, GENOME_COLOR_CLASS, TRAIT_COLORS, TraitCategory, chromosomeSortKey } from '../lib/map'
import { QTLRecord } from '../lib/types'

/** A QTL placed by its published genetic-map (cM) position. */
export interface GeneticItem {
  id: string
  chromosome: string
  cm: number
  trait: TraitCategory
  name: string
  raw: QTLRecord
}

interface Props {
  items: GeneticItem[]
  selectedTraits: string[]
  search?: string
  svgRef?: RefObject<SVGSVGElement>
  genomeFilter?: 'all' | 'A' | 'B' | 'D'
}

// Linkage groups in wheat rarely run past ~300 cM; a published "position"
// above this is almost always a megabase value entered without its unit, so
// the axis stops here and those records are counted rather than drawn.
export const CM_AXIS_MAX = 400
const BIN_CM = 5
const TOP = 46
const PLOT_H = 520
const COL_W = 62
const BAR_W = 10
const STRIP_W = 40
const LEFT = 52

interface Bin { count: number; traits: Map<string, number> }

export default function GeneticMap({ items, selectedTraits, search = '', svgRef, genomeFilter = 'all' }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; chr: string; from: number; bin: Bin } | null>(null)

  const chromosomes = useMemo(() => {
    const all = Object.keys(CHROMOSOME_LENGTHS).sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b))
    return genomeFilter === 'all' ? all : all.filter((c) => c.endsWith(genomeFilter))
  }, [genomeFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (genomeFilter !== 'all' && !item.chromosome.endsWith(genomeFilter)) return false
      if (selectedTraits.length > 0 && !selectedTraits.includes(item.trait)) return false
      if (q) {
        const hay = `${item.name} ${item.trait} ${item.raw.parameter || ''} ${item.raw.candidate_gene || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, selectedTraits, search, genomeFilter])

  const { byChr, extent, maxCount, drawn, beyond } = useMemo(() => {
    const nBins = CM_AXIS_MAX / BIN_CM
    const byChr = new Map<string, Bin[]>()
    const extent = new Map<string, number>()
    chromosomes.forEach((c) => byChr.set(c, Array.from({ length: nBins }, () => ({ count: 0, traits: new Map() }))))
    let drawn = 0
    let beyond = 0
    filtered.forEach((item) => {
      const bins = byChr.get(item.chromosome)
      if (!bins) return
      if (item.cm > CM_AXIS_MAX) { beyond++; return }
      const bin = bins[Math.min(nBins - 1, Math.floor(item.cm / BIN_CM))]
      bin.count++
      bin.traits.set(item.trait, (bin.traits.get(item.trait) ?? 0) + 1)
      extent.set(item.chromosome, Math.max(extent.get(item.chromosome) ?? 0, item.cm))
      drawn++
    })
    let maxCount = 1
    byChr.forEach((bins) => bins.forEach((b) => { if (b.count > maxCount) maxCount = b.count }))
    return { byChr, extent, maxCount, drawn, beyond }
  }, [filtered, chromosomes])

  const y = (cm: number) => TOP + (cm / CM_AXIS_MAX) * PLOT_H
  const width = LEFT + chromosomes.length * COL_W + 12
  const height = TOP + PLOT_H + 26
  const dominant = (bin: Bin) => [...bin.traits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as TraitCategory

  return (
    <div className="card overflow-hidden">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-wheat-900 dark:text-wheat-50">Linkage (cM) view</h3>
        <div className="text-sm text-wheat-700 dark:text-wheat-300">
          <span className="font-semibold text-wheat-900 dark:text-wheat-50">{drawn.toLocaleString()}</span> QTLs
          placed by genetic position
          {beyond > 0 && <> · {beyond.toLocaleString()} reported beyond {CM_AXIS_MAX} cM not drawn</>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`}
             className="mx-auto block" role="img" aria-label="QTL positions on the genetic (cM) map of each chromosome">
          {Array.from({ length: CM_AXIS_MAX / 50 + 1 }, (_, i) => i * 50).map((cm) => (
            <g key={cm}>
              <line x1={LEFT - 6} x2={width - 8} y1={y(cm)} y2={y(cm)} stroke="currentColor"
                    className="text-wheat-100 dark:text-ink-700" strokeWidth={1} />
              <text x={LEFT - 10} y={y(cm) + 3.5} textAnchor="end" fontSize={10}
                    className="fill-wheat-500 dark:fill-wheat-400">{cm}</text>
            </g>
          ))}
          <text x={12} y={TOP - 22} fontSize={10} className="fill-wheat-500 dark:fill-wheat-400">cM</text>
          {chromosomes.map((chr, i) => {
            const x = LEFT + i * COL_W + 8
            const len = Math.max(extent.get(chr) ?? 0, BIN_CM)
            const bins = byChr.get(chr) ?? []
            return (
              <g key={chr}>
                <text x={x + BAR_W / 2} y={TOP - 10} textAnchor="middle" fontSize={11} fontWeight={600}
                      className="fill-wheat-800 dark:fill-wheat-100">{chr}</text>
                <rect x={x} y={TOP} width={BAR_W} height={y(len) - TOP} rx={BAR_W / 2} fill="currentColor"
                      className={GENOME_COLOR_CLASS[chr.slice(-1)] ?? 'text-wheat-300'} opacity={0.85} />
                {bins.map((bin, b) => bin.count > 0 && (
                  <rect
                    key={b}
                    x={x + BAR_W + 3}
                    y={y(b * BIN_CM) + 0.5}
                    // square-root length: a bin of 400 QTL beside a bin of 4
                    // would otherwise leave the small one invisible
                    width={Math.max(2, Math.sqrt(bin.count / maxCount) * STRIP_W)}
                    height={Math.max(1, PLOT_H / bins.length - 1)}
                    fill={TRAIT_COLORS[dominant(bin)] ?? '#9e9e9e'}
                    className="cursor-pointer"
                    onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, chr, from: b * BIN_CM, bin })}
                    onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, chr, from: b * BIN_CM, bin })}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-wheat-500 dark:text-wheat-400">
        Each strip is a {BIN_CM} cM window: its length shows how many QTLs were reported there (square-root
        scale) and its colour the most frequent trait. Positions are plotted exactly as published, each on
        its own study's linkage map, so the same cM value from two studies is not necessarily the same locus.
      </p>
      {hover && (
        <div className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-wheat-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-ink-700 dark:bg-ink-800 dark:text-wheat-100"
             style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="font-semibold">{hover.chr} · {hover.from}–{hover.from + BIN_CM} cM</div>
          <div>{hover.bin.count.toLocaleString()} QTL</div>
          {[...hover.bin.traits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TRAIT_COLORS[t as TraitCategory] }} />
              {t} {n.toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
