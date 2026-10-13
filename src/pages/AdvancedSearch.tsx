import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Filter, RotateCcw } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import GlossaryHeader from '../components/GlossaryHeader'
import CandidateGeneCell from '../components/CandidateGeneCell'
import { useCSV } from '../lib/useCSV'
import { QTLRecord } from '../lib/types'
import { TraitCategory } from '../lib/map'
import { TRAIT_CATEGORIES, TRAIT_SUBCATEGORIES, TRAIT_MAJOR_CLASSES, TRAIT_HIERARCHY,
  normalizeTrait, normalizeSubTrait, normalizeSpecies, isMultiTraitQTL, majorClassOf } from '../lib/map'

interface Filters {
  q: string
  species: string
  majorClass: string
  trait: string
  subTrait: string
  chromosome: string
  pveMin: string
  pveMax: string
  hasCandidateGene: boolean
  multiTraitOnly: boolean
}

const EMPTY: Filters = {
  q: '', species: '', majorClass: '', trait: '', subTrait: '', chromosome: '',
  pveMin: '', pveMax: '', hasCandidateGene: false, multiTraitOnly: false,
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
      .map((s) => normalizeSpecies(s))
      .filter(Boolean)
      .forEach((s) => set.add(s))
  })
  return Array.from(set).sort()
}

function speciesMatches(fieldValue: string, selected: string): boolean {
  if (!selected) return true
  return fieldValue.split(/[;/]/).map((s) => normalizeSpecies(s)).includes(selected)
}

// A QTL record with the classification the filters work on attached. The
// Trait filter, the Trait column and the Statistics page all read `category`,
// so a row that passes the filter always shows the trait that was selected.
// `trait` (the label typed in the source spreadsheet) is kept for free-text
// search and is in the CSV export.
type Row = QTLRecord & { category: TraitCategory; sub_trait: string }

const columns: ColumnDef<Row, any>[] = [
  { accessorKey: 'species', header: 'Species' },
  { accessorKey: 'category', header: () => <GlossaryHeader label="Trait" term="trait" /> },
  { accessorKey: 'parameter', header: () => <GlossaryHeader label="Parameter" term="parameter" /> },
  { accessorKey: 'qtl_name', header: () => <GlossaryHeader label="QTL / MTA" term="mta" /> },
  { accessorKey: 'chromosome', header: () => <GlossaryHeader label="Chr" term="chromosome" /> },
  { accessorKey: 'position_interval', header: () => <GlossaryHeader label="Position / Interval" term="position_interval" /> },
  { accessorKey: 'pve', header: () => <GlossaryHeader label="PVE / R²" term="pve" /> },
  {
    accessorKey: 'candidate_gene',
    header: () => <GlossaryHeader label="Cand. Gene" term="candidate_gene" />,
    cell: ({ getValue }) => <CandidateGeneCell value={getValue()} />,
  },
  { accessorKey: 'method', header: () => <GlossaryHeader label="Method" term="method" /> },
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => {
      const r = row.original
      const url = r.doi && r.doi.startsWith('http') ? r.doi : r.doi ? `https://doi.org/${r.doi}` : null
      return url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{r.reference || r.doi}</a> : (r.reference || '')
    },
  },
]

const BOOLEAN_FILTERS: (keyof Filters)[] = ['hasCandidateGene', 'multiTraitOnly']

