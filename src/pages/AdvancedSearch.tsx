import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Filter, RotateCcw } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'
import { TRAIT_CATEGORIES, normalizeTrait } from '../lib/map'

interface Filters {
  q: string
  species: string
  trait: string
  chromosome: string
  pveMin: string
  pveMax: string
  hasCandidateGene: boolean
}

const EMPTY: Filters = {
  q: '', species: '', trait: '', chromosome: '',
  pveMin: '', pveMax: '', hasCandidateGene: false,
}

function uniqueValues<T>(rows: T[], key: keyof T): string[] {
  const set = new Set<string>()
  rows.forEach((r) => {
    const v = String((r as any)[key] ?? '').trim()
    if (v) set.add(v)
  })
  return Array.from(set).sort()
}

// Some records list more than one species in a single field, joined with
// ";" or "/" (interspecific-population studies). Split those out so the
// dropdown offers each real species exactly once instead of also listing
// every combined-string variant as its own separate (and mostly redundant)
// option; a record whose field contains a species still matches it via
// speciesMatches() below.
function uniqueSpecies<T>(rows: T[], key: keyof T): string[] {
  const set = new Set<string>()
  rows.forEach((r) => {
    String((r as any)[key] ?? '')
      .split(/[;/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => set.add(s))
  })
  return Array.from(set).sort()
}

function speciesMatches(fieldValue: string, selected: string): boolean {
  if (!selected) return true
  return fieldValue.split(/[;/]/).map((s) => s.trim()).includes(selected)
}

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'parameter', header: 'Parameter' },
  { accessorKey: 'qtl_name', header: 'QTL / MTA' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position_interval', header: 'Position / Interval' },
  { accessorKey: 'pve', header: 'PVE / R²' },
  { accessorKey: 'candidate_gene', header: 'Cand. Gene' },
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

export default function AdvancedSearch() {
  const { data, loading, error } = useCSV<QTLRecord>('qtl.csv')
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState<Filters>(() => {
    const next: Filters = { ...EMPTY }
    ;(Object.keys(EMPTY) as (keyof Filters)[]).forEach((k) => {
      const v = params.get(k as string)
      if (v !== null) (next[k] as any) = k === 'hasCandidateGene' ? v === '1' : v
    })
    return next
  })

  useEffect(() => {
    const next = new URLSearchParams()
    ;(Object.entries(f) as [keyof Filters, any][]).forEach(([k, v]) => {
      if (typeof v === 'boolean') { if (v) next.set(k as string, '1') }
      else if (v) next.set(k as string, String(v))
    })
    setParams(next, { replace: true })
  }, [f, setParams])

  const speciesOpts = useMemo(() => uniqueSpecies(data, 'species'), [data])
  // Real, non-redundant trait options: the fixed 16 canonical categories
  // (see TRAIT_CATEGORIES / normalizeTrait), not raw per-row trait strings -
  // those vary wildly in spelling/case/whitespace across source files and
  // occasionally contain a mis-shifted species value rather than a trait.
  const traitOpts = useMemo(() => {
    const present = new Set(data.map((r) => normalizeTrait(r)))
    return TRAIT_CATEGORIES.filter((cat) => present.has(cat))
  }, [data])
  const chrOpts = useMemo(() => uniqueValues(data, 'chromosome'), [data])

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const pMin = f.pveMin ? Number(f.pveMin) : -Infinity
    const pMax = f.pveMax ? Number(f.pveMax) : Infinity
    return data.filter((r) => {
      if (!speciesMatches(r.species, f.species)) return false
      if (f.trait && normalizeTrait(r) !== f.trait) return false
      if (f.chromosome && r.chromosome !== f.chromosome) return false
      const p = Number(r.pve)
      if (!Number.isNaN(p) && (p < pMin || p > pMax)) return false
      if (f.hasCandidateGene && !String(r.candidate_gene ?? '').trim()) return false
      if (q) {
        const blob = [r.qtl_name, r.trait, r.associated_markers, r.candidate_gene, r.reference, r.cross, r.population]
          .map((x) => String(x ?? '').toLowerCase()).join(' ')
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [data, f])

  const activeCount = Object.entries(f).filter(([, v]) => (typeof v === 'boolean' ? v : Boolean(v))).length

  return (
    <div>
      <PageHero
        eyebrow="Search"
        title="Advanced Search"
        subtitle="Combine free-text with multiple categorical and numeric filters across the curated QTL dataset."
        image="wheat-grains.jpg"
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="card mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4" /> Filters {activeCount > 0 && <span className="badge">{activeCount} active</span>}</h2>
            <button className="btn" onClick={() => setF(EMPTY)} disabled={activeCount === 0}>
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Free-text">
              <input className="input" placeholder="QTL name, marker, gene, reference…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            </Field>
            <Field label="Species">
              <Select value={f.species} onChange={(v) => setF({ ...f, species: v })} options={speciesOpts} />
            </Field>
            <Field label="Trait">
              <Select value={f.trait} onChange={(v) => setF({ ...f, trait: v })} options={traitOpts} />
            </Field>
            <Field label="Chromosome">
              <Select value={f.chromosome} onChange={(v) => setF({ ...f, chromosome: v })} options={chrOpts} />
            </Field>
            <Field label="PVE / R² (%)">
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="min" value={f.pveMin} onChange={(e) => setF({ ...f, pveMin: e.target.value })} />
                <input className="input" type="number" placeholder="max" value={f.pveMax} onChange={(e) => setF({ ...f, pveMax: e.target.value })} />
              </div>
            </Field>
            <Field label="Other">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.hasCandidateGene} onChange={(e) => setF({ ...f, hasCandidateGene: e.target.checked })} />
                Has candidate gene
              </label>
            </Field>
          </div>
        </div>

        <DataTable data={filtered} columns={columns} filename="wheatqtldb_search.csv" pageSize={50} />
      </AsyncBoundary>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-wheat-600 dark:text-wheat-300">{label}</div>
      {children}
    </label>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Any</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
