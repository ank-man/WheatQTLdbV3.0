import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import CandidateGeneCell from '../components/CandidateGeneCell'
import { useCSV } from '../lib/useCSV'
import { GwasAtlasRecord } from '../lib/types'

const columns: ColumnDef<GwasAtlasRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  {
    accessorKey: 'position',
    header: 'Position (bp)',
    cell: ({ getValue }) => <span className="tabular-nums">{Number(getValue()).toLocaleString()}</span>,
  },
  { accessorKey: 'p_value', header: 'P-value' },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  {
    accessorKey: 'candidate_gene',
    header: () => <GlossaryHeader label="Cand. Gene" term="candidate_gene" />,
    cell: ({ getValue }) => <CandidateGeneCell value={getValue()} />,
  },
  { accessorKey: 'condition', header: 'Condition' },
  { accessorKey: 'population', header: () => <GlossaryHeader label="Population" term="population" /> },
  { accessorKey: 'sample_size', header: 'N' },
  { accessorKey: 'method', header: () => <GlossaryHeader label="Method" term="method" /> },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = r.doi ? `https://doi.org/${r.doi}` : r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : null
      const label = (
        <span className="block truncate" style={{ maxWidth: 420 }} title={r.reference}>{r.reference || r.doi || r.pmid}</span>
      )
      return url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{label}</a> : label
    },
  },
]

export default function GwasAtlasPage() {
  const { data, loading, error } = useCSV<GwasAtlasRecord>('gwas_atlas.csv')
  const stats = useMemo(() => ({
    publications: new Set(data.map((r) => r.pmid)).size,
    traits: new Set(data.map((r) => r.trait)).size,
  }), [data])

  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="GWAS Atlas associations"
        subtitle="Wheat marker–trait associations curated by GWAS Atlas from publications not already in WheatQTLdb, each with a physical position on IWGSC RefSeq v1.0."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="card mb-4 text-sm text-wheat-700">
          <strong className="text-wheat-900">{data.length.toLocaleString()}</strong> associations for{' '}
          {stats.traits.toLocaleString()} traits from {stats.publications.toLocaleString()} publications.
          These records are imported, not curated here: they are kept as their own table and are not
          part of the WheatQTLdb QTL counts or trait statistics. Source:{' '}
          <a className="inline-flex items-center gap-1 underline" href="https://ngdc.cncb.ac.cn/gwas/"
             target="_blank" rel="noreferrer">GWAS Atlas <ExternalLink className="h-3 w-3" /></a>{' '}
          (Tian et al. 2020, <em>Nucleic Acids Research</em> 48:D927) — please cite it, and the original
          publication, when using them.
        </div>
        <DataTable data={data} columns={columns} filename="wheatqtldb_gwas_atlas.csv" pageSize={50} />
      </AsyncBoundary>
    </div>
  )
}
