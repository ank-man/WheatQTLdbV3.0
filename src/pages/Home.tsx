import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, Check, Copy, Database, Layers, Search } from 'lucide-react'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord } from '../lib/types'
import NewsList from '../components/NewsList'
import { useNews } from '../lib/news'
import { normalizeTrait, normalizeSpecies, isMultiTraitQTL, TRAIT_MAJOR_CLASSES, majorClassOf } from '../lib/map'
import MiniIdeogram from '../components/MiniIdeogram'

// Entry points into the Search page. A tile names either a main trait of the
// curators' trait table or one sub-category of it; the dot colour is that
// category's colour on the map views.
const TRAITS = [
  { name: 'Abiotic stress',  blurb: 'Drought, heat, salinity, water-logging, frost.', color: '#a16207' },
  { name: 'Biotic stress',   blurb: 'Rusts, FHB, powdery mildew, nematodes, insects.', color: '#c62828' },
  { name: 'Yield',           blurb: 'Grain yield, grain weight and yield components.', color: '#2e7d32' },
  { name: 'Biofortification', blurb: 'Zinc, iron, selenium and other grain minerals.', color: '#7b1fa2' },
  { name: 'Nutrient use efficiency', blurb: 'Nitrogen, phosphorus and potassium use.', color: '#0277bd' },
  { name: 'Quality traits',  blurb: 'Protein, gluten, sedimentation, dough strength.', color: '#d4a017' },
  { name: 'Developmental',   blurb: 'Heading date, vernalisation, photoperiod.', color: '#0f9178' },
  { name: 'Plant morphology', blurb: 'Plant height, tillers, awns, spike length.', color: '#a05a2c' },
]

const heroImg = `${import.meta.env.BASE_URL}images/wheat-aerial-field.jpg`

const isMainTrait = (name: string) => (TRAIT_MAJOR_CLASSES as readonly string[]).includes(name)

// A main trait and a sub-category are separate filters on the Search page, so
// the link has to target the right one.
function traitSearchHref(name: string): string {
  return `/search?${isMainTrait(name) ? 'majorClass' : 'trait'}=${encodeURIComponent(name)}`
}

const CITATION = 'Singh, K., Saini, D.K., Saripalli, G. et al. WheatQTLdb V2.0: a supplement to the database for wheat QTL. Mol Breeding 42, 56 (2022). https://doi.org/10.1007/s11032-022-01329-1'

