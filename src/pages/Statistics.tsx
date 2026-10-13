import { Fragment, useMemo } from 'react'
import type { Data } from 'plotly.js'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import AsyncBoundary from '../components/AsyncBoundary'
import StatisticsPlot from '../components/StatisticsPlot'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord, PublicationRecord } from '../lib/types'
import {
  chromosomeSortKey, normalizeTrait, normalizeSubTrait, normalizeSpecies, majorClassOf,
  TRAIT_MAJOR_CLASSES, TRAIT_HIERARCHY, TRAIT_SUBCATEGORIES,
  normalizeChromosome, parsePositionInterval, qtlPhysicalPoint,
} from '../lib/map'

// One accent for every single-series mark on the page; colour is spent only
// where it carries identity - the three subgenomes. That trio is checked with
// the dataviz palette validator (all-pairs, light surface): CVD dE 8.1,
// normal-vision dE 15.2. The gold sits just under 3:1 against white, which is
// why every chromosome bar is also labelled with its genome letter.
const ACCENT = '#15803d'
const ACCENT_SOFT = '#86c79b'
const NEUTRAL = '#d1d1d6'
const GENOME = { A: '#c98a1a', B: '#3f7fb5', D: '#3d9163' } as const

// The record's `year` column, which the data pipeline fills from the resolved
// publication - never scraped from the reference link, whose DOIs and ISSNs
// contain four-digit runs that are not years.
function publicationYear(r: { year?: string }): number | null {
  const y = Number(r.year)
  return Number.isInteger(y) && y >= 1980 && y <= new Date().getFullYear() ? y : null
}

const pct = (n: number, total: number) => `${((n / (total || 1)) * 100).toFixed(1)}%`

