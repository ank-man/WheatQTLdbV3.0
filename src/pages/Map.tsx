import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Download, Image as ImageIcon, FileImage, Search, SlidersHorizontal, Moon, Sun } from 'lucide-react'
import PageHero from '../components/PageHero'
import IdeogramMap from '../components/IdeogramMap'
import CircosMap from '../components/CircosMap'
import GeneticMap, { GeneticItem } from '../components/GeneticMap'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord, GwasAtlasRecord } from '../lib/types'
import {
  prepareItems, prepareEpistaticLinks, normalizeChromosome, parsePositionInterval, isPhysicalPosition,
  TRAIT_CATEGORIES, TRAIT_COLORS, normalizeTrait, chromosomeLength, MapItem,
} from '../lib/map'
import { exportSVG, exportRaster } from '../lib/exportMap'

export default function Map() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')
  const gwas = useCSV<GwasAtlasRecord>('gwas_atlas.csv')

  const [showQTL, setShowQTL] = useState(true)
  const [showMetaQTL, setShowMetaQTL] = useState(true)
  const [showLinks, setShowLinks] = useState(false)
  const [showGwas, setShowGwas] = useState(true)
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])
  const [view, setView] = useState<'ideogram' | 'circos' | 'genetic'>('circos')
  const [search, setSearch] = useState('')
  const [genomeFilter, setGenomeFilter] = useState<'all' | 'A' | 'B' | 'D'>('all')
  const [compact, setCompact] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showItemLabels, setShowItemLabels] = useState(false)
  const [genomeColor, setGenomeColor] = useState(true)
  const [plotDark, setPlotDark] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const allItems = useMemo(() => prepareItems(qtl.data, mqtl.data), [qtl.data, mqtl.data])

  // GWAS Atlas associations (from publications not curated here) all carry a
  // RefSeq v1.0 position, so they can be drawn on the same physical axis. They
  // are a separate, toggleable layer and are never added to the WheatQTLdb
  // counts quoted on this page.
  const gwasItems = useMemo<MapItem[]>(() => gwas.data.flatMap((g) => {
    const chr = normalizeChromosome(g.chromosome)
    const point = Number(g.position)
    if (!chr || !Number.isFinite(point)) return []
    return [{
      id: g.id,
      type: 'qtl' as const,
      chromosome: chr,
      point: Math.min(point, chromosomeLength(chr)),
      trait: normalizeTrait({ trait: g.trait }),
      name: `${g.trait} (GWAS Atlas ${g.id})`,
      raw: {
        id: g.id, species: g.species, trait: g.trait, parameter: g.condition, qtl_name: g.id,
        chromosome: chr, position_interval: g.position, pve: g.pve, candidate_gene: g.candidate_gene,
        reference: g.reference, doi: g.doi, method: g.method, source_file: 'GWAS Atlas',
      },
    }]
  }), [gwas.data])

  // QTL published with a genetic-map position only: they have no place on the
  // physical views, and are drawn on the linkage (cM) view instead.
  const geneticItems = useMemo<GeneticItem[]>(() => {
    const placed = new Set(allItems.map((i) => i.id))
    return qtl.data.flatMap((r) => {
      const chr = normalizeChromosome(r.chromosome)
      if (!chr || placed.has(r.id)) return []
      const pos = parsePositionInterval(r.position_interval || '')
      if (pos.point === null || isPhysicalPosition(pos)) return []
      return [{ id: r.id, chromosome: chr, cm: pos.point, trait: normalizeTrait(r), name: r.qtl_name || r.id, raw: r }]
    })
  }, [qtl.data, allItems])
  const links = useMemo(() => prepareEpistaticLinks(epi.data), [epi.data])

  // prepareItems/prepareEpistaticLinks only plot records with a genuine
  // physical (bp) position - a record with a chromosome but only a genetic
  // (cM) position is excluded rather than proportionally guessed onto the
  // physical axis (see isPhysicalPosition in lib/map). Break the excluded
  // total down by reason so the map isn't mistaken for exhaustive, and the
  // "cM only" records are visibly distinguished from truly unmapped ones.
  const unmapped = useMemo(() => {
    const qtlMapped = allItems.filter((i) => i.type === 'qtl').length
    const mqtlMapped = allItems.filter((i) => i.type === 'metaqtl').length

    // "cM only" = has a chromosome and a readable position, but was not placed
    // (a placed record may still carry a cM position field when its physical
    // coordinate comes from the marker name, so mapped ids are excluded).
    const mappedIds = new Set(allItems.map((i) => i.id))
    const cmOnly = (records: { id: string; chromosome: string; position_interval?: string }[]) =>
      records.filter((r) => {
        if (mappedIds.has(r.id) || !normalizeChromosome(r.chromosome)) return false
        const pos = parsePositionInterval(r.position_interval || '')
        return pos.point !== null && !isPhysicalPosition(pos)
      }).length

    const qtlCm = cmOnly(qtl.data)
    const mqtlCm = cmOnly(mqtl.data)

    return {
      qtl: qtl.data.length - qtlMapped,
      mqtl: mqtl.data.length - mqtlMapped,
      links: epi.data.length - links.length,
      qtlCm,
      mqtlCm,
      qtlNoChrOrPos: qtl.data.length - qtlMapped - qtlCm,
      mqtlNoChrOrPos: mqtl.data.length - mqtlMapped - mqtlCm,
    }
  }, [allItems, qtl.data, mqtl.data, epi.data.length, links.length])

  const items = useMemo(() => {
    const shown = showGwas ? [...allItems, ...gwasItems] : allItems
    if (genomeFilter === 'all') return shown
    return shown.filter((item) => item.chromosome.endsWith(genomeFilter))
  }, [allItems, gwasItems, showGwas, genomeFilter])

  const reset = () => {
    setShowQTL(true)
    setShowMetaQTL(true)
    setShowLinks(false)
    setShowGwas(true)
    setSelectedTraits([])
    setSearch('')
    setGenomeFilter('all')
    setCompact(true)
    setShowLabels(true)
    setShowItemLabels(false)
    setGenomeColor(true)
  }

  const toggleTrait = (trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    )
  }

  const selectableTraits = TRAIT_CATEGORIES

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key, 10)
      if (isNaN(idx) || idx < 1 || idx > selectableTraits.length) return
      const trait = selectableTraits[idx - 1]
      if (trait) toggleTrait(trait)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectableTraits])

  const handleExport = (format: 'svg' | 'png' | 'jpeg') => {
    if (!svgRef.current) return
    if (format === 'svg') {
      exportSVG(svgRef.current)
    } else {
      exportRaster(svgRef.current, format)
    }
  }

  return (
    <div>
      <PageHero
        eyebrow="Visualization"
        title="Genome map"
        subtitle="QTLs and MetaQTLs across the 21 wheat chromosomes, coloured by trait: by physical position (ideogram, circos) or by genetic position (linkage, cM)."
        variant="side"
      />

      <AsyncBoundary loading={qtl.loading || mqtl.loading || epi.loading} error={qtl.error ?? mqtl.error}>
        <div className={`space-y-6 ${plotDark ? 'dark' : ''}`}>
          <div className="card">
            <h2 className="font-semibold text-wheat-900 dark:text-wheat-50">Where each QTL is drawn</h2>
            <p className="mt-1 text-sm text-wheat-700 dark:text-wheat-300">
              Of {qtl.data.length.toLocaleString()} QTL records,{' '}
              <strong>{allItems.filter((i) => i.type === 'qtl').length.toLocaleString()}</strong> have a
              physical (bp) position and are on the <strong>Ideogram</strong> and <strong>Circos</strong> views,
              and <strong>{geneticItems.length.toLocaleString()}</strong> were published with a genetic-map
              position only and are on the <strong>Linkage (cM)</strong> view. The remaining{' '}
              {(unmapped.qtl - geneticItems.length).toLocaleString()} name no usable chromosome or position
              and can only be listed — they are in <Link className="underline" to="/search">Search</Link>.
              {gwasItems.length > 0 && (
                <> The physical views can also show {gwasItems.length.toLocaleString()}{' '}
                <Link className="underline" to="/data/gwas-atlas">GWAS Atlas associations</Link> from
                studies not curated here; they are a separate layer and not part of these counts.</>
              )}
            </p>
          </div>
          {/* Controls */}
          <div className="card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-wheat-600"
                    checked={showQTL}
                    onChange={(e) => setShowQTL(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Show QTLs</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-wheat-600"
                    checked={showMetaQTL}
                    onChange={(e) => setShowMetaQTL(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Show MetaQTLs</span>
                </label>
                {view !== 'genetic' && gwasItems.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-wheat-600"
                      checked={showGwas}
                      onChange={(e) => setShowGwas(e.target.checked)}
                    />
                    <span className="text-sm font-medium">GWAS Atlas MTAs</span>
                  </label>
                )}
                {view === 'circos' && (
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-wheat-600"
                      checked={showLinks}
                      onChange={(e) => setShowLinks(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Epistatic links</span>
                  </label>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-wheat-600"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Compact</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-wheat-600"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Labels</span>
                </label>
                {view === 'ideogram' && (
                  <>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-wheat-600"
                        checked={showItemLabels}
                        onChange={(e) => setShowItemLabels(e.target.checked)}
                      />
                      <span className="text-sm font-medium">MetaQTL name labels</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-wheat-600"
                        checked={genomeColor}
                        onChange={(e) => setGenomeColor(e.target.checked)}
                      />
                      <span className="text-sm font-medium">Subgenome colour</span>
                    </label>
                  </>
                )}
              </div>

              <div className="flex items-center rounded-lg border border-wheat-200 dark:border-ink-700 bg-wheat-50 dark:bg-ink-900/40 p-1">
                <button
                  onClick={() => setView('ideogram')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    view === 'ideogram'
                      ? 'bg-white dark:bg-ink-800 text-wheat-800 dark:text-wheat-100 shadow-sm'
                      :'text-wheat-600 dark:text-wheat-400 hover:text-wheat-800'
                  }`}
                >
                  Ideogram
                </button>
                <button
                  onClick={() => setView('circos')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    view === 'circos'
                      ? 'bg-white dark:bg-ink-800 text-wheat-800 dark:text-wheat-100 shadow-sm'
                      :'text-wheat-600 dark:text-wheat-400 hover:text-wheat-800'
                  }`}
                >
                  Circos
                </button>
                <button
                  onClick={() => setView('genetic')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    view === 'genetic'
                      ? 'bg-white dark:bg-ink-800 text-wheat-800 dark:text-wheat-100 shadow-sm'
                      :'text-wheat-600 dark:text-wheat-400 hover:text-wheat-800'
                  }`}
                >
                  Linkage (cM)
                </button>
              </div>
              <button
                onClick={() => setPlotDark(!plotDark)}
                className="btn text-xs"
                title="Toggle dark theme for the plot"
                aria-pressed={plotDark}
              >
                {plotDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {plotDark ? 'Light plot' : 'Dark plot'}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-wheat-600 dark:text-wheat-400">Export:</span>
                <button onClick={() => handleExport('svg')} className="btn text-xs" title="Download SVG">
                  <Download className="h-3.5 w-3.5" />
                  SVG
                </button>
                <button onClick={() => handleExport('png')} className="btn text-xs" title="Download PNG">
                  <ImageIcon className="h-3.5 w-3.5" />
                  PNG
                </button>
                <button onClick={() => handleExport('jpeg')} className="btn text-xs" title="Download JPEG">
                  <FileImage className="h-3.5 w-3.5" />
                  JPEG
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wheat-500 dark:text-wheat-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, trait, parameter or candidate gene…"
                  className="input w-full pl-9"
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-wheat-200 dark:border-ink-700 bg-wheat-50 dark:bg-ink-900/40 px-3 py-2">
                <SlidersHorizontal className="h-4 w-4 text-wheat-500 dark:text-wheat-400" />
                <span className="text-xs font-medium text-wheat-600 dark:text-wheat-400">Genome:</span>
                {(['all', 'A', 'B', 'D'] as const).map((g) => (
                  <label key={g} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium">
                    <input
                      type="radio"
                      name="genome"
                      value={g}
                      checked={genomeFilter === g}
                      onChange={() => setGenomeFilter(g)}
                      className="h-3 w-3 accent-wheat-600"
                    />
                    {g === 'all' ? 'All' : `${g} genome`}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-wheat-700 dark:text-wheat-300">
                  Highlight traits (click or press 1-{Math.min(9, selectableTraits.length)} to toggle)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTraits([...selectableTraits])}
                    className="text-xs font-medium text-wheat-600 dark:text-wheat-400 underline-offset-2 hover:text-wheat-800 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-wheat-300 dark:text-wheat-600">|</span>
                  <button
                    onClick={() => setSelectedTraits([])}
                    className="text-xs font-medium text-wheat-600 dark:text-wheat-400 underline-offset-2 hover:text-wheat-800 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectableTraits.map((trait, idx) => {
                  const active = selectedTraits.includes(trait)
                  return (
                    <button
                      key={trait}
                      onClick={() => toggleTrait(trait)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-wheat-600 dark:border-wheat-500 bg-wheat-600 text-white'
                          :'border-wheat-300 dark:border-ink-700 bg-white dark:bg-ink-800 text-wheat-700 dark:text-wheat-300 hover:bg-wheat-100'
                      }`}
                      title={`Toggle ${trait} (${idx < 9 ? `key ${idx + 1}` : ''})`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: TRAIT_COLORS[trait] }}
                      />
                      {trait}
                    </button>
                  )
                })}
                <button onClick={reset} className="btn text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {view !== 'genetic' && (unmapped.mqtl > 0 || unmapped.links > 0) && !mqtl.loading && !epi.loading && (
            <p className="text-xs text-wheat-500 dark:text-wheat-400">
              {(mqtl.data.length - unmapped.mqtl).toLocaleString()} of {mqtl.data.length.toLocaleString()} MetaQTLs
              and {links.length.toLocaleString()} of {epi.data.length.toLocaleString()} epistatic pairs have physical
              positions and can be drawn here; the others report a genetic (cM) position or none.
            </p>
          )}

          {view === 'ideogram' ? (
            <IdeogramMap
              items={items}
              showQTL={showQTL}
              showMetaQTL={showMetaQTL}
              selectedTraits={selectedTraits}
              search={search}
              svgRef={svgRef}
              compact={compact}
              showLabels={showLabels}
              showItemLabels={showItemLabels}
              genomeFilter={genomeFilter}
              genomeColor={genomeColor}
            />
          ) : view === 'genetic' ? (
            <GeneticMap
              items={geneticItems}
              selectedTraits={selectedTraits}
              search={search}
              svgRef={svgRef}
              genomeFilter={genomeFilter}
            />
          ) : (
            <CircosMap
              items={items}
              links={links}
              showQTL={showQTL}
              showMetaQTL={showMetaQTL}
              showLinks={showLinks}
              selectedTraits={selectedTraits}
              search={search}
              svgRef={svgRef}
              compact={compact}
              showLabels={showLabels}
              genomeFilter={genomeFilter}
            />
          )}

          {/* Legend / explanation */}
          <div className={`card ${view === 'genetic' ? 'hidden' : ''}`}>
            <h3 className="mb-3 text-lg font-semibold text-wheat-900 dark:text-wheat-50">
              How to read this {view === 'ideogram' ? 'ideogram' : 'circos plot'}
            </h3>
            {view === 'ideogram' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">Chromosomes</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    The 21 hexaploid wheat chromosomes are laid out side by side, arranged 1A-7D, coloured by subgenome (A/B/D). Height is proportional to real IWGSC RefSeq v1.0 physical length against the Mb scale on the left, and the pinched waist marks the centromere.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">QTL density strip</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Thousands of QTLs per chromosome can't be drawn individually, so they're binned along the length; strip length is proportional to local count, coloured by that bin's dominant trait.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">MetaQTL brackets</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Stacked into up to 4 lanes when intervals overlap, coloured by trait. Enable “MetaQTL name labels” to print mqtl_name beside each one — a name is only shown when it won't collide with the previous label.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">Trait highlights</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Click a trait button (or press keys 1–9) to highlight one or several traits. Use the search box or genome filter to narrow results further.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">Chromosomes</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Arc length is proportional to physical length; the tick marks the centromere.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">QTL density</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-3 w-24 rounded bg-gradient-to-r from-[hsl(48,90%,82%)] via-[hsl(24,90%,65%)] to-[hsl(0,90%,44%)]" />
                    <span className="text-xs text-wheat-600 dark:text-wheat-400">low → high</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">MetaQTL tracks</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Each trait category gets its own thin ring, matching the manuscript circos figure, so a bar's radial position and colour both encode its trait.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">QTL tracks</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Each trait category gets its own thin ring too (same order as the trait legend below), so a tick's radial position and colour both encode its trait.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-wheat-800 dark:text-wheat-100">Epistatic links</p>
                  <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
                    Chords join interacting QTLs, coloured by trait. Toggle “Epistatic links” to enable them.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AsyncBoundary>
    </div>
  )
}