export default function Home() {
  const news = useNews()
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const species = new Set<string>()
    const traits = new Map<string, number>()
    const bump = (k: string) => traits.set(k, (traits.get(k) ?? 0) + 1)
    qtl.data.forEach((r) => {
      // A few records name several species in one field ("A; B") - those are
      // split, so the tile counts species rather than distinct field values.
      ;(r.species || '').split(/[;/]/).forEach((sp) => {
        const name = normalizeSpecies(sp)
        if (name) species.add(name)
      })
      const category = normalizeTrait(r)
      bump(category)
      // "Biofortification" and "Nutrient use efficiency" are both a main
      // trait and its only category; count each record once under the name.
      if (majorClassOf(category) !== category) bump(majorClassOf(category))
    })
    return {
      qtl: qtl.data.length,
      mqtl: mqtl.data.length,
      epi: epi.data.length,
      species: species.size,
      multiTrait: qtl.data.filter(isMultiTraitQTL).length,
      traits,
    }
  }, [qtl.data, mqtl.data, epi.data])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }
  const copyCitation = async () => {
    try { await navigator.clipboard.writeText(CITATION); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  return (
    <div className="space-y-14">
      {/* HERO */}
      <section className="relative -mx-4 -mt-8 overflow-hidden border-b border-wheat-200 bg-white">
        {/* Field photograph behind the hero. The wash over it is heavy enough
            for the text to keep its contrast, and fades to white at the bottom
            so the counts sit on a clean surface. */}
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/75 to-white" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-12 pt-16 text-center sm:pt-24">
          <span className="badge animate-fade-up">
            <span className="mr-1 inline-flex h-2 w-2 rounded-full bg-green-600" />
            Version 3.0 · curated from the published literature
          </span>
          <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-wheat-900 sm:text-7xl animate-fade-up" style={{ animationDelay: '.05s' }}>
            WheatQTLdb <span className="text-green-700">V3.0</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-wheat-800 animate-fade-up" style={{ animationDelay: '.1s' }}>
            A manually curated, open-access database of <strong className="text-wheat-900">QTL</strong>,{' '}
            <strong className="text-wheat-900">MetaQTL</strong> and{' '}
            <strong className="text-wheat-900">epistatic QTL</strong> in <em>Triticum aestivum</em> and seven
            related wheat species.
          </p>

          <form onSubmit={onSearch} className="mt-9 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-wheat-300 bg-white p-2 shadow-sm transition focus-within:border-green-600 focus-within:shadow-md animate-fade-up" style={{ animationDelay: '.15s' }}>
            <Search className="ml-2 h-5 w-5 flex-shrink-0 text-wheat-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search QTL, trait, marker, gene, reference…"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base outline-none placeholder:text-wheat-500"
              aria-label="Search WheatQTLdb"
            />
            <button type="submit" className="btn-primary">
              Search <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-wheat-600 animate-fade-up" style={{ animationDelay: '.2s' }}>
            <span>Try</span>
            {['Drought', 'Rht-B1', 'Fhb1', 'Grain yield', 'Heat tolerance'].map((t) => (
              <button
                key={t}
                onClick={() => navigate(`/search?q=${encodeURIComponent(t)}`)}
                className="rounded-full border border-wheat-300 bg-white px-3 py-1 text-wheat-700 transition hover:border-wheat-400 hover:bg-wheat-100"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: '.25s' }}>
            <Link to="/data" className="btn-primary"><Database className="h-4 w-4" /> Browse data</Link>
            <Link to="/statistics" className="btn"><BarChart3 className="h-4 w-4" /> Statistics</Link>
            <Link to="/map" className="btn"><Layers className="h-4 w-4" /> Genome map</Link>
            <Link to="/tutorial" className="btn"><BookOpen className="h-4 w-4" /> User guide</Link>
          </div>
        </div>

        {/* Live counts, read from the data files */}
        <div className="relative mx-auto max-w-5xl px-4 pb-12">
          <dl className="grid grid-cols-2 divide-wheat-200 overflow-hidden rounded-2xl border border-wheat-200 bg-white shadow-sm sm:grid-cols-5 sm:divide-x">
            <Stat label="QTL / MTA records" value={stats.qtl} loading={qtl.loading} to="/data/qtl" />
            <Stat label="MetaQTLs" value={stats.mqtl} loading={mqtl.loading} to="/data/metaqtl" />
            <Stat label="Epistatic QTL pairs" value={stats.epi} loading={epi.loading} to="/data/epistatic" />
            <Stat label="Multi-trait QTLs" value={stats.multiTrait} loading={qtl.loading} to="/data/multi-trait" />
            <Stat label="Species" value={stats.species} loading={qtl.loading} to="/search" />
          </dl>
        </div>
      </section>

      {/* BROWSE BY TRAIT */}
      <section>
        <SectionHeader title="Browse by trait" to="/statistics" linkLabel="All traits" />
        <div className="grid gap-px overflow-hidden rounded-2xl border border-wheat-200 bg-wheat-200 sm:grid-cols-2 lg:grid-cols-4">
          {TRAITS.map(({ name, blurb, color }) => (
            <Link key={name} to={traitSearchHref(name)} className="group bg-white p-5 transition hover:bg-wheat-100">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="font-semibold text-wheat-900">{name}</h3>
                <ArrowRight className="ml-auto h-4 w-4 text-wheat-300 transition group-hover:translate-x-0.5 group-hover:text-green-700" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-wheat-600">{blurb}</p>
              <p className="mt-3 text-sm tabular-nums text-wheat-900">
                {qtl.loading ? '…' : `${(stats.traits.get(name) ?? 0).toLocaleString()} QTL`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* BROWSE BY CHROMOSOME */}
      <section>
        <SectionHeader title="Browse by chromosome" to="/map" linkLabel="Genome map" />
        <div className="rounded-2xl border border-wheat-200 bg-white px-4 py-6">
          <div className="mx-auto max-w-4xl overflow-x-auto">
            <MiniIdeogram onSelect={(chr) => navigate(`/search?chromosome=${chr}`)} />
          </div>
          <p className="mt-4 text-center text-xs text-wheat-500">
            The 21 chromosomes at their relative physical lengths (IWGSC RefSeq v1.0), coloured by subgenome.
            Select one to list its QTL.
          </p>
        </div>
      </section>

      {/* NEWS */}
      {news.items.length > 0 && (
        <section>
          <SectionHeader title="News" to="/news" linkLabel="All news" />
          <div className="rounded-2xl border border-wheat-200 bg-white px-5">
            <NewsList items={news.items.slice(0, 3)} />
          </div>
        </section>
      )}

      {/* CITATION */}
      <section className="rounded-2xl border border-wheat-200 bg-wheat-100 p-6 sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600">How to cite</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wheat-800">{CITATION}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-wheat-700">
          Singh K, Batra R, Sharma S, et al. <em>WheatQTLdb: a QTL database for wheat.</em>{' '}
          Mol Genet Genomics 296, 1051–1056 (2021).{' '}
          <a className="underline" href="https://doi.org/10.1007/s00438-021-01796-9" target="_blank" rel="noreferrer">doi:10.1007/s00438-021-01796-9</a>
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={copyCitation}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy citation</>}
          </button>
          <Link to="/credits" className="btn">Credits &amp; citation</Link>
          <Link to="/contact" className="ml-auto text-sm text-wheat-600 underline-offset-2 hover:text-wheat-900 hover:underline">
            Report an error or send new data
          </Link>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, loading, to }: { label: string; value: number; loading: boolean; to: string }) {
  return (
    <Link to={to} className="group block px-5 py-5 text-left transition hover:bg-wheat-100">
      <dd className="text-3xl font-semibold tabular-nums tracking-tight text-wheat-900">
        {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-wheat-200" /> : value.toLocaleString()}
      </dd>
      <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-wheat-500 group-hover:text-green-700">{label}</dt>
    </Link>
  )
}

function SectionHeader({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-2xl font-bold tracking-tight text-wheat-900">{title}</h2>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline">
        {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
