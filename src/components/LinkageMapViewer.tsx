import { useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { exportSVG, exportRaster } from '../lib/exportMap'

export interface MapLocus {
  marker: string
  linkage_group: string
  position_cm: number | string
  marker_type?: string
}

interface Props {
  loci: MapLocus[]
  name: string
  /** Show every locus label for one group; otherwise bars only. */
  focusGroup?: string | null
  onFocusGroup?: (lg: string | null) => void
}

const COL = 62
const BAR = 15
const TOP = 34
const HEIGHT = 430
const LABEL_GAP = 11
const MAX_LABELS = 150

const natural = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

/** Loci per cM across n slices - drives the density shading on each bar. */
function densityBins(cms: number[], from: number, to: number, n: number): number[] {
  const span = Math.max(to - from, 1)
  const counts = new Array(n).fill(0)
  cms.forEach((cm) => {
    if (cm < from || cm > to) return
    counts[Math.min(n - 1, Math.floor(((cm - from) / span) * n))] += 1
  })
  return counts.map((c) => c / (span / n))
}

/** Push labels apart so neighbours clear `gap`, keeping them inside [lo, hi]. */
function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const out = ys.slice()
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap)
  const overflow = out.length ? out[out.length - 1] - hi : 0
  if (overflow > 0) {
    out[out.length - 1] -= overflow
    for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap)
  }
  return out.map((y) => Math.max(lo, y))
}

function ramp(t: number): string {
  // pale → saturated along the project's neutral+green scale
  const stops = ['#eef1ee', '#cfe0d2', '#9ec6a6', '#5fa177', '#2e7d32']
  const i = Math.min(stops.length - 1, Math.max(0, Math.floor(t * (stops.length - 1))))
  return stops[i]
}

/**
 * Linkage-group viewer in the manner of the R package LinkageMapView: each
 * linkage group is a bar shaded by local marker density, and one group at a
 * time can be expanded to label every locus with its cM position and marker
 * name, labels spread apart and joined back to their true position.
 *
 * Density shading matters on wheat maps specifically: marker coverage is
 * extremely uneven between the A/B subgenomes and D, and between centromeric
 * and distal regions, so a bar that is uniformly coloured would hide the thing
 * a reader most needs to judge - whether a region is actually well covered.
 */
