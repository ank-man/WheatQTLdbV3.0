import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'parameter', header: () => <GlossaryHeader label="Parameter" term="parameter" /> },
  { accessorKey: 'qtl_name', header: () => <GlossaryHeader label="QTL / MTA" term="mta" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position_interval', header: () => <GlossaryHeader label="Position / Interval" term="position_interval" /> },
  { accessorKey: 'associated_markers', header: () => <GlossaryHeader label="Markers" term="associated_markers" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  { accessorKey: 'candidate_gene', header: () => <GlossaryHeader label="Cand. Gene" term="candidate_gene" /> },
  { accessorKey: 'method', header: () => <GlossaryHeader label="Method" term="method" /> },
  { accessorKey: 'cross', header: () => <GlossaryHeader label="Cross" term="cross" /> },
  { accessorKey: 'population', header: () => <GlossaryHeader label="Population" term="population" /> },
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
