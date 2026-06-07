import { ColumnDef } from '@tanstack/react-table'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { CandidateGeneRecord } from '../lib/types'

const columns: ColumnDef<CandidateGeneRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'gene', header: 'Gene' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position', header: 'Position' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'qtl_name', header: 'QTL' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.reference}</a> : r.reference
    },
  },
]

export default function CandidateGenesPage() {
  const { data, loading, error } = useCSV<CandidateGeneRecord>('candidate_genes.csv')
  return (
    <div>
      <PageHeader title="Candidate Genes" subtitle="Genes underlying QTL regions." />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_candidate_genes.csv" />
      </AsyncBoundary>
    </div>
  )
}
