import { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Dna, MapPin } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import { useCSV } from '../lib/useCSV'
import { CandidateGeneRecord } from '../lib/types'
import {
  grainGenesUrl, grainGenesSearchUrl, ensemblPlantsUrl, ensemblGeneUrl,
  ensemblSearchUrl, positionToBp, doiUrl,
} from '../lib/externalLinks'

// Which outbound link makes sense depends on what kind of identifier the
// curator recorded. GrainGenes holds curated gene SYMBOLS (Vrn-A1, Lr34) and
// has no record for an annotation gene model, so sending TraesCS5A02G391700
// there lands on an empty page. Gene models belong in Ensembl Plants. An
// InterPro domain description is not an identifier at all and gets no link.
const SYMBOLIC = new Set(['Gene symbol'])
const MODEL = new Set([
  'IWGSC gene model', 'IWGSC gene model (low confidence)',
  'Durum (Svevo) gene model', 'TGACv1 gene model', 'Other gene model',
])
import { DEFAULT_ASSEMBLY } from '../lib/assemblies'

const columns: ColumnDef<CandidateGeneRecord, any>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'gene',
    header: () => <GlossaryHeader label="Gene" term="candidate_gene" />,
    cell: ({ row }) => {
      const g = row.original.gene
      const kind = row.original.gene_type ?? ''
      const url = SYMBOLIC.has(kind)
        ? grainGenesUrl(g, 'gene')
        : MODEL.has(kind) ? (ensemblGeneUrl(g) ?? ensemblSearchUrl(g)) : null
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
  {
    accessorKey: 'gene_type',
    header: 'Identifier',
    cell: ({ getValue }) => <span className="badge text-[10px]">{String(getValue() ?? '')}</span>,
  },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  {
    accessorKey: 'records',
    header: 'Records',
    cell: ({ getValue }) => Number(getValue() ?? 0).toLocaleString(),
  },
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
      const kind = r.gene_type ?? ''
      const gg = SYMBOLIC.has(kind)
        ? (grainGenesUrl(r.gene, 'gene') ?? grainGenesSearchUrl(r.gene))
        : null
      const bp = positionToBp(r.position)
      const model = MODEL.has(kind) ? (ensemblGeneUrl(r.gene) ?? ensemblSearchUrl(r.gene)) : null
      const ens = model ?? (bp ? ensemblPlantsUrl(r.chromosome, bp) : null)
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
              <MapPin className="h-3 w-3" /> {model ? 'Ensembl' : 'Browser'}
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
        subtitle="Genes proposed as underlying a mapped QTL interval, collected from every record that names one, with the link that fits the identifier: GrainGenes for a curated gene symbol, Ensembl Plants for an annotation gene model."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <DataTable data={data} columns={columns} filename="wheatqtldb_candidate_genes.csv" />
        <p className="mt-4 text-xs text-wheat-500">
          The <em>Identifier</em> column states what kind of thing was recorded, because the three
          kinds are not interchangeable: a curated gene <strong>symbol</strong> has a GrainGenes
          record, an annotation <strong>gene model</strong> is a feature on one specific assembly
          release and is shown in Ensembl Plants, and a <strong>functional annotation</strong> (an
          InterPro domain description) is not an identifier at all and so carries no link.
        </p>
        <p className="mt-2 text-xs text-wheat-500">
          GrainGenes (USDA-ARS) is the curatorial home of wheat gene symbols, markers and maps and
          holds far more about each gene than this table. Positional browser links resolve against{' '}
          <strong>{DEFAULT_ASSEMBLY}</strong>, which is the assembly Ensembl Plants serves for{' '}
          <em>Triticum aestivum</em>; a position recorded against a different assembly is not
          linked, rather than being sent to the wrong coordinate.
        </p>
      </AsyncBoundary>
    </div>
  )
}
