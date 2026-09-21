import { useMemo, useRef } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell,
} from 'recharts'
import { FileImage } from 'lucide-react'
import PageHero from '../components/PageHero'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord } from '../lib/types'
import { TRAIT_COLORS, chromosomeSortKey, normalizeTrait, normalizeSpecies, prepareItems, QTLItem, MetaQTLItem } from '../lib/map'
import { exportRaster } from '../lib/exportMap'

const COLORS = ['#cc9d3f', '#9a6628', '#7c4d24', '#d8b665', '#e7d29c', '#b88231', '#5e3a1f', '#3f2715']

// Sequential wheat ramp (tailwind's wheat-100..800). Bars that count the
// same quantity are shaded by that count, so the colour carries the data
// instead of cycling arbitrary hues.
const WHEAT_RAMP = ['#f4e9cf', '#e7d29c', '#d8b665', '#cc9d3f', '#b88231', '#9a6628', '#7c4d24', '#5e3a1f']

function rampColor(value: number, max: number): string {
  if (max <= 0) return WHEAT_RAMP[0]
  const i = Math.round((value / max) * (WHEAT_RAMP.length - 1))
  return WHEAT_RAMP[Math.min(WHEAT_RAMP.length - 1, Math.max(0, i))]
}

function maxValue(data: { value: number }[]): number {
  return data.reduce((m, d) => Math.max(m, d.value), 0)
}

const AXIS = {
  tick: { fill: 'currentColor', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#e7d29c' },
} as const

const TOOLTIP = {
  cursor: { fill: '#cc9d3f1a' },
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e7d29c',
    background: '#fffdf8',
    boxShadow: '0 6px 18px rgba(94, 58, 31, 0.14)',
    fontSize: 12,
  },
  labelStyle: { color: '#5e3a1f', fontWeight: 600 },
  formatter: (v: number | string) => (typeof v === 'number' ? v.toLocaleString() : v),
} as const

const GRID = { strokeDasharray: '3 6', stroke: '#d8b66540', vertical: false } as const

const VALUE_LABEL = {
  dataKey: 'value',
  position: 'right',
  fill: '#7c4d24',
  fontSize: 10,
  formatter: (v: number) => v.toLocaleString(),
} as const

// Top-to-bottom shade shift on solid-colour bars - the same trick the site's
// cards use - so columns read as depth rather than flat blocks.
function Gradient({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={from} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  )
}

