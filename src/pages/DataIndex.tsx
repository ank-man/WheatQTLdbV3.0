import { Link } from 'react-router-dom'
import { Database, GitBranch, Network, Dna } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const items = [
  { to: '/data/qtl', icon: Database, title: 'QTL', desc: 'QTL/MTA records from interval mapping and GWAS.' },
  { to: '/data/metaqtl', icon: GitBranch, title: 'MetaQTL', desc: 'Consensus QTL regions across studies.' },
  { to: '/data/epistatic', icon: Network, title: 'Epistatic QTL', desc: 'QTL × QTL interactions.' },
  { to: '/data/candidate-genes', icon: Dna, title: 'Candidate Genes', desc: 'Genes underlying QTL regions.' },
]

export default function DataIndex() {
  return (
    <div>
      <PageHeader title="Data" subtitle="Browse, search, sort and export." />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="card block transition hover:border-wheat-400">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-wheat-100 p-2 text-wheat-700 dark:bg-wheat-700 dark:text-wheat-100">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-lg font-semibold">{title}</div>
            </div>
            <p className="mt-2 text-sm text-wheat-700 dark:text-wheat-300">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