export default function AdvancedSearch() {
  const { data: records, loading, error } = useCSV<QTLRecord>('qtl.csv')
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState<Filters>(() => {
    const next: Filters = { ...EMPTY }
    ;(Object.keys(EMPTY) as (keyof Filters)[]).forEach((k) => {
      const v = params.get(k as string)
      if (v !== null) (next[k] as any) = BOOLEAN_FILTERS.includes(k) ? v === '1' : v
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

  const data = useMemo<Row[]>(
    () => records.map((r) => ({ ...r, category: normalizeTrait(r), sub_trait: normalizeSubTrait(r) ?? '' })),
    [records]
  )

  const speciesOpts = useMemo(() => uniqueSpecies(data, 'species'), [data])
  // The trait options are the fixed categories (TRAIT_CATEGORIES), not raw
  // per-row trait strings, which vary in spelling/case across source files.
  // "Trait class" is the main trait of the curators' table and "Trait" its
  // sub-category, so the two dropdowns are a strict parent/child pair.
  const majorOpts = useMemo(() => {
    const present = new Set(data.map((r) => majorClassOf(r.category)))
    return TRAIT_MAJOR_CLASSES.filter((m) => present.has(m))
  }, [data])

  const traitOpts = useMemo(() => {
    const present = new Set(data.map((r) => r.category))
    const pool = f.majorClass
      ? TRAIT_HIERARCHY[f.majorClass as keyof typeof TRAIT_HIERARCHY] ?? []
      : TRAIT_CATEGORIES
    return pool.filter((cat) => present.has(cat))
  }, [data, f.majorClass])
  const chrOpts = useMemo(() => uniqueValues(data, 'chromosome'), [data])

  // Only offered when the selected Trait has a further breakdown (see
  // TRAIT_SUBCATEGORIES) - Biofortification -> Zn/Fe/Se, Nutrient use
  // efficiency -> N/P/K - and only the values present in the data.
  const subTraitOpts = useMemo(() => {
    const options = TRAIT_SUBCATEGORIES[f.trait as keyof typeof TRAIT_SUBCATEGORIES]
    if (!options) return []
    const present = new Set(data.filter((r) => r.category === f.trait).map((r) => r.sub_trait))
    return options.filter((o) => present.has(o))
  }, [data, f.trait])

  // A filter value that is not one of its dropdown's options (an old bookmark,
  // a link from before the trait classes were renamed) would otherwise keep
  // filtering while the dropdown reads "Any" - a result count that matches
  // nothing on screen. Drop any such value once the data has loaded.
  useEffect(() => {
    if (!data.length) return
    const stale: Partial<Filters> = {}
    if (f.majorClass && !(majorOpts as readonly string[]).includes(f.majorClass)) stale.majorClass = ''
    if (f.trait && !(traitOpts as readonly string[]).includes(f.trait)) stale.trait = ''
    if (f.subTrait && !subTraitOpts.includes(f.subTrait)) stale.subTrait = ''
    if (f.species && !speciesOpts.includes(f.species)) stale.species = ''
    if (f.chromosome && !chrOpts.includes(f.chromosome)) stale.chromosome = ''
    if (Object.keys(stale).length) setF((prev) => ({ ...prev, ...stale }))
  }, [data.length, f, majorOpts, traitOpts, subTraitOpts, speciesOpts, chrOpts])

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const pveActive = f.pveMin !== '' || f.pveMax !== ''
    const pMin = f.pveMin !== '' ? Number(f.pveMin) : -Infinity
    const pMax = f.pveMax !== '' ? Number(f.pveMax) : Infinity
    return data.filter((r) => {
      if (!speciesMatches(r.species, f.species)) return false
      if (f.majorClass && majorClassOf(r.category) !== f.majorClass) return false
      if (f.trait && r.category !== f.trait) return false
      if (f.subTrait && r.sub_trait !== f.subTrait) return false
      if (f.chromosome && r.chromosome !== f.chromosome) return false
      if (pveActive) {
        // A record with no PVE, or one that is not a single number, cannot be
        // said to fall inside the range, so it is not shown when a range is set.
        const raw = String(r.pve ?? '').trim()
        const p = Number(raw)
        if (raw === '' || Number.isNaN(p) || p < pMin || p > pMax) return false
      }
      if (f.hasCandidateGene && !String(r.candidate_gene ?? '').trim()) return false
      if (f.multiTraitOnly && !isMultiTraitQTL(r)) return false
      if (q) {
        const blob = [r.qtl_name, r.category, r.trait, r.parameter, r.associated_markers, r.candidate_gene, r.reference, r.cross, r.population]
          .map((x) => String(x ?? '').toLowerCase()).join(' ')
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [data, f])

  // What the current result is made of, by trait - so the count can be read
  // against the Statistics page and it is visible that a trait filter left
  // only that trait.
  const breakdown = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + 1))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const activeCount = Object.entries(f).filter(([, v]) => (typeof v === 'boolean' ? v : Boolean(v))).length

  return (
    <div>
      <PageHero
        eyebrow="Search"
        title="Advanced Search"
        subtitle="Combine free-text with multiple categorical and numeric filters across the curated QTL dataset."
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
              <input className="input" placeholder="QTL name, parameter, marker, gene, reference…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            </Field>
            <Field label="Species">
              <Select value={f.species} onChange={(v) => setF({ ...f, species: v })} options={speciesOpts} />
            </Field>
            <Field label="Trait class">
              <Select
                value={f.majorClass}
                onChange={(v) => setF({ ...f, majorClass: v, trait: '', subTrait: '' })}
                options={majorOpts as unknown as string[]}
              />
            </Field>
            <Field label="Trait">
              <Select value={f.trait} onChange={(v) => setF({ ...f, trait: v, subTrait: '' })} options={traitOpts} />
            </Field>
            {subTraitOpts.length > 0 && (
              <Field label="Sub-trait">
                <Select value={f.subTrait} onChange={(v) => setF({ ...f, subTrait: v })} options={subTraitOpts} />
              </Field>
            )}
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
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={f.hasCandidateGene} onChange={(e) => setF({ ...f, hasCandidateGene: e.target.checked })} />
                  Has candidate gene
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={f.multiTraitOnly} onChange={(e) => setF({ ...f, multiTraitOnly: e.target.checked })} />
                  Multi-trait (pleiotropic) QTL only
                </label>
              </div>
            </Field>
          </div>
        </div>

        <div className="mb-3 text-sm text-wheat-700">
          <strong className="text-wheat-900">{filtered.length.toLocaleString()}</strong> of{' '}
          {data.length.toLocaleString()} QTL records match
          {breakdown.length > 0 && breakdown.length <= 8 && (
            <span className="text-wheat-600">
              {': '}{breakdown.map(([name, n]) => `${name} ${n.toLocaleString()}`).join(' · ')}
            </span>
          )}
        </div>

        <DataTable data={filtered} columns={columns} filename="wheatqtldb_search.csv" pageSize={50} />
      </AsyncBoundary>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-wheat-600">{label}</div>
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
