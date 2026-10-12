import { useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { GitBranch, Info, ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import LinkageMapViewer, { MapLocus } from '../components/LinkageMapViewer'
import { useCSV } from '../lib/useCSV'
import { grainGenesSearchUrl, doiUrl } from '../lib/externalLinks'

interface MapRecord {
  map_id: string
  name: string
  source: string
  species: string
  population: string
  n_linkage_groups: string
  n_loci: string
  length_cm: string
  marker_types: string
  year: string
  reference: string
  doi: string
}

const columns: ColumnDef<MapRecord, any>[] = [
  { accessorKey: 'name', header: 'Map' },
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'population', header: 'Population' },
  { accessorKey: 'n_linkage_groups', header: 'LGs' },
  { accessorKey: 'n_loci', header: 'Loci' },
  { accessorKey: 'length_cm', header: 'Length (cM)' },
  { accessorKey: 'marker_types', header: 'Marker types' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ getValue }) => <span className="badge">{String(getValue() ?? '')}</span>,
  },
  {
    accessorKey: 'doi',
    header: 'Reference',
    cell: ({ row }) => {
      const u = doiUrl(row.original.doi)
      return u
        ? <a className="inline-flex items-center gap-1 underline" href={u} target="_blank" rel="noreferrer">
            paper <ExternalLink className="h-3 w-3" />
          </a>
        : <span className="text-wheat-400">—</span>
    },
  },
]

export default function LinkageMapsPage() {
  const maps = useCSV<MapRecord>('maps.csv')
  const loci = useCSV<MapLocus & { map_id: string }>('map_loci.csv')
  const [selected, setSelected] = useState<string | null>(null)
  const [lg, setLg] = useState<string | null>(null)

  const byMap = useMemo(() => {
    const m = new Map<string, MapLocus[]>()
    loci.data.forEach((l) => {
      const id = (l as any).map_id
      if (!m.has(id)) m.set(id, [])
      m.get(id)!.push(l)
    })
    return m
  }, [loci.data])

  const active = selected ?? maps.data.find((m) => byMap.has(m.map_id))?.map_id ?? null
  const activeMap = maps.data.find((m) => m.map_id === active) ?? null
  const activeLoci = active ? byMap.get(active) ?? [] : []

  const stats = useMemo(() => ({
    maps: maps.data.length,
    withLoci: maps.data.filter((m) => byMap.has(m.map_id)).length,
    loci: loci.data.length,
    sources: new Set(maps.data.map((m) => m.source)).size,
  }), [maps.data, loci.data, byMap])

  return (
    <div>
      <PageHero
        eyebrow="Data"
        title="Genetic & linkage maps"
        subtitle="Marker-order maps underlying the mapped QTL, drawn from the published literature rather than any single repository, so maps from any study can sit alongside each other."
        variant="side"
      />

      <AsyncBoundary loading={maps.loading || loci.loading} error={maps.error ?? loci.error}>
        {maps.data.length === 0 ? (
          <div className="card flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-wheat-500" />
            <div className="text-sm text-wheat-700">
              <p className="font-semibold text-wheat-900">No linkage maps loaded yet.</p>
              <p className="mt-1">
                Run <code>scripts/mine/search_wheat_maps.py</code>, then{' '}
                <code>scripts/mine/harvest_map_tables.py</code> and{' '}
                <code>scripts/mine/extract_wheat_maps.py</code> to build them from the
                literature.
              </p>
              <p className="mt-2">
                GrainGenes holds 4,756 maps but serves them behind bot protection, so they are
                not harvested automatically — browse them at{' '}
                <a className="underline" href="https://graingenes.org/GG3/maps-short"
                   target="_blank" rel="noreferrer">GrainGenes Maps</a>.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <Stat label="Maps" value={stats.maps} />
              <Stat label="With marker order" value={stats.withLoci} />
              <Stat label="Mapped loci" value={stats.loci} />
              <Stat label="Sources" value={stats.sources} />
            </div>

            {activeMap && activeLoci.length > 0 && (
              <div className="card mb-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold text-wheat-900">
                    <GitBranch className="h-4 w-4" /> {activeMap.name}
                  </h3>
                  <span className="text-xs text-wheat-500">
                    {activeMap.population} · {activeMap.n_loci} loci · {activeMap.source}
                  </span>
                </div>
                <LinkageMapViewer
                  loci={activeLoci}
                  name={activeMap.name}
                  focusGroup={lg}
                  onFocusGroup={setLg}
                />
              </div>
            )}

            <div className="card mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium uppercase tracking-wider text-wheat-600">Map</label>
              <select className="input w-auto" value={active ?? ''}
                      onChange={(e) => { setSelected(e.target.value); setLg(null) }}>
                {maps.data.map((m) => (
                  <option key={m.map_id} value={m.map_id} disabled={!byMap.has(m.map_id)}>
                    {m.name}{byMap.has(m.map_id) ? '' : ' (metadata only)'}
                  </option>
                ))}
              </select>
              <a className="btn ml-auto text-xs" target="_blank" rel="noreferrer"
                 href={grainGenesSearchUrl('wheat genetic map') ?? 'https://graingenes.org/GG3/maps-short'}>
                <ExternalLink className="h-3.5 w-3.5" /> More maps at GrainGenes
              </a>
            </div>

            <DataTable data={maps.data} columns={columns} filename="wheatqtldb_maps.csv" pageSize={25} />
          </>
        )}
      </AsyncBoundary>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex flex-col items-center justify-center py-5 text-center">
      <span className="text-2xl font-bold text-wheat-800">{value.toLocaleString()}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-wheat-600">{label}</span>
    </div>
  )
}
