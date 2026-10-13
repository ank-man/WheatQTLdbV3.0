import { useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'

/** A paper found in the literature that has not been curated into the database. */
export interface PendingStudy {
  year: string
  title: string
  authors: string
  journal: string
  study_type: string
  /** "title" when the title itself reports mapping work, else "abstract". */
  mapping_in: string
  trait_hint: string
  doi: string
  pmid: string
  open_access: string
  in_gwas_atlas: string
  preprint: string
  url: string
}

const columns: ColumnDef<PendingStudy, any>[] = [
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      const r = row.original
      return (
        <a className="block truncate underline" style={{ maxWidth: 560 }} title={r.title}
           href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
      )
    },
  },
  {
    accessorKey: 'authors',
    header: 'Authors',
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '')
      return <span className="block truncate" style={{ maxWidth: 200 }} title={v}>{v}</span>
    },
  },
  {
    accessorKey: 'journal',
    header: 'Journal',
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '')
      return <span className="block truncate" style={{ maxWidth: 200 }} title={v}>{v}</span>
    },
  },
  { accessorKey: 'study_type', header: 'Study type' },
  { accessorKey: 'trait_hint', header: 'Trait (from title)' },
  { accessorKey: 'open_access', header: 'Open access' },
]

export default function PendingStudiesPage() {
  const { data, loading, error } = useCSV<PendingStudy>('pending_studies.csv')
  const [strongOnly, setStrongOnly] = useState(true)
  const [type, setType] = useState('')

  const types = useMemo(() => Array.from(new Set(data.map((r) => r.study_type).filter(Boolean))).sort(), [data])
  const strong = useMemo(() => data.filter((r) => r.mapping_in === 'title').length, [data])
  const rows = useMemo(
    () => data.filter((r) => (!strongOnly || r.mapping_in === 'title') && (!type || r.study_type === type)),
    [data, strongOnly, type]
  )

  return (
    <div>
      <PageHero
        eyebrow="Curation"
        title="Studies awaiting curation"
        subtitle="Wheat QTL and GWAS papers found in the literature that are not yet in WheatQTLdb."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="card mb-4 text-sm text-wheat-700">
          <p>
            <strong className="text-wheat-900">{data.length.toLocaleString()}</strong> candidate papers
            from a Europe PMC search, of which{' '}
            <strong className="text-wheat-900">{strong.toLocaleString()}</strong> report QTL or GWAS work in
            their title. This is a list of papers, not of QTL: no record has been extracted from them, and
            they are not part of any QTL count or statistic on this site. A paper is listed because its
            title or abstract mentions mapping work in wheat, so each still has to be read by a curator.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={strongOnly} onChange={(e) => setStrongOnly(e.target.checked)} />
              Only papers naming QTL / GWAS in the title
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-wheat-600">Study type</span>
              <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <span className="ml-auto text-xs text-wheat-500">{rows.length.toLocaleString()} shown</span>
          </div>
        </div>
        <DataTable data={rows} columns={columns} filename="wheatqtldb_studies_awaiting_curation.csv" pageSize={50} />
      </AsyncBoundary>
    </div>
  )
}
