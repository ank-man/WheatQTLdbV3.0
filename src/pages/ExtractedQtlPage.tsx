import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'

/** A QTL / MTA read automatically from a table of an open-access paper that
 *  has not been curated. See scripts/mine/extract_qtl_tables.py. */
export interface ExtractedQtl {
  id: string
  species: string
  trait: string
  qtl_name: string
  chromosome: string
  position_interval: string
  associated_markers: string
  pve: string
  lod: string
  p_value: string
  environment: string
  method: string
  reference: string
  doi: string
  pmcid: string
  year: string
  source_table: string
}

const columns: ColumnDef<ExtractedQtl, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'trait', header: 'Trait (as printed)' },
  { accessorKey: 'qtl_name', header: () => <GlossaryHeader label="QTL / MTA" term="mta" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position_interval', header: 'Position (as printed)' },
  { accessorKey: 'associated_markers', header: () => <GlossaryHeader label="Markers" term="associated_markers" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  { accessorKey: 'lod', header: () => <GlossaryHeader label="LOD" term="lod" /> },
  { accessorKey: 'p_value', header: 'P-value' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'source_table',
    header: 'Source table',
    cell: ({ row }) => {
      const r = row.original
      return (
        <a className="underline" target="_blank" rel="noreferrer"
           href={`https://europepmc.org/article/PMC/${r.pmcid}`} title="Open the paper to check this record">
          {r.source_table}
        </a>
      )
    },
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const label = <span className="block truncate" style={{ maxWidth: 380 }} title={r.reference}>{r.reference}</span>
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{label}</a> : label
    },
  },
]

export default function ExtractedQtlPage() {
  const { data, loading, error } = useCSV<ExtractedQtl>('extracted_qtl.csv')
  const papers = useMemo(() => new Set(data.map((r) => r.pmcid)).size, [data])
  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="Automatically extracted QTL"
        subtitle="QTL and marker–trait associations read by software from the tables of open-access papers that are not yet curated."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="card mb-4 flex gap-3 border-amber-300 bg-amber-50 text-sm text-wheat-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <p>
            <strong>Unverified.</strong> These {data.length.toLocaleString()} records from{' '}
            {papers.toLocaleString()} papers were extracted automatically; no curator has checked them against
            the paper. A trait may be an abbreviation or a table caption, a position may be in cM or bp without
            its unit, and a table may list suggestive as well as significant loci. Each record names the table
            it came from so that it can be checked. They are not part of the WheatQTLdb QTL counts or
            statistics until a curator has verified them.
          </p>
        </div>
        <DataTable data={data} columns={columns} filename="wheatqtldb_extracted_unverified.csv" pageSize={50} />
      </AsyncBoundary>
    </div>
  )
}
