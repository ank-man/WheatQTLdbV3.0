import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Filter, RotateCcw } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'

interface Filters {
  q: string
  species: string
  trait_category: string
  trait: string
  chromosome: string
  method: string
  yearMin: string
  yearMax: string
  pveMin: string
  pveMax: string
  hasCandidateGene: boolean
}

const EMPTY: Filters = {
  q: '', species: '', trait_category: '', trait: '', chromosome: '', method: '',
  yearMin: '', yearMax: '', pveMin: '', pveMax: '', hasCandidateGene: false,
}

function uniqueValues<T>(rows: T[], key: keyof T): string[] {
  const set = new Set<string>()
  rows.forEach((r) => {
    const v = String((r as any)[key] ?? '').trim()
    if (v) set.add(v)
  })
  return Array.from(set).sort()
}

const columns: ColumnDef<QTLRecord, any>[] = [
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'trait_category', header: 'Category' },
  { accessorKey: 'trait', header: 'Trait' },
  { accessorKey: 'qtl_name', header: 'QTL' },
  { accessorKey: 'chromosome', header: 'Chr' },
  { accessorKey: 'position_cm', header: 'Pos (cM)' },
  { accessorKey: 'pve', header: 'PVE' },
  { accessorKey: 'candidate_gene', header: 'Cand. gene' },
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      return r.doi ? <a className="underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.reference}</a> : r.reference
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

  const speciesOpts = useMemo(() => uniqueValues(data, 'species'), [data])
  const categoryOpts = useMemo(() => uniqueValues(data, 'trait_category'), [data])
  const traitOpts = useMemo(
    () => uniqueValues(data.filter((r) => !f.trait_category || r.trait_category === f.trait_category), 'trait'),
    [data, f.trait_category],
  )
  const chrOpts = useMemo(() => uniqueValues(data, 'chromosome'), [data])
  const methodOpts = useMemo(() => uniqueValues(data, 'method'), [data])

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const yMin = f.yearMin ? Number(f.yearMin) : -Infinity
    const yMax = f.yearMax ? Number(f.yearMax) : Infinity
    const pMin = f.pveMin ? Number(f.pveMin) : -Infinity
    const pMax = f.pveMax ? Number(f.pveMax) : Infinity
    return data.filter((r) => {
      if (f.species && r.species !== f.species) return false
      if (f.trait_category && r.trait_category !== f.trait_category) return false
      if (f.trait && r.trait !== f.trait) return false
      if (f.chromosome && r.chromosome !== f.chromosome) return false
      if (f.method && r.method !== f.method) return false
      const y = Number(r.year)
      if (!Number.isNaN(y) && (y < yMin || y > yMax)) return false
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
            <Field label="Trait category">
              <Select value={f.trait_category} onChange={(v) => setF({ ...f, trait_category: v, trait: '' })} options={categoryOpts} />
            </Field>
            <Field label="Trait">
              <Select value={f.trait} onChange={(v) => setF({ ...f, trait: v })} options={traitOpts} />
            </Field>
            <Field label="Chromosome">
              <Select value={f.chromosome} onChange={(v) => setF({ ...f, chromosome: v })} options={chrOpts} />
            </Field>
            <Field label="Method">
              <Select value={f.method} onChange={(v) => setF({ ...f, method: v })} options={methodOpts} />
            </Field>
            <Field label="Year">
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="from" value={f.yearMin} onChange={(e) => setF({ ...f, yearMin: e.target.value })} />
                <input className="input" type="number" placeholder="to" value={f.yearMax} onChange={(e) => setF({ ...f, yearMax: e.target.value })} />
              </div>
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
