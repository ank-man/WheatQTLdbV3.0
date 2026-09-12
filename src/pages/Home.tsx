import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, Copy, Database, Download,
  Filter, Github, Layers, Microscope, Network, Quote, Search, Sparkles,
  Sprout, Telescope, Wheat, Zap,
} from 'lucide-react'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord } from '../lib/types'
import { normalizeTrait } from '../lib/map'

const heroImg = `${import.meta.env.BASE_URL}images/hero-wheat.jpg`
const img = (p: string) => `${import.meta.env.BASE_URL}images/${p}`

// Open-access photography (Wikimedia Commons, CC BY-SA / public domain); full
// attribution on the Credits page.
const GALLERY = [
  { file: 'wheat-field-gbif.jpg', caption: 'Triticum aestivum, field' },
  { file: 'wheat-spring.jpg', caption: 'Spring wheat (T. aestivum)' },
  { file: 'wheat-grains.jpg', caption: 'Wheat grains' },
  { file: 'wheat-herbarium.jpg', caption: 'Herbarium specimen' },
]

const TRAIT_CATS = [
  { name: 'Yield',           icon: Sprout,     blurb: 'Grain yield, biomass, harvest index, spike traits.' },
  { name: 'Abiotic stress',  icon: Zap,        blurb: 'Drought, heat, salinity, water-logging, PHS.' },
  { name: 'Biotic stress',   icon: Microscope, blurb: 'Rusts, FHB, powdery mildew, insect resistance.' },
  { name: 'Quality',         icon: Layers,     blurb: 'Protein, gluten, sedimentation, dough strength.' },
  { name: 'Biofortification', icon: Sparkles,  blurb: 'Fe, Zn, Se grain content for nutrition.' },
  { name: 'Developmental',   icon: Telescope,  blurb: 'Heading date, vernalisation, photoperiod.' },
  { name: 'Morphological',   icon: Network,    blurb: 'Plant height, tiller number, awns.' },
  { name: 'Nitrogen Use efficiency', icon: Filter, blurb: 'NUE, N uptake, NUtE under varying nitrogen.' },
]

const SUBGENOMES: { label: string; key: 'A' | 'B' | 'D' }[] = [
  { label: 'A genome', key: 'A' },
  { label: 'B genome', key: 'B' },
  { label: 'D genome', key: 'D' },
]
const HOMOEO = [1, 2, 3, 4, 5, 6, 7]