export default function Statistics() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')
  const pubs = useCSV<PublicationRecord>('publications.csv')
  const atlas = useCSV<{ publications: string }>('gwas_atlas_summary.csv')
  const pending = useCSV<{ mapping_in: string }>('pending_studies.csv')
  const extracted = useCSV<{ records: string; publications: string }>('extracted_qtl_summary.csv')

  const loading = qtl.loading || mqtl.loading || epi.loading || pubs.loading
  const error = qtl.error ?? mqtl.error ?? epi.error ?? pubs.error
  const total = qtl.data.length

  // Main traits and sub-categories exactly as the curators' trait table lists
  // them. Each record is counted once, so sub-categories sum to their main
  // trait and main traits to the record total.
  const traitRows = useMemo(() => {
    const counts = new Map<string, number>()
    const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1)
    qtl.data.forEach((r) => {
      const cat = normalizeTrait(r)
      bump(cat)
      bump(`class:${majorClassOf(cat)}`)
      const sub = normalizeSubTrait(r)
      if (sub) bump(`sub:${sub}`)
    })
    return TRAIT_MAJOR_CLASSES.map((major) => {
      const categories = TRAIT_HIERARCHY[major] ?? []
      const subs = categories.length === 1 ? TRAIT_SUBCATEGORIES[categories[0]] : undefined
      const children = (subs
        ? subs.map((name) => ({ name, n: counts.get(`sub:${name}`) ?? 0 }))
        : categories.map((name) => ({ name: name as string, n: counts.get(name) ?? 0 }))
      ).filter((c) => c.n > 0).sort((a, b) => b.n - a.n)
      return { major, total: counts.get(`class:${major}`) ?? 0, children }
    }).filter((r) => r.total > 0)
  }, [qtl.data])
  const largestClass = Math.max(1, ...traitRows.map((r) => r.total))

  const byChromosome = useMemo(() => {
    const counts = new Map<string, number>()
    let unassigned = 0
    qtl.data.forEach((r) => {
      const chr = normalizeChromosome(r.chromosome)
      if (chr) counts.set(chr, (counts.get(chr) ?? 0) + 1)
      else unassigned++
    })
    const rows = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => chromosomeSortKey(a.name) - chromosomeSortKey(b.name))
    return { rows, unassigned, order: rows.map((r) => r.name) }
  }, [qtl.data])

  const byYear = useMemo(() => {
    const counts = new Map<number, number>()
    qtl.data.forEach((r) => {
      const year = publicationYear(r)
      if (year !== null) counts.set(year, (counts.get(year) ?? 0) + 1)
    })
    const rows = Array.from(counts.entries()).sort((a, b) => a[0] - b[0])
    return { rows, dated: rows.reduce((s, [, n]) => s + n, 0) }
  }, [qtl.data])

  // Same test the map uses (qtlPhysicalPoint), so "physical" here is exactly
  // the number of QTL on the ideogram and circos views.
  const positions = useMemo(() => {
    let physical = 0
    let genetic = 0
    qtl.data.forEach((r) => {
      const chr = normalizeChromosome(r.chromosome)
      if (chr && qtlPhysicalPoint(r, chr) !== null) physical++
      else if (chr && parsePositionInterval(r.position_interval || '').point !== null) genetic++
    })
    return [
      { name: 'Physical position (bp)', value: physical, color: ACCENT },
      { name: 'Genetic position only (cM)', value: genetic, color: ACCENT_SOFT },
      { name: 'No usable position', value: total - physical - genetic, color: NEUTRAL },
    ]
  }, [qtl.data, total])

  const species = useMemo(() => {
    const counts = new Map<string, number>()
    qtl.data.forEach((r) => {
      // A field naming several species ("A; B") is an interspecific study:
      // counted once under its own row, so the rows still sum to the total.
      const names = [...new Set((r.species || '').split(/[;/]/).map((x) => normalizeSpecies(x)).filter(Boolean))]
      const s = names.length === 0 ? 'Not recorded' : names.length === 1 ? names[0] : 'Two or more species'
      counts.set(s, (counts.get(s) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [qtl.data])

  const chromosomeTraces = useMemo<Data[]>(() => (['A', 'B', 'D'] as const).map((g) => {
    const rows = byChromosome.rows.filter((r) => r.name.endsWith(g))
    return {
      type: 'bar', name: `${g} subgenome`,
      x: rows.map((r) => r.name), y: rows.map((r) => r.value),
      marker: { color: GENOME[g] },
      hovertemplate: '%{x}: %{y:,} QTL<extra></extra>',
    }
  }), [byChromosome])

  const yearTrace = useMemo<Data[]>(() => [{
    type: 'bar', name: 'QTL records',
    x: byYear.rows.map(([y]) => y), y: byYear.rows.map(([, n]) => n),
    marker: { color: ACCENT },
    hovertemplate: '%{x}: %{y:,} QTL<extra></extra>',
  }], [byYear])

  return (
    <div>
      <PageHero
        eyebrow="Analytics"
        title="Database statistics"
        subtitle="What WheatQTLdb V3.0 holds: QTL by trait, chromosome, publication year and type of map position."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="QTL / MTA records" value={total} />
          <Tile label="MetaQTLs" value={mqtl.data.length} />
          <Tile label="Epistatic QTL pairs" value={epi.data.length} />
          <Tile label="Source publications" value={pubs.data.length} />
        </div>

        <section className="card mb-6">
          <Heading title="QTL by trait"
                   note={`Every record is counted under one main trait and one sub-category; the rows sum to ${total.toLocaleString()}.`} />
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr><th>Trait</th><th>Share of largest main trait</th><th>QTL records</th><th>Share of all records</th></tr>
            </thead>
            <tbody>
              {traitRows.map((row) => (
                <Fragment key={row.major}>
                  <TraitRow name={row.major} n={row.total} total={total} max={largestClass} main />
                  {row.children.map((c) => (
                    <TraitRow key={`${row.major}/${c.name}`} name={c.name} n={c.n} total={total} max={largestClass} />
                  ))}
                </Fragment>
              ))}
              <tr className="border-t-2 border-wheat-300">
                <td className="py-2 pr-4 font-semibold text-wheat-900">All QTL records</td>
                <td />
                <td className="py-2 pl-4 text-right font-semibold tabular-nums text-wheat-900">{total.toLocaleString()}</td>
                <td className="hidden py-2 pl-4 text-right tabular-nums text-wheat-500 sm:table-cell">100%</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <Heading title="QTL by chromosome"
                     note={byChromosome.unassigned > 0
                       ? `${byChromosome.unassigned.toLocaleString()} records with no assigned chromosome are not shown.`
                       : undefined} />
            <StatisticsPlot filename="qtl-by-chromosome" height={320} showLegend stacked
              categories={byChromosome.order} data={chromosomeTraces} />
          </section>

          <section className="card">
            <Heading title="QTL by publication year"
                     note={`${byYear.dated.toLocaleString()} of ${total.toLocaleString()} records (${pct(byYear.dated, total)}) trace to a dated publication.`} />
            <StatisticsPlot filename="qtl-by-publication-year" height={320} data={yearTrace} />
          </section>

          <section className="card">
            <Heading title="Type of map position"
                     note="Physical positions are drawn on the ideogram and circos views, genetic positions on the linkage (cM) view." />
            <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded" role="img"
                 aria-label={positions.map((p) => `${p.name}: ${p.value.toLocaleString()}`).join('; ')}>
              {positions.map((p) => (
                <div key={p.name} title={`${p.name}: ${p.value.toLocaleString()} (${pct(p.value, total)})`}
                     style={{ width: `${(p.value / (total || 1)) * 100}%`, backgroundColor: p.color }} />
              ))}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {positions.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
                  <dt className="text-wheat-700">{p.name}</dt>
                  <dd className="ml-auto tabular-nums font-medium text-wheat-900">{p.value.toLocaleString()}</dd>
                  <dd className="w-14 text-right tabular-nums text-wheat-500">{pct(p.value, total)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card">
            <Heading title="Species" />
            <dl className="space-y-2 text-sm">
              {species.slice(0, 6).map(([name, n]) => (
                <div key={name} className="flex items-center gap-2">
                  <dt className={/^(Two|Not)/.test(name) ? 'text-wheat-700' : 'italic text-wheat-700'}>{name}</dt>
                  <dd className="ml-auto tabular-nums font-medium text-wheat-900">{n.toLocaleString()}</dd>
                  <dd className="w-14 text-right tabular-nums text-wheat-500">{pct(n, total)}</dd>
                </div>
              ))}
              {species.length > 6 && (
                <div className="flex items-center gap-2 text-wheat-500">
                  <dt>{species.length - 6} other species</dt>
                  <dd className="ml-auto tabular-nums">
                    {species.slice(6).reduce((s, [, n]) => s + n, 0).toLocaleString()}
                  </dd>
                  <dd className="w-14" />
                </div>
              )}
            </dl>
          </section>
          <section className="card lg:col-span-2">
            <Heading title="Literature coverage"
                     note="How much of the wheat QTL and GWAS literature is in the database. Only the first row contributes to the QTL counts above." />
            <dl className="space-y-2 text-sm">
              {[
                { name: 'Publications curated into WheatQTLdb', n: pubs.data.length, to: '/publications' },
                { name: 'Further publications imported from GWAS Atlas', n: Number(atlas.data[0]?.publications ?? 0), to: '/data/gwas-atlas' },
                { name: `Papers awaiting curation with automatically extracted, unverified records (${Number(extracted.data[0]?.records ?? 0).toLocaleString()} records)`, n: Number(extracted.data[0]?.publications ?? 0), to: '/data/extracted-qtl' },
                { name: 'Papers awaiting curation that name QTL / GWAS in the title', n: pending.data.filter((r) => r.mapping_in === 'title').length, to: '/data/pending-studies' },
                { name: 'Other candidate papers (mapping mentioned in the abstract only)', n: pending.data.filter((r) => r.mapping_in !== 'title').length, to: '/data/pending-studies' },
              ].map((row) => (
                <div key={row.name} className="flex items-center gap-2">
                  <dt className="text-wheat-700"><Link className="hover:underline" to={row.to}>{row.name}</Link></dt>
                  <dd className="ml-auto tabular-nums font-medium text-wheat-900">{row.n.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </section>

        </div>
        {import.meta.env.PROD && (
          <p className="mt-6 text-xs text-wheat-500">
            A fuller set of figures generated in R from the same data is{' '}
            <a className="underline" href={`${import.meta.env.BASE_URL}statistics-r.html`}>available here</a>.
          </p>
        )}
      </AsyncBoundary>
    </div>
  )
}

function TraitRow({ name, n, total, max, main }: { name: string; n: number; total: number; max: number; main?: boolean }) {
  return (
    <tr className={main ? 'border-t border-wheat-200' : ''} title={`${name}: ${n.toLocaleString()} QTL (${pct(n, total)})`}>
      <td className={`whitespace-nowrap pr-4 ${main ? 'pb-1 pt-3 font-semibold text-wheat-900' : 'py-1 pl-4 text-wheat-600'}`}>
        {name}
      </td>
      <td className="w-full align-middle">
        <div className="h-2.5 rounded-r" style={{
          width: `${Math.max(0.4, (n / max) * 100)}%`,
          backgroundColor: main ? ACCENT : ACCENT_SOFT,
        }} />
      </td>
      <td className={`pl-4 text-right tabular-nums ${main ? 'pb-1 pt-3 font-semibold text-wheat-900' : 'py-1 text-wheat-700'}`}>
        {n.toLocaleString()}
      </td>
      <td className={`hidden pl-4 text-right tabular-nums text-wheat-500 sm:table-cell ${main ? 'pb-1 pt-3' : 'py-1'}`}>
        {pct(n, total)}
      </td>
    </tr>
  )
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-wheat-900">{title}</h2>
      {note && <p className="mt-1 text-xs text-wheat-500">{note}</p>}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card py-5">
      <div className="text-3xl font-semibold tabular-nums tracking-tight text-wheat-900">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-wheat-500">{label}</div>
    </div>
  )
}
