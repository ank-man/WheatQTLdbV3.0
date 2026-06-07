import PageHeader from '../components/PageHeader'

export default function Tutorial() {
  return (
    <div>
      <PageHeader title="Tutorial" subtitle="How to use WheatQTLdb V3.0" />
      <div className="space-y-6 text-wheat-800 dark:text-wheat-200">
        <Step n={1} title="Browse a dataset">
          Open <strong>Data</strong> from the menu and pick QTL, MetaQTL, Epistatic QTL or Candidate Genes.
          Each table supports column sorting, full-text search and pagination.
        </Step>
        <Step n={2} title="Search & filter">
          Use the search box at the top of each table to filter across all columns. Click any column header to sort.
        </Step>
        <Step n={3} title="Export">
          Click <strong>Export CSV</strong> to download the currently filtered rows. Useful for downstream analysis in R / Python / Excel.
        </Step>
        <Step n={4} title="Statistics">
          The <strong>Statistics</strong> page renders interactive charts: distribution by trait, species, chromosome and publication year.
        </Step>
        <Step n={5} title="Contribute new data">
          Open a pull request on GitHub adding rows to the appropriate <code>public/data/*.csv</code> file. See the README for the schema.
        </Step>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="card flex gap-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-wheat-600 font-bold text-white">{n}</div>
      <div>
        <h3 className="font-semibold text-wheat-900 dark:text-wheat-50">{title}</h3>
        <p className="mt-1 text-sm">{children}</p>
      </div>
    </div>
  )
}
