import { Link } from 'react-router-dom'
import { Database, BarChart3, BookOpen, Github, Microscope, Wheat, Sprout, Users, Search } from 'lucide-react'

const CHROMS = ['1A','1B','1D','2A','2B','2D','3A','3B','3D','4A','4B','4D','5A','5B','5D','6A','6B','6D','7A','7B','7D']

const stats = [
  { label: 'QTL', value: '27,500+' },
  { label: 'MetaQTL', value: '1,300+' },
  { label: 'Epistatic QTL', value: '200+' },
  { label: 'Wheat species', value: '8' },
]

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-2xl border border-wheat-200 bg-gradient-to-br from-wheat-100 to-white shadow-sm dark:border-wheat-700 dark:from-wheat-800 dark:to-wheat-900">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div className="p-8">
            <div className="mb-3 flex items-center gap-2">
              <Wheat className="h-10 w-10 text-wheat-600" />
              <span className="badge">v3.0 · open source</span>
            </div>
            <h1 className="text-4xl font-bold text-wheat-900 dark:text-wheat-50">WheatQTLdb V3.0</h1>
            <p className="mt-2 max-w-xl text-wheat-700 dark:text-wheat-200">
              A modern, open-source rebuild of the manually curated database of <strong>QTL</strong>, <strong>metaQTL</strong> and{' '}
              <strong>epistatic QTL</strong> in <em>Triticum aestivum</em> and related wheat species.
              Browse, search, filter, visualise and export — all from a fast static site.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/data" className="btn-primary"><Database className="h-4 w-4" /> Browse data</Link>
              <Link to="/search" className="btn"><Search className="h-4 w-4" /> Advanced search</Link>
              <Link to="/statistics" className="btn"><BarChart3 className="h-4 w-4" /> Statistics</Link>
              <Link to="/tutorial" className="btn"><BookOpen className="h-4 w-4" /> Tutorial</Link>
              <a href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer" className="btn"><Github className="h-4 w-4" /> GitHub</a>
            </div>
          </div>
          <div className="relative h-56 w-full md:h-full">
            <img
              src="https://images.unsplash.com/photo-1535912559178-b1ed1bcb853a?w=1200&q=80"
              alt="Golden ears of wheat at sunset"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-wheat-100/70 to-transparent dark:from-wheat-900/60" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl font-bold text-wheat-700 dark:text-wheat-100">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-wheat-600 dark:text-wheat-300">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard icon={<Microscope className="h-6 w-6" />} title="QTL & MTA" body="Curated from interval mapping and GWAS across abiotic, biotic, yield, quality, biofortification and developmental traits." />
        <FeatureCard icon={<Sprout className="h-6 w-6" />} title="MetaQTL & Epistatic QTL" body="Consensus regions and epistatic interactions — vital for fine mapping, cloning and marker-assisted selection." />
        <FeatureCard icon={<Users className="h-6 w-6" />} title="Open & Citable" body="MIT-licensed code, CSV-based data layer. Cite the original WheatQTLdb papers and contribute new records via pull request." />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Browse by chromosome</h2>
        <p className="mt-1 text-sm text-wheat-700 dark:text-wheat-300">Jump straight into Advanced Search pre-filtered by a chromosome.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHROMS.map((c) => (
            <Link
              key={c}
              to={`/search?chromosome=${c}`}
              className="rounded-md border border-wheat-300 bg-wheat-50 px-3 py-1 text-sm font-medium text-wheat-800 hover:bg-wheat-200 dark:border-wheat-600 dark:bg-wheat-800 dark:text-wheat-100 dark:hover:bg-wheat-700"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">What's new in V3.0</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-wheat-800 dark:text-wheat-200">
          <li>Fully static, free hosting on GitHub Pages — no server, no MySQL.</li>
          <li>Modern responsive UI with dark mode.</li>
          <li>Powerful client-side search, sort, filter and CSV export across all tables.</li>
          <li>Interactive charts for trait, species, chromosome and year-wise distributions.</li>
          <li>CSV-based data layer — drop new files into <code>public/data/</code> and redeploy.</li>
          <li>Open-source on GitHub — community pull requests welcome.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">How to cite</h2>
        <div className="mt-3 space-y-2 text-sm text-wheat-800 dark:text-wheat-200">
          <p>Singh, K., Saini, D.K., Saripalli, G. et al. <em>WheatQTLdb V2.0: a supplement to the database for wheat QTL.</em> Mol Breeding 42, 56 (2022). <a className="underline" href="https://doi.org/10.1007/s11032-022-01329-1" target="_blank" rel="noreferrer">doi:10.1007/s11032-022-01329-1</a></p>
          <p>Singh K, Batra R, Sharma S, et al. <em>WheatQTLdb: a QTL database for wheat.</em> Mol Genet Genomics 296, 1051–1056 (2021). <a className="underline" href="https://doi.org/10.1007/s00438-021-01796-9" target="_blank" rel="noreferrer">doi:10.1007/s00438-021-01796-9</a></p>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-wheat-700 dark:text-wheat-100">{icon}<h3 className="font-semibold">{title}</h3></div>
      <p className="mt-2 text-sm text-wheat-700 dark:text-wheat-300">{body}</p>
    </div>
  )
}
