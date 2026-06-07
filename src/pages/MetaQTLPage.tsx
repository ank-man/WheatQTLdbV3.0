import { ColumnDef } from '@tanstack/react-table'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { MetaQTLRecord } from '../lib/types'

const columns: ColumnDef<MetaQTLRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait_category', header: 'Category' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'mqtl_name', header: 'MetaQTL' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position_cm', header: 'Pos (cM)' },
  { accessorKey: 'interval_cm', header: 'Interval (cM)' },
  { accessorKey: 'n_qtl', header: '# QTL' },
  { accessorKey: 'candidate_gene', header: 'Cand. gene' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.reference}</a> : r.reference
    },
  },
]

export default function MetaQTLPage() {
  const { data, loading, error } = useCSV<MetaQTLRecord>('metaqtl.csv')
  return (
    <div>
      <PageHeader title="MetaQTL" subtitle="Consensus QTL regions across studies." />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_metaqtl.csv" />
      </AsyncBoundary>
    </div>
  )
}
