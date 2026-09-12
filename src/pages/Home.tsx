import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, Copy, Database, Download,
  Filter, Github, Layers, Microscope, Network, Quote, Search, Sparkles,
  Sprout, Telescope, Wheat, Zap,
} from 'lucide-react'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord } from '../lib/types'
import { normalizeTrait, normalizeSpecies } from '../lib/map'
import MiniIdeogram from '../components/MiniIdeogram'

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

// Colours match this same category's TRAIT_COLORS entry in lib/map.ts (the
// same palette used by the Search/Map/Statistics views), so the homepage
// teaser reads as the same coloured taxonomy, not an unrelated rainbow.
const TRAIT_CATS = [
  { name: 'Yield',           icon: Sprout,     blurb: 'Grain yield, biomass, harvest index, spike traits.', color: '#2e7d32' },
  { name: 'Abiotic stress',  icon: Zap,        blurb: 'Drought, heat, salinity, water-logging, frost.', color: '#a16207' },
  { name: 'Biotic stress',   icon: Microscope, blurb: 'Rusts, FHB, powdery mildew, insect resistance.', color: '#c62828' },
  { name: 'Quality traits',  icon: Layers,     blurb: 'Protein, gluten, sedimentation, dough strength.', color: '#d4a017' },
  { name: 'Biofortification', icon: Sparkles,  blurb: 'Fe, Zn, Se grain content for nutrition.', color: '#7b1fa2' },
  { name: 'Developmental',   icon: Telescope,  blurb: 'Heading date, vernalisation, photoperiod.', color: '#0f9178' },
  { name: 'Plant morphology', icon: Network,  blurb: 'Plant height, tiller number, awns, spike length.', color: '#a05a2c' },
  { name: 'Nitrogen Use efficiency', icon: Filter, blurb: 'NUE, N uptake, NUtE under varying nitrogen.', color: '#0277bd' },
]

export default function Home() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const speciesSet = new Set<string>()
    qtl.data.forEach((r) => r.species && speciesSet.add(normalizeSpecies(r.species)))
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
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-wheat-300/30 blur-3xl" />
        <div className="absolute -right-16 top-16 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-white/70" />

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
              WheatQTLdb <span className="text-gradient-wheat">V3.0</span>
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
              <a href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer" className="btn"><Github className="h-4 w-4" /> View source code</a>
            </div>
          </div>

          {/* Live stat strip */}
          <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up" style={{ animationDelay: '.3s' }}>
            <StatTile label="QTL records" value={stats.qtl} loading={qtl.loading} icon={Database} color="#9a6628" />
            <StatTile label="MetaQTL" value={stats.mqtl} loading={mqtl.loading} icon={Layers} color="#0f9178" />
            <StatTile label="Epistatic QTL" value={stats.epi} loading={epi.loading} icon={Network} color="#7b1fa2" />
            <StatTile label="Species" value={stats.species} loading={qtl.loading} icon={Wheat} suffix="" color="#2e7d32" />
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
          {TRAIT_CATS.map(({ name, icon: Icon, blurb, color }, i) => (
            <Link
              key={name}
              to={`/search?trait=${encodeURIComponent(name)}`}
              className="group relative overflow-hidden rounded-2xl border border-wheat-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ animation: `fade-up .5s ease-out ${i * 60}ms both`, borderTopColor: color, borderTopWidth: 3 }}
            >
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition"
                style={{ backgroundColor: `${color}33` }}
              />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md" style={{ backgroundColor: color }}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-wheat-900">{name}</h3>
                <p className="mt-1 text-sm text-wheat-700">{blurb}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition group-hover:gap-2" style={{ color }}>
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
            subtitle="A miniature, to-scale karyotype of all 21 hexaploid wheat chromosomes — real relative sizes (3B is the largest), coloured by subgenome (A/B/D). Click any bar to filter the search."
          />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-wheat-200 bg-wheat-50/60 px-4 py-6">
            <div className="mx-auto max-w-4xl">
              <MiniIdeogram onSelect={(chr) => navigate(`/search?chromosome=${chr}`)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-wheat-600">
            {(['A', 'B', 'D'] as const).map((g) => (
              <span key={g} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: g === 'A' ? '#e8a33d' : g === 'B' ? '#4f8fc0' : '#5fa777' }}
                />
                {g} genome
              </span>
            ))}
            <span>Bar height is proportional to real IWGSC RefSeq v1.0 physical length.</span>
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
                  <Link to={`/search?trait=${encodeURIComponent(c.name)}`} className="group block">
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

        <div className="card relative overflow-hidden bg-gradient-to-br from-wheat-600 via-wheat-700 to-emerald-800 text-white shadow-lg">
          <Sparkles className="h-7 w-7 text-wheat-100" />
          <h3 className="mt-3 text-xl font-bold">What's new in V3.0</h3>
          <ul className="mt-3 space-y-2 text-sm text-wheat-50/95">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> Updated list of QTLs reported from 2022.</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> Transparent — open codebase & reproducible builds</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> Modern, mobile-ready UI</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> Advanced multi-criteria search</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> Interactive charts (5+ views)</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> CSV-based · open data layer</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-200" /> One-click CSV export</li>
          </ul>
          <Link to="/credits" className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/25">
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-wheat-700 via-wheat-600 to-emerald-700 p-8 text-white shadow-xl sm:p-14">
        <div className="relative max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Open data, open code, reproducible science.</h2>
          <p className="mt-3 text-wheat-50/90">
            Found a missing reference or want to contribute curated records? Pull requests, issues and email correspondence are all welcome — contributions are credited and versioned in the public repository.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-wheat-900 shadow-lg transition hover:bg-wheat-50">
              <Github className="h-4 w-4" /> Contribute on GitHub
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
              Contact the team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatTile({ label, value, loading, icon: Icon, suffix, color = '#9a6628' }: { label: string; value: number; loading: boolean; icon: typeof Database; suffix?: string; color?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-wheat-200 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full blur-xl transition" style={{ backgroundColor: `${color}22` }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-wheat-600">{label}</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-wheat-900">
            {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-wheat-200" /> : value.toLocaleString()}{suffix ?? ''}
          </div>
        </div>
        <div className="rounded-lg p-2 text-white" style={{ backgroundColor: color }}>
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
