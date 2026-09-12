import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { CandidateGeneRecord } from '../lib/types'

const columns: ColumnDef<CandidateGeneRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'gene', header: () => <GlossaryHeader label="Gene" term="candidate_gene" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position', header: () => <GlossaryHeader label="Position" term="position_interval" /> },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'qtl_name', header: () => <GlossaryHeader label="QTL" term="qtl" /> },
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
      <PageHero
        eyebrow="Data"
        title="Candidate Genes"
        subtitle="Genes underlying QTL regions, reported in the literature."
        image="botanical-illustration.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_candidate_genes.csv" />
      </AsyncBoundary>
    </div>
  )
}
