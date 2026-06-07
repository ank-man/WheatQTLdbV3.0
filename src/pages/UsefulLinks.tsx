import { ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'

const links = [
  { name: 'GrainGenes', url: 'https://wheat.pw.usda.gov/GG3/', desc: 'A database for Triticeae and Avena.' },
  { name: 'Ensembl Plants — Wheat', url: 'https://plants.ensembl.org/Triticum_aestivum/Info/Index', desc: 'Genome browser and comparative genomics.' },
  { name: 'WheatIS', url: 'https://wheatis.org/', desc: 'Wheat Information System portal.' },
  { name: 'CIMMYT', url: 'https://www.cimmyt.org/', desc: 'International Maize and Wheat Improvement Center.' },
  { name: 'URGI Wheat', url: 'https://wheat-urgi.versailles.inra.fr/', desc: 'INRAE wheat genomics resources.' },
  { name: 'Gramene', url: 'https://www.gramene.org/', desc: 'Comparative resource for plants.' },
  { name: 'Original WheatQTLdb (V2.0)', url: 'http://wheatqtldb.net', desc: 'Original PHP/MySQL site at CCS University.' },
]

export default function UsefulLinks() {
  return (
    <div>
      <PageHero
        eyebrow="Resources"
        title="Useful Links"
        subtitle="Allied wheat-genomics databases, genome browsers and breeding programmes."
        image="hero-wheat.jpg"
        variant="side"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="card block transition hover:border-wheat-400">
            <div className="flex items-center gap-2 font-semibold text-wheat-900 dark:text-wheat-50">
              {l.name} <ExternalLink className="h-3 w-3 opacity-60" />
            </div>
            <p className="mt-1 text-sm text-wheat-700 dark:text-wheat-300">{l.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