export default function LinkageMapViewer({ loci, name, focusGroup, onFocusGroup }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [query, setQuery] = useState('')
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const groups = useMemo(() => {
    const m = new Map<string, number[]>()
    const markers = new Map<string, { cm: number; marker: string }[]>()
    loci.forEach((l) => {
      const cm = Number(l.position_cm)
      if (!Number.isFinite(cm)) return
      const lg = String(l.linkage_group || '').trim()
      if (!lg) return
      if (!m.has(lg)) { m.set(lg, []); markers.set(lg, []) }
      m.get(lg)!.push(cm)
      markers.get(lg)!.push({ cm, marker: l.marker })
    })
    return Array.from(m.entries())
      .map(([lg, cms]) => ({
        lg,
        cms: cms.sort((a, b) => a - b),
        loci: markers.get(lg)!.sort((a, b) => a.cm - b.cm),
        min: Math.min(...cms),
        max: Math.max(...cms),
      }))
      .sort((a, b) => natural(a.lg, b.lg))
  }, [loci])

  const maxSpan = useMemo(
    () => Math.max(1, ...groups.map((g) => g.max - g.min)),
    [groups]
  )

  const focus = focusGroup ? groups.find((g) => g.lg === focusGroup) ?? null : null
  const width = focus ? 420 : Math.max(240, groups.length * COL + 60)
  const scale = (cm: number, g: { min: number }) =>
    TOP + ((cm - g.min) / maxSpan) * (HEIGHT - TOP - 26)

  const exportAs = (fmt: 'svg' | 'png') => {
    const svg = svgRef.current
    if (!svg) return
    const file = `linkage-map-${name.replace(/\W+/g, '-').toLowerCase()}`
    if (fmt === 'svg') exportSVG(svg, `${file}.svg`)
    else exportRaster(svg, 'png', `${file}.png`)
  }

  const q = query.trim().toLowerCase()

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {focus ? (
          <>
            <button className="btn text-xs" onClick={() => onFocusGroup?.(null)}>
              ← All linkage groups
            </button>
            <input
              className="input w-56"
              placeholder="Highlight marker…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </>
        ) : (
          <span className="text-xs text-wheat-500">
            {groups.length} linkage groups · click one to label its loci
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button className="btn text-xs" onClick={() => exportAs('svg')}>
            <Download className="h-3.5 w-3.5" /> SVG
          </button>
          <button className="btn text-xs" onClick={() => exportAs('png')}>
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${HEIGHT}`} style={{ minWidth: Math.min(width, 900) }}
          className="w-full" role="img" aria-label={`Linkage map ${name}`}>
          {!focus &&
            groups.map((g, i) => {
              const x = 40 + i * COL
              const y0 = scale(g.min, g)
              const y1 = scale(g.max, g)
              const bins = densityBins(g.cms, g.min, g.max, 40)
              const maxD = Math.max(...bins, 1e-9)
              const h = Math.max(2, y1 - y0)
              return (
                <g key={g.lg} className="cursor-pointer" onClick={() => onFocusGroup?.(g.lg)}>
                  {bins.map((d, b) => (
                    <rect key={b} x={x} y={y0 + (b / bins.length) * h}
                      width={BAR} height={h / bins.length + 0.5}
                      fill={ramp(d / maxD)} />
                  ))}
                  <rect x={x} y={y0} width={BAR} height={h} rx={3}
                    fill="none" stroke="#9aa0a6" strokeWidth={0.8}
                    onMouseMove={(e) => setHover({
                      x: e.clientX, y: e.clientY,
                      text: `${g.lg} · ${g.loci.length} loci · ${(g.max - g.min).toFixed(1)} cM`,
                    })}
                    onMouseLeave={() => setHover(null)} />
                  <text x={x + BAR / 2} y={TOP - 12} textAnchor="middle"
                    style={{ fontSize: 11, fontWeight: 600 }} className="fill-wheat-800">{g.lg}</text>
                  <text x={x + BAR / 2} y={y1 + 14} textAnchor="middle"
                    style={{ fontSize: 9 }} className="fill-wheat-500">{g.loci.length}</text>
                </g>
              )
            })}

          {focus && (() => {
            const x = 150
            const y0 = scale(focus.min, focus)
            const y1 = scale(focus.max, focus)
            const shown = focus.loci.length > MAX_LABELS
              ? focus.loci.filter((_, i) => i % Math.ceil(focus.loci.length / MAX_LABELS) === 0)
              : focus.loci
            const ys = spread(shown.map((l) => scale(l.cm, focus)), LABEL_GAP, TOP, HEIGHT - 20)
            return (
              <g>
                <rect x={x} y={y0} width={BAR} height={Math.max(2, y1 - y0)} rx={3}
                  fill="#eef1ee" stroke="#9aa0a6" strokeWidth={0.8} />
                {shown.map((l, i) => {
                  const ly = ys[i]
                  const ty = scale(l.cm, focus)
                  const hit = q && l.marker.toLowerCase().includes(q)
                  return (
                    <g key={`${l.marker}-${i}`}>
                      <line x1={x} x2={x + BAR} y1={ty} y2={ty}
                        stroke={hit ? '#c62828' : '#5fa177'} strokeWidth={hit ? 1.6 : 0.7} />
                      <line x1={x + BAR} x2={x + BAR + 14} y1={ty} y2={ly}
                        stroke="#c9c9cf" strokeWidth={0.5} />
                      <text x={x + BAR + 17} y={ly + 3} style={{ fontSize: 9, fontWeight: hit ? 700 : 400 }}
                        className={hit ? 'fill-red-700' : 'fill-wheat-700'}>{l.marker}</text>
                      <line x1={x - 14} x2={x} y1={ly} y2={ty} stroke="#c9c9cf" strokeWidth={0.5} />
                      <text x={x - 17} y={ly + 3} textAnchor="end" style={{ fontSize: 9 }}
                        className="fill-wheat-500">{l.cm.toFixed(1)}</text>
                    </g>
                  )
                })}
                <text x={x + BAR / 2} y={TOP - 14} textAnchor="middle"
                  style={{ fontSize: 12, fontWeight: 700 }} className="fill-wheat-900">{focus.lg}</text>
                {focus.loci.length > MAX_LABELS && (
                  <text x={x + BAR / 2} y={HEIGHT - 4} textAnchor="middle" style={{ fontSize: 9 }}
                    className="fill-wheat-500">
                    showing {shown.length} of {focus.loci.length} loci
                  </text>
                )}
              </g>
            )
          })()}
        </svg>
      </div>

      {hover && (
        <div className="pointer-events-none fixed z-50 rounded-md border border-wheat-200 bg-white px-2 py-1 text-xs shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}>
          {hover.text}
        </div>
      )}
      {!focus && (
        <p className="mt-1 text-center text-[11px] text-wheat-500">
          Bar shading is local marker density; loci count below each group. Groups share one cM scale.
        </p>
      )}
    </div>
  )
}