function countBy<T>(rows: T[], key: keyof T): { name: string; value: number }[] {
  const map = new Map<string, number>()
  rows.forEach((r) => {
    const v = String((r as any)[key] ?? '').trim() || 'Unknown'
    map.set(v, (map.get(v) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function topBy<T>(rows: T[], key: keyof T, n = 10): { name: string; value: number }[] {
  return countBy(rows, key).slice(0, n)
}

// The "reference" (full citation) field is populated for only ~2.5% of
// records - most rows only carry a DOI/article URL, which is why this also
// tries the doi field: a real fix for what was otherwise an "Unknown"-
// dominated chart, not a cosmetic one.
function parseYear(ref?: string, doi?: string): string {
  const match = (ref || '').match(/\b(19|20)\d{2}\b/) ?? (doi || '').match(/\b(19|20)\d{2}\b/)
  return match ? match[0] : 'Unknown'
}

// Category names are always one of TRAIT_COLORS' own keys now (every chart
// below buckets by normalizeTrait, not raw trait text), so this is a direct
// lookup, not the fuzzy substring match it used to need for raw strings.
function traitColor(name: string): string {
  return (TRAIT_COLORS as Record<string, string>)[name] ?? COLORS[0]
}

// Canonical trait-category counts (the same 12 categories used by the circos
// and map views), rather than a raw-string tally - raw trait/parameter text
// varies too much between source studies to read as a meaningful chart axis.
function byTraitCategory(rows: { trait: string; parameter?: string }[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  rows.forEach((r) => {
    const cat = normalizeTrait(r as unknown as QTLRecord)
    map.set(cat, (map.get(cat) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

// Count of epistatic pairs touching each chromosome. A pair with both loci on
// the same chromosome counts once for that chromosome; an inter-chromosomal
// pair counts once for each of its two chromosomes.
function epiByChromosome(rows: EpistaticRecord[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  rows.forEach((r) => {
    const chrs = new Set([r.chromosome1, r.chromosome2].filter(Boolean))
    chrs.forEach((c) => map.set(c, (map.get(c) ?? 0) + 1))
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => chromosomeSortKey(a.name) - chromosomeSortKey(b.name))
}

function chromTraitMatrix(qtl: QTLRecord[], topTraits: string[]): { name: string; [trait: string]: number | string }[] {
  // Genomic order (1A..7D, then Un) reads far better across a chromosome axis
  // than a frequency sort, which would jumble the homoeologous groups.
  const chroms = countBy(qtl, 'chromosome')
    .map((d) => d.name)
    .sort((a, b) => chromosomeSortKey(a) - chromosomeSortKey(b))
  const topSet = new Set(topTraits)
  return chroms.map((chr) => {
    const row: any = { name: chr, Other: 0 }
    topTraits.forEach((trait) => (row[trait] = 0))
    qtl
      .filter((r) => r.chromosome === chr)
      .forEach((r) => {
        const cat = normalizeTrait(r)
        const trait = topSet.has(cat) ? cat : 'Other'
        row[trait] = (row[trait] ?? 0) + 1
      })
    return row
  })
}

export default function Statistics() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')

  const loading = qtl.loading || mqtl.loading || epi.loading
  const error = qtl.error ?? mqtl.error ?? epi.error

  // Species distribution is extremely skewed (T. aestivum is 93.4% of
  // records) - kept as a sorted bar rather than a pie, where 13 slivers next
  // to one near-full circle would be unreadable. T. durum and the T.
  // turgidum subspecies are grouped under "Triticum turgidum" (same
  // grouping as the Search species filter) rather than shown as separate
  // near-duplicate bars.
  const bySpecies = useMemo(
    () => countBy(qtl.data.map((r) => ({ ...r, species: normalizeSpecies(r.species || '') })), 'species'),
    [qtl.data]
  )
  const byChrom = useMemo(() => countBy(qtl.data, 'chromosome'), [qtl.data])

  const bySource = useMemo(() => countBy(qtl.data, 'source_file'), [qtl.data])

  const byYear = useMemo(() => {
    const counts = new Map<string, number>()
    qtl.data.forEach((r) => {
      const year = parseYear(r.reference, r.doi)
      counts.set(year, (counts.get(year) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Number(a.name) - Number(b.name))
  }, [qtl.data])

  const topParameters = useMemo(() => topBy(qtl.data, 'parameter', 12), [qtl.data])

  const stats = useMemo(() => ({
    qtl: qtl.data.length,
    mqtl: mqtl.data.length,
    epi: epi.data.length,
  }), [qtl.data, mqtl.data, epi.data])

  // All real categories (normalizeTrait - the same classification the Search
  // page's Trait dropdown uses), not a raw-string tally capped at 8 with
  // everything else dumped into one opaque "Other" bar.
  const byCategoryTop = useMemo(() => byTraitCategory(qtl.data), [qtl.data])
  // The stacked-by-chromosome view still caps at the top 8 for a legible
  // number of stack segments; anything outside the top 8 folds into "Other"
  // there (chromTraitMatrix), which is a display simplification for that one
  // chart, not a re-introduction of the raw-string "Other" bug above.
  const topTraits = useMemo(() => byCategoryTop.slice(0, 8).map((d) => d.name), [byCategoryTop])
  const chromTraitData = useMemo(() => chromTraitMatrix(qtl.data, topTraits), [qtl.data, topTraits])

  const mqtlByCategory = useMemo(() => byTraitCategory(mqtl.data), [mqtl.data])
  const mqtlByChrom = useMemo(
    () => countBy(mqtl.data, 'chromosome').sort((a, b) => chromosomeSortKey(a.name) - chromosomeSortKey(b.name)),
    [mqtl.data]
  )
  const epiByCategory = useMemo(() => byTraitCategory(epi.data), [epi.data])
  const epiChromData = useMemo(() => epiByChromosome(epi.data), [epi.data])

  // How well the curated MetaQTLs actually summarize the underlying QTL
  // evidence: for every QTL with a resolvable chromosome + position, check
  // whether it falls inside any MetaQTL consensus interval on that same
  // chromosome. Reuses prepareItems so the coordinate space (cM->bp per
  // chromosome) matches exactly what the map/circos views plot.
  const overlap = useMemo(() => {
    if (!qtl.data.length || !mqtl.data.length) return null
    const items = prepareItems(qtl.data, mqtl.data)
    const qtlItems = items.filter((i): i is QTLItem => i.type === 'qtl')
    const metaItems = items.filter((i): i is MetaQTLItem => i.type === 'metaqtl')
    if (!qtlItems.length || !metaItems.length) return null

    const metaByChr = new Map<string, { start: number; end: number }[]>()
    metaItems.forEach((m) => {
      const arr = metaByChr.get(m.chromosome) ?? []
      arr.push({ start: Math.min(m.start, m.end), end: Math.max(m.start, m.end) })
      metaByChr.set(m.chromosome, arr)
    })

    let inside = 0
    const byChr = new Map<string, { inside: number; total: number }>()
    qtlItems.forEach((q) => {
      const ranges = metaByChr.get(q.chromosome) ?? []
      const hit = ranges.some((r) => q.point >= r.start && q.point <= r.end)
      if (hit) inside++
      const rec = byChr.get(q.chromosome) ?? { inside: 0, total: 0 }
      rec.total++
      if (hit) rec.inside++
      byChr.set(q.chromosome, rec)
    })

    const perChrom = Array.from(byChr.entries())
      .map(([name, v]) => ({ name, 'Within a MetaQTL': v.inside, 'Outside all MetaQTLs': v.total - v.inside }))
      .sort((a, b) => chromosomeSortKey(a.name) - chromosomeSortKey(b.name))

    return { mapped: qtlItems.length, inside, pct: Math.round((inside / qtlItems.length) * 100), perChrom }
  }, [qtl.data, mqtl.data])

  const insights = useMemo(() => {
    const topTrait = byCategoryTop[0]?.name ?? '-'
    const topChrom = byChrom.find((d) => d.name !== 'Un')?.name ?? '-'
    const peakYear = byYear.filter((d) => d.name !== 'Unknown').sort((a, b) => b.value - a.value)[0]?.name ?? '-'
    return { topTrait, topChrom, peakYear }
  }, [byCategoryTop, byChrom, byYear])

  const OVERLAP_COLORS = { 'Within a MetaQTL': '#2e7d32', 'Outside all MetaQTLs': '#d8b665' }

  return (
    <div>
      <PageHero
        eyebrow="Analytics"
        title="Database statistics"
        subtitle="Interactive distributions of QTL, MetaQTL and epistatic-QTL records across species, traits, chromosomes and publication years."
        image="wheat-field-gbif.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="QTLs" value={stats.qtl} />
          <SummaryCard label="MetaQTLs" value={stats.mqtl} />
          <SummaryCard label="Epistatic QTLs" value={stats.epi} />
        </div>

        {/* Insights */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard label="Most studied trait" value={insights.topTrait} color={traitColor(insights.topTrait)} />
          <InsightCard label="Most QTLs on chromosome" value={insights.topChrom} />
          <InsightCard label="Peak publication year" value={insights.peakYear} />
          {overlap && (
            <InsightCard
              label="QTLs within a MetaQTL interval"
              value={`${overlap.pct}%`}
              color="#2e7d32"
            />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="QTL by species">
            {/* T. aestivum is 93.4% of records - a pie here would be one
                near-full circle plus 13 unreadable slivers. Called out
                separately, with a bar chart of the other species (the
                actually-informative part of this distribution). */}
            <p className="mb-3 text-sm text-wheat-600">
              <span className="font-semibold text-wheat-900">
                {bySpecies[0]?.value.toLocaleString()}
              </span>{' '}
              of {qtl.data.length.toLocaleString()} QTL ({((bySpecies[0]?.value ?? 0) / (qtl.data.length || 1) * 100).toFixed(1)}%)
              are <em>{bySpecies[0]?.name}</em>; other species below.
            </p>
            <ResponsiveContainer width="100%" height={220} className="text-wheat-700">
              <BarChart data={bySpecies.slice(1)} layout="vertical" margin={{ left: 12, right: 56, top: 4, bottom: 4 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={160} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {bySpecies.slice(1).map((d, i) => (
                    <Cell key={i} fill={rampColor(d.value, maxValue(bySpecies.slice(1)))} />
                  ))}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by trait category" wide>
            <ResponsiveContainer width="100%" height={360} className="text-wheat-700">
              <BarChart data={byCategoryTop} layout="vertical" margin={{ left: 12, right: 60, top: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={170} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {byCategoryTop.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={traitColor(entry.name)} />
                  ))}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by chromosome (stacked by top traits)" wide>
            <ResponsiveContainer width="100%" height={360} className="text-wheat-700">
              <BarChart data={chromTraitData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                {topTraits.map((trait, i) => (
                  <Bar
                    key={trait}
                    dataKey={trait}
                    stackId="a"
                    fill={traitColor(trait)}
                    radius={i === topTraits.length - 1 ? [4, 4, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {overlap && (
            <ChartCard title="QTL coverage by MetaQTL consensus intervals" wide>
              <p className="mb-2 text-sm text-wheat-600">
                {overlap.inside.toLocaleString()} of {overlap.mapped.toLocaleString()} chromosome-mapped QTLs ({overlap.pct}%)
                fall inside at least one MetaQTL interval on the same chromosome.
              </p>
              <ResponsiveContainer width="100%" height={340} className="text-wheat-700">
                <BarChart data={overlap.perChrom} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                  <defs>
                    <Gradient id="grad-inside" from="#43a047" to={OVERLAP_COLORS['Within a MetaQTL']} />
                    <Gradient id="grad-outside" from="#e7d29c" to={OVERLAP_COLORS['Outside all MetaQTLs']} />
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                  <YAxis {...AXIS} />
                  <Tooltip {...TOOLTIP} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Bar dataKey="Within a MetaQTL" stackId="a" fill="url(#grad-inside)" />
                  <Bar dataKey="Outside all MetaQTLs" stackId="a" fill="url(#grad-outside)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <ChartCard title="MetaQTL by trait category">
            <ResponsiveContainer width="100%" height={300} className="text-wheat-700">
              <BarChart data={mqtlByCategory} layout="vertical" margin={{ left: 12, right: 48, top: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={155} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {mqtlByCategory.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={traitColor(entry.name)} />
                  ))}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="MetaQTL by chromosome">
            <ResponsiveContainer width="100%" height={300} className="text-wheat-700">
              <BarChart data={mqtlByChrom} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <defs>
                  <Gradient id="grad-mqtl" from="#0f9178" to="#00695c" />
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" fill="url(#grad-mqtl)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Epistatic QTL by trait category">
            <ResponsiveContainer width="100%" height={300} className="text-wheat-700">
              <BarChart data={epiByCategory} layout="vertical" margin={{ left: 12, right: 48, top: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={155} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {epiByCategory.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={traitColor(entry.name)} />
                  ))}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Epistatic QTL pairs by chromosome">
            <ResponsiveContainer width="100%" height={300} className="text-wheat-700">
              <BarChart data={epiChromData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <defs>
                  <Gradient id="grad-epi" from="#7986cb" to="#3f51b5" />
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} {...AXIS} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" fill="url(#grad-epi)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTLs by publication year">
            <ResponsiveContainer width="100%" height={280} className="text-wheat-700">
              <BarChart data={byYear} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...AXIS} interval={2} angle={-45} textAnchor="end" height={50} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byYear.map((d, i) => <Cell key={i} fill={rampColor(d.value, maxValue(byYear))} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top QTL parameters">
            <ResponsiveContainer width="100%" height={340} className="text-wheat-700">
              <BarChart data={topParameters} layout="vertical" margin={{ left: 12, right: 52, top: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={165} {...AXIS} tick={{ fill: 'currentColor', fontSize: 9 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {topParameters.map((d, i) => <Cell key={i} fill={rampColor(d.value, maxValue(topParameters))} />)}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by source dataset" wide>
            <ResponsiveContainer width="100%" height={360} className="text-wheat-700">
              <BarChart data={bySource} layout="vertical" margin={{ left: 12, right: 56, top: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" width={210} {...AXIS} tick={{ fill: 'currentColor', fontSize: 9 }} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {bySource.map((d, i) => <Cell key={i} fill={rampColor(d.value, maxValue(bySource))} />)}
                  <LabelList {...VALUE_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </AsyncBoundary>
    </div>
  )
}

function InsightCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
      <span className="text-sm font-medium uppercase tracking-wide text-wheat-600">{label}</span>
      <span
        className="break-words text-xl font-bold leading-snug sm:text-2xl"
        style={{ color: color ?? 'inherit' }}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex flex-col items-center justify-center py-5 text-center">
      <span className="text-3xl font-bold text-wheat-800">{value.toLocaleString()}</span>
      <span className="mt-1 text-sm font-medium uppercase tracking-wide text-wheat-600">{label}</span>
    </div>
  )
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function ChartCard({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  function handleExport() {
    const svg = ref.current?.querySelector<SVGSVGElement>('svg.recharts-surface')
    if (svg) exportRaster(svg, 'jpeg', `${slugify(title)}.jpeg`)
  }

  return (
    <div className={`card ${wide ? 'lg:col-span-2' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-wheat-900">{title}</h3>
        <button onClick={handleExport} className="btn shrink-0 text-xs" title={`Download "${title}" as JPEG`}>
          <FileImage className="h-3.5 w-3.5" />
          JPEG
        </button>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  )
}
