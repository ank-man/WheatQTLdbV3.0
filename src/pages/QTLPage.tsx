import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'parameter', header: 'Parameter' },
  { accessorKey: 'qtl_name', header: 'QTL / MTA' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position_interval', header: 'Position / Interval' },
  { accessorKey: 'associated_markers', header: 'Markers' },
  { accessorKey: 'pve', header: 'PVE / R²' },
  { accessorKey: 'candidate_gene', header: 'Cand. Gene' },
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'cross', header: 'Cross' },
  { accessorKey: 'population', header: 'Population' },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = r.doi && r.doi.startsWith('http') ? r.doi : r.doi ? `https://doi.org/${r.doi}` : null
      return url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{r.reference || r.doi}</a> : (r.reference || '')
    },
  },
]

export default function QTLPage() {
  const { data, loading, error } = useCSV<QTLRecord>('qtl.csv')
  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="QTL / MTA"
        subtitle="QTL identified through interval mapping and marker–trait associations identified by GWAS."
        image="wheat-field-gbif.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_qtl.csv" />
      </AsyncBoundary>
    </div>
  )
}
