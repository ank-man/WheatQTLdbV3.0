import { useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { BookOpen, ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'
import DataTable from '../components/DataTable'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { PublicationRecord } from '../lib/types'

const columns: ColumnDef<PublicationRecord, any>[] = [
  { accessorKey: 'year', header: 'Year' },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      const r = row.original
      const label = r.title || r.url || r.doi
      const inner = (
        <span className="block truncate" style={{ maxWidth: 520 }} title={label}>
          {label}
        </span>
      )
      return r.url ? (
        <a className="underline" href={r.url} target="_blank" rel="noreferrer">{inner}</a>
      ) : inner
    },
  },
  {
    accessorKey: 'authors',
    header: 'Authors',
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '')
      return <span className="block truncate" style={{ maxWidth: 220 }} title={v}>{v}</span>
    },
  },
  {
    accessorKey: 'journal',
    header: 'Journal',
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '')
      return <span className="block truncate" style={{ maxWidth: 200 }} title={v}>{v}</span>
    },
  },
  {
    accessorKey: 'records',
    header: 'Records',
    cell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{Number(getValue() ?? 0).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'record_types',
    header: 'Contributes to',
    cell: ({ getValue }) => (
      <div className="flex flex-wrap gap-1">
        {String(getValue() ?? '').split('; ').filter(Boolean).map((t) => (
          <span key={t} className="badge">{t}</span>
        ))}
      </div>
    ),
  },
  { accessorKey: 'citations', header: 'Cited by' },
  {
    accessorKey: 'doi',
    header: 'DOI',
    cell: ({ getValue }) => {
      const d = String(getValue() ?? '')
      return d ? (
        <a className="inline-flex items-center gap-1 underline" href={`https://doi.org/${d}`}
           target="_blank" rel="noreferrer">
          {d.length > 28 ? d.slice(0, 28) + '…' : d} <ExternalLink className="h-3 w-3" />
        </a>
      ) : <span className="text-wheat-400">—</span>
    },
  },
]

export default function PublicationsPage() {
  const { data, loading, error } = useCSV<PublicationRecord>('publications.csv')
  const [decade, setDecade] = useState('')
  const [onlyResolved, setOnlyResolved] = useState(false)

  const stats = useMemo(() => {
    const years = data.map((r) => Number(r.year)).filter((y) => y > 1900)
    const resolved = data.filter((r) => r.title && !r.title.startsWith('[')).length
    return {
      total: data.length,
      resolved,
      records: data.reduce((s, r) => s + Number(r.records || 0), 0),
      span: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—',
    }
  }, [data])

  const decades = useMemo(() => {
    const s = new Set<string>()
    data.forEach((r) => {
      const y = Number(r.year)
      if (y > 1900) s.add(`${Math.floor(y / 10) * 10}s`)
    })
    return Array.from(s).sort()
  }, [data])

  const rows = useMemo(
    () =>
      data.filter((r) => {
        if (decade) {
          const y = Number(r.year)
          if (!(y > 1900) || `${Math.floor(y / 10) * 10}s` !== decade) return false
        }
        if (onlyResolved && (!r.title || r.title.startsWith('['))) return false
        return true
      }),
    [data, decade, onlyResolved]
  )

  return (
    <div>
      <PageHero
        eyebrow="Literature"
        title="Source publications"
        subtitle="Every study behind a record in this database, with the number of records it contributed. Bibliographic details are resolved from Crossref; please cite the original publication alongside this resource."
        variant="side"
      />

      <AsyncBoundary loading={loading} error={error}>
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Publications" value={stats.total.toLocaleString()} />
          <Stat label="With full metadata" value={stats.resolved.toLocaleString()} />
          <Stat label="Records attributed" value={stats.records.toLocaleString()} />
          <Stat label="Years covered" value={stats.span} />
        </div>

        <div className="card mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-wheat-600">Decade</span>
            <select className="input w-auto" value={decade} onChange={(e) => setDecade(e.target.value)}>
              <option value="">All</option>
              {decades.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyResolved}
                   onChange={(e) => setOnlyResolved(e.target.checked)} />
            Only publications with resolved metadata
          </label>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-wheat-500">
            <BookOpen className="h-3.5 w-3.5" />
            {rows.length.toLocaleString()} shown
          </span>
        </div>

        <DataTable data={rows} columns={columns} filename="wheatqtldb_publications.csv" pageSize={50} />

        <p className="mt-4 text-xs text-wheat-500">
          Some references in the curated tables were recorded as a publisher link rather than a DOI;
          those appear with the publisher host in place of a title and cannot be enriched. Record
          counts are attributed by matching the normalised DOI, so a paper cited under several link
          formats is counted once.
        </p>
      </AsyncBoundary>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-5 text-center">
      <span className="text-2xl font-bold text-wheat-800">{value}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-wheat-600">{label}</span>
    </div>
  )
}