export default function Home() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const speciesSet = new Set<string>()
    qtl.data.forEach((r) => r.species && speciesSet.add(r.species))
    return {
      qtl: qtl.data.length,
      mqtl: mqtl.data.length,
      epi: epi.data.length,
      species: speciesSet.size,
    }
  }, [qtl.data, mqtl.data, epi.data])

  // Grouped by the same normalizeTrait() classification the Search page's
  // Trait dropdown uses, not raw per-row trait text - a raw grouping would
  // both undercount (case/whitespace variants of the same trait split
  // across bars) and disagree with what "Trait" actually filters to
  // elsewhere in the app.
  const topCategories = useMemo(() => {
    const m = new Map<string, number>()
    qtl.data.forEach((r) => {
      const k = normalizeTrait(r)
      m.set(k, (m.get(k) ?? 0) + 1)
    })
    const max = Math.max(1, ...m.values())
    return Array.from(m, ([name, value]) => ({ name, value, pct: (value / max) * 100 }))
      .sort((a, b) => b.value - a.value).slice(0, 6)
  }, [qtl.data])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  const citation = `Singh, K., Saini, D.K., Saripalli, G. et al. WheatQTLdb V2.0: a supplement to the database for wheat QTL. Mol Breeding 42, 56 (2022). https://doi.org/10.1007/s11032-022-01329-1`
  const copyCitation = async () => {
    try { await navigator.clipboard.writeText(citation); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="relative -mx-4 -mt-8 overflow-hidden border-b border-wheat-200 bg-white">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-white/85" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <div className="flex flex-col items-center text-center">
            <span className="badge animate-fade-up">
              <span className="relative mr-1 inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-wheat-500 animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-wheat-600" />
              </span>
              v3.0 · open source · reproducible archive
            </span>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-bold leading-tight tracking-tight text-wheat-800 sm:text-6xl animate-fade-up" style={{ animationDelay: '.05s' }}>
              WheatQTLdb <span className="text-wheat-600">V3.0</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-wheat-700 animate-fade-up" style={{ animationDelay: '.1s' }}>
              A manually curated, open-access database of <strong>QTL</strong>, <strong>MetaQTL</strong> and <strong>epistatic QTL</strong> in <em>Triticum aestivum</em> and seven related wheat species.
              An updated, static, reproducible release of{' '}
              <a className="underline hover:text-wheat-900" href="http://wheatqtldb.net" target="_blank" rel="noreferrer">wheatqtldb.net</a>{' '}
              for the wheat-genetics community.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-wheat-600 animate-fade-up" style={{ animationDelay: '.12s' }}>
              Academic resource · Manuscript in preparation · Citation-ready
            </p>

            {/* Embedded search */}
            <form onSubmit={onSearch} className="mt-8 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-wheat-200 bg-white p-2 shadow-lg shadow-wheat-200/40 animate-fade-up" style={{ animationDelay: '.15s' }}>
              <Search className="ml-2 h-5 w-5 flex-shrink-0 text-wheat-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search QTL, trait, marker, gene, reference…"
                className="flex-1 bg-transparent px-1 py-2 text-base outline-none placeholder:text-wheat-500"
                aria-label="Search WheatQTLdb"
              />
              <button type="submit" className="btn-primary">
                Search <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-wheat-700 animate-fade-up" style={{ animationDelay: '.2s' }}>
              <span>Try:</span>
              {['Drought', 'Rht-B1', 'Fhb1', 'Grain yield', 'Heat tolerance'].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(t)}`)}
                  className="rounded-full border border-wheat-300 bg-white/70 px-3 py-1 backdrop-blur transition hover:bg-wheat-100"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: '.25s' }}>
              <Link to="/data" className="btn-primary"><Database className="h-4 w-4" /> Browse data</Link>
              <Link to="/statistics" className="btn"><BarChart3 className="h-4 w-4" /> Statistics</Link>
              <Link to="/map" className="btn"><Layers className="h-4 w-4" /> Genome map</Link>
              <a href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer" className="btn"><Github className="h-4 w-4" /> Star on GitHub</a>
            </div>
          </div>

          {/* Live stat strip */}
          <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up" style={{ animationDelay: '.3s' }}>
            <StatTile label="QTL records" value={stats.qtl} loading={qtl.loading} icon={Database} />
            <StatTile label="MetaQTL" value={stats.mqtl} loading={mqtl.loading} icon={Layers} />
            <StatTile label="Epistatic QTL" value={stats.epi} loading={epi.loading} icon={Network} />
            <StatTile label="Species" value={stats.species} loading={qtl.loading} icon={Wheat} suffix="" />
          </div>
        </div>
      </section>

      {/* TRAIT CATEGORIES */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Coverage"
          title="Trait categories represented in the database"
          subtitle="Curated QTL spanning abiotic and biotic stress tolerance, yield, quality, biofortification, developmental and physiological traits."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRAIT_CATS.map(({ name, icon: Icon, blurb }, i) => (
            <Link
              key={name}
              to={`/search?trait_category=${encodeURIComponent(name)}`}
              className="group relative overflow-hidden rounded-2xl border border-wheat-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-wheat-400 hover:shadow-lg"
              style={{ animation: `fade-up .5s ease-out ${i * 60}ms both` }}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-wheat-200/50 blur-2xl transition group-hover:bg-wheat-300/70" />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-wheat-500 to-wheat-700 text-white shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-wheat-900">{name}</h3>
                <p className="mt-1 text-sm text-wheat-700">{blurb}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-wheat-700 transition group-hover:gap-2">
                  Explore <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CHROMOSOME MAP */}
      <section className="relative overflow-hidden rounded-3xl border border-wheat-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="relative">
          <SectionHeader
            eyebrow="Genome map"
            title="Browse by chromosome"
            subtitle="The hexaploid wheat genome organised as 3 sub-genomes × 7 homoeologous groups. Click any tile to filter the search."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {SUBGENOMES.map((sg, gi) => (
              <div key={sg.key} className="rounded-2xl border border-wheat-200 bg-wheat-50/60 p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="text-lg font-bold">{sg.label}</div>
                  <span className="text-3xl font-black text-wheat-300">{sg.key}</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {HOMOEO.map((n, hi) => {
                    const ch = `${n}${sg.key}`
                    return (
                      <Link
                        key={ch}
                        to={`/search?chromosome=${ch}`}
                        title={`Chromosome ${ch}`}
                        className="group relative aspect-[1/3] overflow-hidden rounded-md border border-wheat-300 bg-gradient-to-b from-wheat-200 to-wheat-400 text-center text-[10px] font-bold text-wheat-900 transition hover:scale-[1.06] hover:from-wheat-300 hover:to-wheat-600 hover:text-white"
                        style={{ animation: `grain-grow .8s ease-out ${(gi * 7 + hi) * 30}ms both` }}
                      >
                        <span className="absolute inset-x-0 top-1">{ch}</span>
                        <span className="absolute inset-x-0 bottom-1 h-1 rounded-full bg-white/60 group-hover:bg-white" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOP TRAIT CATEGORIES (live from data) */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card relative overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-wheat-600">Live from your data</div>
              <h3 className="mt-1 text-xl font-bold">Most studied trait categories</h3>
            </div>
            <Link to="/statistics" className="btn">
              <BarChart3 className="h-4 w-4" /> All charts
            </Link>
          </div>
          {topCategories.length === 0 && !qtl.loading ? (
            <p className="text-sm text-wheat-600">No data loaded yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCategories.map((c, i) => (
                <li key={c.name} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <Link to={`/search?trait_category=${encodeURIComponent(c.name)}`} className="group block">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-wheat-800 group-hover:text-wheat-900">{c.name}</span>
                      <span className="tabular-nums text-wheat-600">{c.value} QTL</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-wheat-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-wheat-500 via-wheat-600 to-wheat-700 transition-all"
                        style={{ width: `${c.pct}%`, animation: `fade-up .8s ease-out ${i * 60}ms both` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card relative overflow-hidden">
          <Sparkles className="h-7 w-7 text-wheat-600" />
          <h3 className="mt-3 text-xl font-bold text-wheat-900">What's new in V3.0</h3>
          <ul className="mt-3 space-y-2 text-sm text-wheat-700">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> Updated list of QTLs reported from 2022.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> Transparent — open codebase & reproducible builds</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> Modern, mobile-ready UI</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> Advanced multi-criteria search</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> Interactive charts (5+ views)</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> CSV-based · open data layer</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" /> One-click CSV export</li>
          </ul>
          <Link to="/credits" className="mt-5 inline-flex items-center gap-2 rounded-md bg-wheat-100 px-3 py-1.5 text-sm font-medium text-wheat-800 transition hover:bg-wheat-200">
            Read more <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* WORKFLOW */}
      <section>
        <SectionHeader eyebrow="Workflow" title="From query to publication-ready CSV" subtitle="Reproducible querying for fine-mapping, MAS and meta-analysis." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Search,   title: '1. Search',  body: 'Combine free-text with species, trait, chromosome, year, PVE, method.', to: '/search' },
            { icon: Filter,   title: '2. Refine',  body: 'Sort, paginate, and drill into individual references with DOI links.', to: '/data/qtl' },
            { icon: Download, title: '3. Export',  body: 'Download the filtered table as CSV for downstream R / Python workflows.', to: '/data' },
          ].map((s, i) => (
            <Link key={s.title} to={s.to} className="group relative overflow-hidden rounded-2xl border border-wheat-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="absolute right-3 top-3 text-5xl font-black text-wheat-100 transition group-hover:text-wheat-200">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-wheat-100 text-wheat-700 transition group-hover:bg-wheat-600 group-hover:text-white">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-wheat-900">{s.title}</h3>
                <p className="mt-1 text-sm text-wheat-700">{s.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Gallery"
          title="Triticum aestivum, from field to herbarium"
          subtitle="Open-access botanical and field photography of bread wheat and its relatives."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY.map((g, i) => (
            <figure
              key={g.file}
              className="group relative overflow-hidden rounded-2xl border border-wheat-200 shadow-sm"
              style={{ animation: `fade-up .5s ease-out ${i * 60}ms both` }}
            >
              <img
                src={img(g.file)}
                alt={g.caption}
                loading="lazy"
                className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
                {g.caption}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="text-xs text-wheat-600">
          All images are openly licensed (public domain / CC BY-SA via Wikimedia Commons) — see{' '}
          <Link to="/credits" className="underline">Credits &amp; licences</Link> for full attribution.
        </p>
      </section>

      {/* CITATION */}
      <section className="relative overflow-hidden rounded-3xl border border-wheat-200 bg-white p-6 shadow-sm sm:p-10">
        <Quote className="absolute right-6 top-6 h-24 w-24 text-wheat-200" />
        <div className="relative">
          <SectionHeader eyebrow="Citing the database" title="Please cite the original WheatQTLdb papers" />
          <p className="mt-3 max-w-3xl text-sm text-wheat-800">{citation}</p>
          <p className="mt-2 max-w-3xl text-sm text-wheat-700">
            Singh K, Batra R, Sharma S, et al. <em>WheatQTLdb: a QTL database for wheat.</em>{' '}
            Mol Genet Genomics 296, 1051–1056 (2021).{' '}
            <a className="underline" href="https://doi.org/10.1007/s00438-021-01796-9" target="_blank" rel="noreferrer">doi:10.1007/s00438-021-01796-9</a>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={copyCitation}>
              {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy citation</>}
            </button>
            <a className="btn" href="https://doi.org/10.1007/s11032-022-01329-1" target="_blank" rel="noreferrer">
              View on DOI <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-wheat-200 bg-white p-8 shadow-sm sm:p-14">
        <div className="relative max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-wheat-900 sm:text-4xl">Open data, open code, reproducible science.</h2>
          <p className="mt-3 text-wheat-700">
            Found a missing reference or want to contribute curated records? Pull requests, issues and email correspondence are all welcome — contributions are credited and versioned in the public repository.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer" className="btn-primary">
              <Github className="h-4 w-4" /> Contribute on GitHub
            </a>
            <Link to="/contact" className="btn">
              Contact the team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatTile({ label, value, loading, icon: Icon, suffix }: { label: string; value: number; loading: boolean; icon: typeof Database; suffix?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-wheat-200 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
      <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-wheat-100/70 blur-xl transition group-hover:bg-wheat-200" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-wheat-600">{label}</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-wheat-900">
            {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-wheat-200" /> : value.toLocaleString()}{suffix ?? ''}
          </div>
        </div>
        <div className="rounded-lg bg-wheat-100 p-2 text-wheat-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600">{eyebrow}</div>}
      <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-wheat-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-2 text-wheat-700">{subtitle}</p>}
    </div>
  )
}
