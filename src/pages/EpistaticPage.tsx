import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { EpistaticRecord } from '../lib/types'

const columns: ColumnDef<EpistaticRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'parameter', header: () => <GlossaryHeader label="Parameter" term="parameter" /> },
  { accessorKey: 'qtl1', header: () => <GlossaryHeader label="QTL 1" term="epistatic" /> },
  { accessorKey: 'chromosome1', header: () => <GlossaryHeader label="Chr 1" term="chromosome" /> },
  { accessorKey: 'position_interval1', header: () => <GlossaryHeader label="Pos 1" term="position_interval" /> },
  { accessorKey: 'qtl2', header: () => <GlossaryHeader label="QTL 2" term="epistatic" /> },
  { accessorKey: 'chromosome2', header: () => <GlossaryHeader label="Chr 2" term="chromosome" /> },
  { accessorKey: 'position_interval2', header: () => <GlossaryHeader label="Pos 2" term="position_interval" /> },
  { accessorKey: 'lod', header: () => <GlossaryHeader label="LOD" term="lod" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  { accessorKey: 'method', header: () => <GlossaryHeader label="Method" term="method" /> },
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
