import { useEffect, useMemo, useRef, useState } from 'react'
import { MapIcon } from 'lucide-react'
import {
  MapItem,
  MetaQTLItem,
  QTLItem,
  sortedChromosomes,
  TRAIT_CATEGORIES,
  TRAIT_COLORS,
  centromerePosition,
  chromosomeLength,
} from '../lib/map'

const MARGIN = { top: 48, right: 120, bottom: 110, left: 40 }
const CHROM_WIDTH = 14
const PX_PER_MB = 0.65
const QTL_TRACK = 42
const METAQTL_TRACK = 90
const HOTSPOT_BINS = 40

const COMPACT_MARGIN = { top: 32, right: 80, bottom: 80, left: 32 }

interface ChromosomeMapProps {
  items: MapItem[]
  showQTL: boolean
  showMetaQTL: boolean
  selectedTraits?: string[]
  svgRef?: React.RefObject<SVGSVGElement>
  view?: 'detailed' | 'rod'
  search?: string
  compact?: boolean
  showLabels?: boolean
}

interface HoverInfo {
  x: number
  y: number
  item: MapItem
}

export default function ChromosomeMap({
  items,
  showQTL,
  showMetaQTL,
  selectedTraits = [],
  svgRef,
  view = 'detailed',
  search = '',
  compact = false,
  showLabels = true,
}: ChromosomeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')))
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const chromosomes = useMemo(() => sortedChromosomes(items), [items])

  const ranges = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>()
    items.forEach((item) => {
      if (!map.has(item.chromosome)) {
        map.set(item.chromosome, { min: 0, max: chromosomeLength(item.chromosome) })
      }
    })
    return map
  }, [items])

  const clampPosition = (chromosome: string, value: number) => {
    const max = chromosomeLength(chromosome)
    return Math.max(0, Math.min(value, max))
  }

  const margin = compact ? COMPACT_MARGIN : MARGIN
  const colGap = compact ? 58 : 72
  const focusedTrait = selectedTraits.length === 1 ? selectedTraits[0] : undefined

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (item.type === 'qtl' && !showQTL) return false
      if (item.type === 'metaqtl' && !showMetaQTL) return false
      if (selectedTraits.length > 0) {
        if (!selectedTraits.includes(item.trait)) return false
      } else if (view === 'detailed') {
        // Detailed view default: show only consensus MetaQTLs, hide all QTLs
        if (item.type === 'qtl') return false
      }
      if (q) {
        const hay = `${item.name} ${item.trait} ${item.raw.parameter || ''} ${item.raw.candidate_gene || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, showQTL, showMetaQTL, search, selectedTraits, view])

  const MIN_SVG_WIDTH = compact ? 1100 : 1600
  const svgWidth = Math.max(width, MIN_SVG_WIDTH)
  const plotTop = margin.top
  const plotWidth = Math.max(svgWidth - margin.left - margin.right, 420)
  const colWidth = Math.max(colGap, plotWidth / chromosomes.length)

  const chromHeights = useMemo(
    () => new Map(chromosomes.map((chr) => [chr, (chromosomeLength(chr) / 1_000_000) * PX_PER_MB])),
    [chromosomes]
  )
  const maxChromHeight = useMemo(() => Math.max(...chromHeights.values(), 0), [chromHeights])

  const heatColor = (t: number) => {
    // light yellow to red heat scale
    const h = 48 - t * 48
    const s = 90
    const l = 82 - t * 38
    return `hsl(${h}, ${s}%, ${l}%)`
  }

  const rodHeatStops = useMemo(() => {
    const stopsByChr = new Map<string, { offset: string; color: string }[]>()
    const qtlByChr = new Map<string, QTLItem[]>()
    filtered
      .filter((i): i is QTLItem => i.type === 'qtl')
      .forEach((q) => {
        const arr = qtlByChr.get(q.chromosome) ?? []
        arr.push(q)
        qtlByChr.set(q.chromosome, arr)
      })

    chromosomes.forEach((chr) => {
      const len = chromosomeLength(chr)
      const qtls = qtlByChr.get(chr) ?? []
      const counts: number[] = Array(HOTSPOT_BINS).fill(0)
      qtls.forEach((q) => {
        const bin = Math.min(Math.floor((clampPosition(chr, q.point) / len) * HOTSPOT_BINS), HOTSPOT_BINS - 1)
        counts[bin]++
      })
      const max = Math.max(...counts, 1)
      const stops: { offset: string; color: string }[] = []
      counts.forEach((count, b) => {
        const t = count / max
        const color = heatColor(t)
        const start = (b / HOTSPOT_BINS) * 100
        const end = ((b + 1) / HOTSPOT_BINS) * 100
        stops.push({ offset: `${start.toFixed(2)}%`, color })
        stops.push({ offset: `${end.toFixed(2)}%`, color })
      })
      stopsByChr.set(chr, stops)
    })
    return stopsByChr
  }, [filtered, chromosomes])

  const yFor = (chromosome: string, value: number) => {
    const r = ranges.get(chromosome)
    const h = chromHeights.get(chromosome) ?? maxChromHeight
    if (!r) return plotTop + h
    const clamped = clampPosition(chromosome, value)
    const ratio = (clamped - r.min) / (r.max - r.min)
    return plotTop + h - ratio * h
  }

  const qtlOffsets = useMemo(() => {
    const offsets = new Map<string, number>()
    const counts = new Map<string, number>()
    filtered
      .filter((i): i is QTLItem => i.type === 'qtl')
      .forEach((q) => {
        const key = `${q.chromosome}:${Math.round(clampPosition(q.chromosome, q.point) / (compact ? 8000000 : 15000000))}`
        const idx = counts.get(key) ?? 0
        counts.set(key, idx + 1)
        const step = Math.min(idx, compact ? 3 : 5)
        offsets.set(q.id, -1 * (1 + step * 0.35))
      })
    return offsets
  }, [filtered, compact])

  const metaOffsets = useMemo(() => {
    const offsets = new Map<string, number>()
    const counts = new Map<string, { count: number; lastY: number }>()
    filtered
      .filter((i): i is MetaQTLItem => i.type === 'metaqtl')
      .sort((a, b) => a.point - b.point)
      .forEach((m) => {
        const key = m.chromosome
        const slot = counts.get(key) ?? { count: 0, lastY: -999 }
        const y = yFor(m.chromosome, (m.start + m.end) / 2)
        const lane = y - slot.lastY < 16 ? slot.count + 1 : 0
        counts.set(key, { count: lane, lastY: y })
        offsets.set(m.id, lane)
      })
    return offsets
  }, [filtered])

  const qtlCount = filtered.filter((i) => i.type === 'qtl').length
  const metaCount = filtered.filter((i) => i.type === 'metaqtl').length

  if (chromosomes.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <MapIcon className="h-10 w-10 text-wheat-400" />
          <p className="mt-3 text-wheat-700 dark:text-wheat-300">No QTLs or MetaQTLs match the current filters.</p>
          <p className="text-sm text-wheat-500 dark:text-wheat-400">Try clearing the search or trait filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="card overflow-hidden">
          {/* Header */}
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-wheat-600" />
              <h3 className="text-lg font-semibold text-wheat-900 dark:text-wheat-50">Physical QTL Map</h3>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="text-wheat-700 dark:text-wheat-300">
                <span className="font-semibold text-wheat-900 dark:text-wheat-100">{qtlCount.toLocaleString()}</span> QTLs ·{' '}
                <span className="font-semibold text-wheat-900 dark:text-wheat-100">{metaCount.toLocaleString()}</span>{' '}
                MetaQTLs ·{' '}
                <span className="font-semibold text-wheat-900 dark:text-wheat-100">{chromosomes.length}</span>{' '}
                chromosomes
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-wheat-600" />
                  <span>QTL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-wheat-800" />
                  <span>MetaQTL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5 pb-1">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={plotTop + maxChromHeight + margin.bottom}
            className={`block ${compact ? 'min-w-[1100px]' : 'min-w-[1600px]'}`}
          >
            <defs>
              <filter id="metaShadow" x="-40%" y="-10%" width="180%" height="120%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.12" />
              </filter>
              <filter id="chromShadow" x="-30%" y="-5%" width="160%" height="110%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity={0.08} />
              </filter>
              <linearGradient id="chromFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3ead6" />
                <stop offset="50%" stopColor="#efe4ca" />
                <stop offset="100%" stopColor="#f3ead6" />
              </linearGradient>
              <linearGradient id="chromFillDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#57534e" />
                <stop offset="50%" stopColor="#44403c" />
                <stop offset="100%" stopColor="#57534e" />
              </linearGradient>
              <linearGradient id="centromereFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d6c4a3" />
                <stop offset="50%" stopColor="#e8d9b5" />
                <stop offset="100%" stopColor="#d6c4a3" />
              </linearGradient>
              <linearGradient id="centromereFillDark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#44403c" />
                <stop offset="50%" stopColor="#57534e" />
                <stop offset="100%" stopColor="#44403c" />
              </linearGradient>
              {chromosomes.map((chr) => (
                <linearGradient id={`rodHeat-${chr}`} key={chr} x1="0" y1="0" x2="0" y2="1">
                  {rodHeatStops.get(chr)?.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {Array.from({ length: 6 }).map((_, i) => {
              const y = plotTop + (maxChromHeight / 5) * i
              return (
                <line
                  key={i}
                  x1={margin.left - 6}
                  x2={svgWidth - margin.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.06}
                  className="text-wheat-900 dark:text-wheat-100"
                  strokeDasharray="3 3"
                />
              )
            })}

            {/* Mb ruler */}
            <g>
              <line
                x1={margin.left - 18}
                x2={margin.left - 18}
                y1={plotTop}
                y2={plotTop + maxChromHeight}
                stroke="currentColor"
                strokeWidth={1}
                className="text-wheat-400 dark:text-wheat-500"
              />
              {Array.from({ length: Math.ceil(maxChromHeight / PX_PER_MB / 200) + 1 }).map((_, i) => {
                const mb = i * 200
                const y = plotTop + maxChromHeight - mb * PX_PER_MB
                if (y < plotTop - 1) return null
                return (
                  <g key={mb}>
                    <line
                      x1={margin.left - 22}
                      x2={margin.left - 18}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={1}
                      className="text-wheat-400 dark:text-wheat-500"
                    />
                    <text x={margin.left - 24} y={y + 3} textAnchor="end" className="fill-current text-[9px] opacity-70">
                      {mb}Mb
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Chromosomes */}
            {chromosomes.map((chr, idx) => {
              const cx = margin.left + idx * colWidth + colWidth / 2
              const half = CHROM_WIDTH / 2
              const h = chromHeights.get(chr) ?? maxChromHeight
              const cPos = centromerePosition(chr)
              const plotBottomChr = plotTop + h
              const cyTop = plotTop + h * (cPos - 0.04)
              const cyBottom = plotTop + h * (cPos + 0.04)
              const cMid = (cyTop + cyBottom) / 2
              return (
                <g key={chr}>
                  {showLabels && (
                    <text
                      x={cx}
                      y={plotTop - 18}
                      textAnchor="middle"
                      className="fill-current text-sm font-bold tracking-wide"
                    >
                      {chr}
                    </text>
                  )}

                  {view === 'rod' ? (
                    <>
                      {/* Rod with QTL hotspot gradient fill */}
                      <rect
                        x={cx - half - 2}
                        y={plotTop}
                        width={CHROM_WIDTH + 4}
                        height={h}
                        rx={half + 2}
                        ry={half + 2}
                        fill={`url(#rodHeat-${chr})`}
                        stroke="currentColor"
                        className="text-wheat-300 dark:text-wheat-600"
                        strokeWidth={1}
                        filter="url(#chromShadow)"
                      />
                      {/* Centromere marker */}
                      <line
                        x1={cx - half - 6}
                        x2={cx + half + 6}
                        y1={cMid}
                        y2={cMid}
                        stroke="currentColor"
                        strokeOpacity={0.4}
                        className="text-wheat-800 dark:text-wheat-100"
                        strokeWidth={2}
                      />
                    </>
                  ) : (
                    <>
                      {/* Top arm */}
                      <path
                        d={`M ${cx - half} ${cyTop}
                            L ${cx - half} ${plotTop + half}
                            Q ${cx - half} ${plotTop} ${cx} ${plotTop}
                            Q ${cx + half} ${plotTop} ${cx + half} ${plotTop + half}
                            L ${cx + half} ${cyTop}
                            Z`}
                        fill={isDark ? 'url(#chromFillDark)' : 'url(#chromFill)'}
                        stroke="currentColor"
                        className="text-wheat-300 dark:text-wheat-600"
                        strokeWidth={1}
                        filter="url(#chromShadow)"
                      />

                      {/* Bottom arm */}
                      <path
                        d={`M ${cx - half} ${cyBottom}
                            L ${cx - half} ${plotBottomChr - half}
                            Q ${cx - half} ${plotBottomChr} ${cx} ${plotBottomChr}
                            Q ${cx + half} ${plotBottomChr} ${cx + half} ${plotBottomChr - half}
                            L ${cx + half} ${cyBottom}
                            Z`}
                        fill={isDark ? 'url(#chromFillDark)' : 'url(#chromFill)'}
                        stroke="currentColor"
                        className="text-wheat-300 dark:text-wheat-600"
                        strokeWidth={1}
                        filter="url(#chromShadow)"
                      />

                      {/* Centromere — smooth horizontal ellipse */}
                      <ellipse
                        cx={cx}
                        cy={cMid}
                        rx={half + 1.5}
                        ry={cyBottom - cyTop + 2}
                        fill={isDark ? 'url(#centromereFillDark)' : 'url(#centromereFill)'}
                        stroke="currentColor"
                        className="text-wheat-300 dark:text-wheat-500"
                        strokeWidth={1}
                        filter="url(#chromShadow)"
                      />
                    </>
                  )}

                  {/* Scale label only on selected chromosomes to reduce clutter */}
                  {showLabels && idx % 3 === 0 && (
                    <text x={cx} y={plotBottomChr + 18} textAnchor="middle" className="fill-current text-[9px] opacity-50">
                      {(chromosomeLength(chr) / 1_000_000).toFixed(0)} Mb
                    </text>
                  )}
                </g>
              )
            })}

            {/* QTL lollipops (left side) */}
            {showQTL &&
              filtered
                .filter((i): i is QTLItem => i.type === 'qtl')
                .map((q) => {
                  const idx = chromosomes.indexOf(q.chromosome)
                  if (idx < 0) return null
                  const cx = margin.left + idx * colWidth + colWidth / 2
                  const y = yFor(q.chromosome, q.point)
                  const dist = qtlOffsets.get(q.id) ?? 1
                  const xStem = cx - CHROM_WIDTH / 2 - 2
                  const xHead = cx - CHROM_WIDTH / 2 - 6 - dist * 8
                  const color = TRAIT_COLORS[q.trait]
                  return (
                    <g key={q.id}>
                      <line
                        x1={xStem}
                        x2={xHead}
                        y1={y}
                        y2={y}
                        stroke={color}
                        strokeOpacity={0.55}
                        strokeWidth={1}
                        className="pointer-events-none"
                      />
                      <polygon
                        points={`${xHead},${y - 3.8} ${xHead - 3.2},${y} ${xHead},${y + 3.8} ${xHead + 3.2},${y}`}
                        fill={color}
                        fillOpacity={focusedTrait ? 0.95 : 0.8}
                        stroke={color}
                        strokeWidth={1}
                        strokeOpacity={0.95}
                        className="cursor-pointer transition-opacity hover:opacity-100"
                        onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, item: q })}
                        onMouseLeave={() => setHover(null)}
                        onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, item: q })}
                      />
                    </g>
                  )
                })}

            {/* MetaQTL side bars (MapChart-style right track) */}
            {showMetaQTL &&
              filtered
                .filter((i): i is MetaQTLItem => i.type === 'metaqtl')
                .map((m) => {
                  const idx = chromosomes.indexOf(m.chromosome)
                  if (idx < 0) return null
                  const cx = margin.left + idx * colWidth + colWidth / 2
                  const yStart = yFor(m.chromosome, m.start)
                  const yEnd = yFor(m.chromosome, m.end)
                  const yPeak = yFor(m.chromosome, m.point)
                  const lane = metaOffsets.get(m.id) ?? 0
                  const xBase = cx + CHROM_WIDTH / 2 + 10
                  const laneWidth = 9
                  const xLine = xBase + lane * laneWidth
                  const barWidth = 5
                  const cap = 4
                  const color = TRAIT_COLORS[m.trait]
                  const h = Math.max(yStart - yEnd, 4)
                  return (
                    <g key={m.id}>
                      {/* Interval bar */}
                      <rect
                        x={xLine - barWidth / 2}
                        y={yEnd}
                        width={barWidth}
                        height={h}
                        rx={barWidth / 2}
                        ry={barWidth / 2}
                        fill={color}
                        fillOpacity={0.85}
                        stroke={color}
                        strokeWidth={1}
                        className="pointer-events-none"
                        filter="url(#metaShadow)"
                      />
                      {/* Top cap */}
                      <line
                        x1={xLine - cap}
                        x2={xLine + cap}
                        y1={yEnd}
                        y2={yEnd}
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        className="pointer-events-none"
                      />
                      {/* Bottom cap */}
                      <line
                        x1={xLine - cap}
                        x2={xLine + cap}
                        y1={yStart}
                        y2={yStart}
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        className="pointer-events-none"
                      />
                      {/* Peak dot */}
                      <circle
                        cx={xLine}
                        cy={yPeak}
                        r={focusedTrait ? 3.5 : 2.5}
                        fill="#fff"
                        stroke={color}
                        strokeWidth={2}
                        className="pointer-events-none"
                      />
                      {/* Invisible hit area */}
                      <rect
                        x={xLine - 8}
                        y={yEnd}
                        width={16}
                        height={h}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, item: m })}
                        onMouseLeave={() => setHover(null)}
                        onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, item: m })}
                      />
                    </g>
                  )
                })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-2 border-t border-wheat-200 pt-4 dark:border-ink-700">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-wheat-600 dark:text-wheat-400">
            <span>Trait categories</span>
            {focusedTrait && (
              <span className="rounded-full bg-wheat-600 px-2 py-0.5 text-[10px] font-medium text-white">
                focused: {focusedTrait}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TRAIT_CATEGORIES.map((trait) => {
              const color = TRAIT_COLORS[trait]
              const active = selectedTraits.length === 0 || selectedTraits.includes(trait)
              const focused = focusedTrait === trait
              return (
                <div
                  key={trait}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition ${
                    focused
                      ? 'border-wheat-600 bg-wheat-600 text-white shadow-sm'
                      : active
                        ? 'border-wheat-200 bg-white text-wheat-800 dark:border-ink-700 dark:bg-ink-800 dark:text-wheat-100'
                        : 'border-transparent bg-wheat-100 text-wheat-400 opacity-60 dark:bg-ink-800 dark:text-wheat-500'
                  }`}
                  title={trait}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: focused ? '#fff' : color }}
                  />
                  <span className="truncate max-w-[10rem]">{trait}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          className="fixed z-50 max-w-xs rounded-xl border border-wheat-200 bg-white p-3 text-xs shadow-xl dark:border-ink-700 dark:bg-ink-900"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div
            className="mb-2 rounded-md px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: TRAIT_COLORS[hover.item.trait] }}
          >
            {hover.item.type === 'qtl' ? 'QTL' : 'MetaQTL'} · {hover.item.name}
          </div>
          <div className="space-y-0.5 text-wheat-700 dark:text-wheat-300">
            <div><span className="font-medium">Chromosome:</span> {hover.item.chromosome}</div>
            <div><span className="font-medium">Trait:</span> {hover.item.trait}</div>
            {hover.item.type === 'metaqtl' && (
              <div>
                <span className="font-medium">Interval:</span>{' '}
                {hover.item.start.toFixed(2)} – {hover.item.end.toFixed(2)}
              </div>
            )}
            <div><span className="font-medium">Position:</span> {hover.item.point.toFixed(2)}</div>
            {hover.item.raw.parameter && (
              <div><span className="font-medium">Parameter:</span> {hover.item.raw.parameter}</div>
            )}
            {hover.item.raw.pve && (
              <div><span className="font-medium">PVE / R²:</span> {hover.item.raw.pve}</div>
            )}
            {hover.item.raw.candidate_gene && (
              <div><span className="font-medium">Candidate gene:</span> {hover.item.raw.candidate_gene}</div>
            )}
            {hover.item.raw.associated_markers && (
              <div><span className="font-medium">Markers:</span> {hover.item.raw.associated_markers}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
