import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { MetaQTLRecord } from '../lib/types'

const columns: ColumnDef<MetaQTLRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'parameter', header: () => <GlossaryHeader label="Parameter" term="parameter" /> },
  { accessorKey: 'mqtl_name', header: () => <GlossaryHeader label="MetaQTL" term="metaqtl" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position_interval', header: () => <GlossaryHeader label="Position / Interval" term="position_interval" /> },
  { accessorKey: 'associated_markers', header: () => <GlossaryHeader label="Markers" term="associated_markers" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  { accessorKey: 'candidate_gene', header: () => <GlossaryHeader label="Cand. Gene" term="candidate_gene" /> },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = r.doi && r.doi.startsWith('http') ? r.doi : r.doi ? `https://doi.org/${r.doi}` : null
      return url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{r.reference || r.doi}</a> : (r.reference || '')
    },
  },
]

export default function MetaQTLPage() {
  const { data, loading, error } = useCSV<MetaQTLRecord>('metaqtl.csv')
  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="MetaQTL"
        subtitle="Consensus QTL regions derived from meta-analysis across multiple studies."
        image="wheat-spring.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_metaqtl.csv" />
      </AsyncBoundary>
    </div>
  )
}
