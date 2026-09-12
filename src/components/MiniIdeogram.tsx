import { useMemo, useState } from 'react'
import {
  CHROMOSOME_LENGTHS,
  GENOME_COLOR_CLASS,
  centromerePosition,
  chromosomeLength,
  chromosomeSortKey,
  genomeOf,
} from '../lib/map'

interface MiniIdeogramProps {
  onSelect?: (chromosome: string) => void
  className?: string
}

const MARGIN = { top: 14, right: 10, bottom: 24, left: 10 }
const BAR_WIDTH = 13
const COL_GAP = 32
const MAX_BAR_HEIGHT = 138

// A miniature, proportionally-accurate karyotype - same real IWGSC RefSeq
// v1.0 chromosome lengths, centromere positions and subgenome colours as the
// full Ideogram view (see components/IdeogramMap.tsx), just without the QTL/
// MetaQTL density lanes, for a compact homepage teaser that still shows
// e.g. 3B genuinely as the largest chromosome rather than a uniform tile.
export default function MiniIdeogram({ onSelect, className = '' }: MiniIdeogramProps) {
  const [hoverChr, setHoverChr] = useState<string | null>(null)

  const chromosomes = useMemo(
    () => Object.keys(CHROMOSOME_LENGTHS).sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b)),
    []
  )
  const maxLen = useMemo(() => Math.max(...chromosomes.map(chromosomeLength)), [chromosomes])

  const svgWidth = MARGIN.left + chromosomes.length * COL_GAP + MARGIN.right
  const svgHeight = MARGIN.top + MAX_BAR_HEIGHT + MARGIN.bottom

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Miniature wheat karyotype: 21 chromosomes, sized to scale, coloured by subgenome"
      className={className}
    >
      <defs>
        <filter id="miniIdeoShadow" x="-40%" y="-10%" width="180%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity={0.1} />
        </filter>
      </defs>
      {chromosomes.map((chr, idx) => {
        const len = chromosomeLength(chr)
        const h = Math.max(6, (len / maxLen) * MAX_BAR_HEIGHT)
        const cx = MARGIN.left + idx * COL_GAP + COL_GAP / 2
        const rowTop = MARGIN.top + (MAX_BAR_HEIGHT - h)
        const cPos = centromerePosition(chr)
        const half = BAR_WIDTH / 2
        const cyTop = rowTop + h * (1 - cPos) - 5
        const cyBottom = rowTop + h * (1 - cPos) + 5
        const colorClass = GENOME_COLOR_CLASS[genomeOf(chr)] ?? 'text-wheat-400'
        const active = hoverChr === chr

        return (
          <g
            key={chr}
            className="cursor-pointer"
            onMouseEnter={() => setHoverChr(chr)}
            onMouseLeave={() => setHoverChr(null)}
            onClick={() => onSelect?.(chr)}
          >
            <rect
              x={cx - half}
              y={rowTop}
              width={BAR_WIDTH}
              height={h}
              rx={half}
              ry={half}
              fill="currentColor"
              className={colorClass}
              stroke="currentColor"
              strokeOpacity={active ? 0.7 : 0.35}
              strokeWidth={active ? 1.5 : 1}
              filter="url(#miniIdeoShadow)"
              style={{ transition: 'stroke-opacity 120ms, stroke-width 120ms' }}
            >
              <title>{`${chr} — ${(len / 1_000_000).toFixed(0)} Mb`}</title>
            </rect>
            {/* Centromere pinch */}
            <path
              d={`M ${cx - half} ${cyTop}
                  Q ${cx} ${(cyTop + cyBottom) / 2} ${cx - half} ${cyBottom}
                  L ${cx + half} ${cyBottom}
                  Q ${cx} ${(cyTop + cyBottom) / 2} ${cx + half} ${cyTop}
                  Z`}
              fill="white"
              fillOpacity={0.3}
              className="pointer-events-none"
            />
            <text
              x={cx}
              y={MARGIN.top + MAX_BAR_HEIGHT + 15}
              textAnchor="middle"
              className={`fill-current text-[9px] font-semibold transition ${active ? 'text-wheat-900' : 'text-wheat-600'}`}
            >
              {chr}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
