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
  { accessorKey: 'parameter', header: 'Parameter' },
  { accessorKey: 'qtl1', header: 'QTL 1' },
  { accessorKey: 'chromosome1', header: 'Chr 1' },
  { accessorKey: 'position_interval1', header: 'Pos 1' },
  { accessorKey: 'qtl2', header: 'QTL 2' },
  { accessorKey: 'chromosome2', header: 'Chr 2' },
  { accessorKey: 'position_interval2', header: 'Pos 2' },
  { accessorKey: 'lod', header: 'LOD' },
  { accessorKey: 'pve', header: 'PVE / R²' },
  { accessorKey: 'method', header: 'Method' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = r.doi && r.doi.startsWith('http') ? r.doi : r.doi ? `https://doi.org/${r.doi}` : null
      return url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{r.reference || r.doi}</a> : (r.reference || '')
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
