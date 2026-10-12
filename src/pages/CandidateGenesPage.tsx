import { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Dna, MapPin } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { CandidateGeneRecord } from '../lib/types'
import {
  grainGenesUrl, grainGenesSearchUrl, ensemblPlantsUrl, positionToBp, doiUrl,
} from '../lib/externalLinks'
import { DEFAULT_ASSEMBLY } from '../lib/assemblies'

const columns: ColumnDef<CandidateGeneRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'gene',
    header: () => <GlossaryHeader label="Gene" term="candidate_gene" />,
    cell: ({ row }) => {
      const g = row.original.gene
      const url = grainGenesUrl(g, 'gene') ?? grainGenesSearchUrl(g)
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium">{g}</span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" title={`Open ${g} in GrainGenes`}
               className="text-wheat-500 hover:text-wheat-800">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </span>
      )
    },
  },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  {
    accessorKey: 'position',
    header: () => <GlossaryHeader label="Position" term="position_interval" />,
    cell: ({ row }) => {
      const r = row.original
      const bp = positionToBp(r.position)
      const url = bp ? ensemblPlantsUrl(r.chromosome, bp) : null
      return (
        <span className="inline-flex items-center gap-1.5">
          {r.position || '—'}
          {url && (
            <a href={url} target="_blank" rel="noreferrer"
               title={`View ${r.chromosome}:${bp!.toLocaleString()} in Ensembl Plants (${DEFAULT_ASSEMBLY})`}
               className="text-wheat-500 hover:text-wheat-800">
              <MapPin className="h-3 w-3" />
            </a>
          )}
        </span>
      )
    },
  },
  { accessorKey: 'trait', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  {
    accessorKey: 'qtl_name',
    header: () => <GlossaryHeader label="QTL" term="qtl" />,
    cell: ({ row }) => {
      const q = row.original.qtl_name
      if (!q) return '—'
      const url = grainGenesUrl(q, 'qtl')
      return url ? (
        <a className="underline" href={url} target="_blank" rel="noreferrer" title="Open in GrainGenes">{q}</a>
      ) : q
    },
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = doiUrl(r.doi)
      return url
        ? <a className="underline" href={url} target="_blank" rel="noreferrer">{r.reference}</a>
        : r.reference
    },
  },
  {
    id: 'links',
    header: 'Resources',
    cell: ({ row }) => {
      const r = row.original
      const gg = grainGenesUrl(r.gene, 'gene') ?? grainGenesSearchUrl(r.gene)
      const bp = positionToBp(r.position)
      const ens = bp ? ensemblPlantsUrl(r.chromosome, bp) : null
      return (
        <div className="flex flex-wrap gap-1.5">
          {gg && (
            <a href={gg} target="_blank" rel="noreferrer"
               className="btn px-2 py-1 text-[11px]" title="Curated gene record at GrainGenes">
              <Dna className="h-3 w-3" /> GrainGenes
            </a>
          )}
          {ens && (
            <a href={ens} target="_blank" rel="noreferrer"
               className="btn px-2 py-1 text-[11px]" title="Genome browser at this position">
              <MapPin className="h-3 w-3" /> Browser
            </a>
          )}
        </div>
      )
    },
  },
]

export default function CandidateGenesPage() {
  const { data, loading, error } = useCSV<CandidateGeneRecord>('candidate_genes.csv')
  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="Candidate genes"
        subtitle="Genes proposed as underlying a mapped QTL interval, linked out to their curated GrainGenes record and, where a physical position is known, to a genome browser."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_candidate_genes.csv" />
        <p className="mt-4 text-xs text-wheat-500">
          GrainGenes (USDA-ARS) is the curatorial home of wheat gene symbols, markers and maps and
          holds far more about each gene than this table. Genome-browser links resolve against{' '}
          <strong>{DEFAULT_ASSEMBLY}</strong>, which is the assembly Ensembl Plants serves for{' '}
          <em>Triticum aestivum</em>; a position recorded against a different assembly is not
          linked, rather than being sent to the wrong coordinate.
        </p>
      </AsyncBoundary>
    </div>
  )
}
