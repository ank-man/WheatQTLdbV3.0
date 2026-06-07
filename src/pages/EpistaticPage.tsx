import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { EpistaticRecord } from '../lib/types'

const columns: ColumnDef<EpistaticRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'qtl1', header: 'QTL 1' },
  { accessorKey: 'chromosome1', header: 'Chr 1' },
  { accessorKey: 'qtl2', header: 'QTL 2' },
  { accessorKey: 'chromosome2', header: 'Chr 2' },
  { accessorKey: 'interaction_type', header: 'Interaction' },
  { accessorKey: 'pve', header: 'PVE' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.reference}</a> : r.reference
    },
  },
]

export default function EpistaticPage() {
  const { data, loading, error } = useCSV<EpistaticRecord>('epistatic.csv')
  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="Epistatic QTL"
        subtitle="QTL × QTL interactions reported in the literature."
        image="wheat-herbarium.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_epistatic.csv" />
      </AsyncBoundary>
    </div>
  )
}
