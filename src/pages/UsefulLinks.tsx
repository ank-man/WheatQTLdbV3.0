import { ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'

interface Resource {
  name: string
  url: string
  desc: string
  logo: string
  category: 'Database' | 'Browser' | 'Programme' | 'Portal'
}

const resources: Resource[] = [
  {
    name: 'GrainGenes',
    url: 'https://wheat.pw.usda.gov/GG3/',
    desc: 'USDA-ARS database for Triticeae and Avena — genetic stocks, maps, markers, and sequences.',
    logo: '/images/logos/graingenes.svg',
    category: 'Database'
  },
  {
    name: 'Ensembl Plants',
    url: 'https://plants.ensembl.org/Triticum_aestivum/Info/Index',
    desc: 'EMBL-EBI genome browser for wheat — gene annotation, variation, and comparative genomics.',
    logo: '/images/logos/ensembl.svg',
    category: 'Browser'
  },
  {
    name: 'Gramene',
    url: 'https://www.gramene.org/',
    desc: 'Comparative resource for plants — curated pathways, ontologies, and cross-species analysis.',
    logo: '/images/logos/gramene.svg',
    category: 'Database'
  },
  {
    name: 'CIMMYT',
    url: 'https://www.cimmyt.org/',
    desc: 'International Maize and Wheat Improvement Center — global wheat breeding and germplasm.',
    logo: '/images/logos/cimmyt.svg',
    category: 'Programme'
  },
  {
    name: 'URGI / INRAE',
    url: 'https://wheat-urgi.versailles.inra.fr/',
    desc: 'INRAE wheat genomics portal — physical maps, SNPs, GWAS, and genomic selection tools.',
    logo: '/images/logos/inrae.svg',
    category: 'Database'
  },
  {
    name: 'WheatIS',
    url: 'https://wheatis.org/',
    desc: 'Wheat Information System — federated search across global wheat data repositories.',
    logo: '/images/logos/wheatis.svg',
    category: 'Portal'
  },
  {
    name: 'WheatQTLdb V2.0',
    url: 'http://wheatqtldb.net',
    desc: 'Original PHP/MySQL database (2006–2024) maintained at CCS University, Meerut.',
    logo: '/images/logos/wheatqtldb.svg',
    category: 'Database'
  },
]

const categoryColors: Record<Resource['category'], string> = {
  Database: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  Browser: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  Programme: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  Portal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-xl border border-wheat-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-wheat-400 dark:border-wheat-700 dark:bg-wheat-800/50"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg bg-wheat-50 p-2 dark:bg-wheat-900/50">
            <img
              src={resource.logo}
              alt={`${resource.name} logo`}
              className="h-full w-full object-contain"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden flex h-full w-full items-center justify-center">
              <span className="text-lg font-bold text-wheat-600">{resource.name.slice(0, 2)}</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-wheat-900 group-hover:text-wheat-700 dark:text-wheat-50 dark:group-hover:text-wheat-300">
              {resource.name}
            </h3>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${categoryColors[resource.category]}`}>
              {resource.category}
            </span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-wheat-400 transition-colors group-hover:text-wheat-600 dark:text-wheat-600 dark:group-hover:text-wheat-400" />
      </div>
      <p className="text-sm leading-relaxed text-wheat-700 dark:text-wheat-300">
        {resource.desc}
      </p>
    </a>
  )
}

export default function UsefulLinks() {
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Resources"
        title="Useful Links"
        subtitle="Allied wheat-genomics databases, genome browsers and breeding programmes."
        image="hero-wheat.jpg"
        variant="side"
      />

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-wheat-900 dark:text-wheat-50">Partner Resources</h2>
          <span className="text-sm text-wheat-600 dark:text-wheat-400">{resources.length} resources</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.url} resource={r} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-wheat-200 bg-gradient-to-br from-wheat-50 to-white p-6 dark:border-wheat-700 dark:from-wheat-900/30 dark:to-wheat-900/10">
        <h3 className="mb-3 font-semibold text-wheat-900 dark:text-wheat-50">Suggest a Resource</h3>
        <p className="text-sm text-wheat-700 dark:text-wheat-300">
          Know a wheat genomics resource we should list?{' '}
          <a href="/contact" className="font-medium underline hover:text-wheat-900 dark:hover:text-wheat-50">
            Contact us
          </a>{' '}
          with the URL and a brief description.
        </p>
      </section>
    </div>
  )
}
