import { ColumnDef } from '@tanstack/react-table'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait_category', header: 'Category' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'qtl_name', header: 'QTL' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position_cm', header: 'Pos (cM)' },
  { accessorKey: 'interval_cm', header: 'Interval (cM)' },
  { accessorKey: 'associated_markers', header: 'Markers' },
  { accessorKey: 'pve', header: 'PVE / R²' },
  { accessorKey: 'candidate_gene', header: 'Cand. gene' },
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'cross', header: 'Cross' },
  { accessorKey: 'population', header: 'Population' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.reference}</a> : r.reference
    },
  },
]

export default function QTLPage() {
  const { data, loading, error } = useCSV<QTLRecord>('qtl.csv')
  return (
    <div>
      <PageHeader title="QTL / MTA" subtitle="QTL identified through interval mapping and MTA from GWAS." />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_qtl.csv" />
      </AsyncBoundary>
    </div>
  )
}
