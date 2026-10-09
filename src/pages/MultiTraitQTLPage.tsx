import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'
import { isMultiTraitQTL, multiTraitList } from '../lib/map'

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  {
    accessorKey: 'parameter',
    header: () => <GlossaryHeader label="Co-mapped parameters/traits" term="parameter" />,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {multiTraitList(row.original).map((item, i) => (
          <span key={i} className="badge">{item}</span>
        ))}
      </div>
    ),
  },
  { accessorKey: 'qtl_name', header: () => <GlossaryHeader label="QTL / MTA" term="mta" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position_interval', header: () => <GlossaryHeader label="Position / Interval" term="position_interval" /> },
  { accessorKey: 'associated_markers', header: () => <GlossaryHeader label="Markers" term="associated_markers" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  { accessorKey: 'candidate_gene', header: () => <GlossaryHeader label="Cand. Gene" term="candidate_gene" /> },
  { accessorKey: 'method', header: () => <GlossaryHeader label="Method" term="method" /> },
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

export default function MultiTraitQTLPage() {
  const { data, loading, error } = useCSV<QTLRecord>('qtl.csv')
  const multiTrait = useMemo(() => data.filter(isMultiTraitQTL), [data])

  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="Multi-trait (pleiotropic) QTL"
        subtitle="QTL/MTA loci reported against two or more co-mapped traits or parameters in the same study - e.g. a single locus affecting both grain Zn and Fe content, or both heading date and flowering date."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <p className="mb-4 text-sm text-wheat-600">
          <span className="font-semibold text-wheat-900">{multiTrait.length.toLocaleString()}</span> of{' '}
          {data.length.toLocaleString()} QTL/MTA records report two or more <em>distinct</em> traits for the
          same locus. Trait&nbsp;&times;&nbsp;environment repeats of one trait are counted once, and
          study-wide trait panels — a list of everything a study phenotyped, recorded against every
          marker — are excluded, since those describe the experiment rather than the locus.
        </p>
        <DataTable data={multiTrait} columns={columns} filename="wheatqtldb_multitrait_qtl.csv" />
      </AsyncBoundary>
    </div>
  )
}
