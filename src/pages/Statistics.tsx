import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import AsyncBoundary from '../components/AsyncBoundary'
import { useCSV } from '../lib/useCSV'
import { QTLRecord, MetaQTLRecord, EpistaticRecord } from '../lib/types'

const COLORS = ['#cc9d3f', '#9a6628', '#7c4d24', '#d8b665', '#e7d29c', '#b88231', '#5e3a1f', '#3f2715']

function countBy<T>(rows: T[], key: keyof T): { name: string; value: number }[] {
  const map = new Map<string, number>()
  rows.forEach((r) => {
    const v = String((r as any)[key] ?? '').trim() || 'Unknown'
    map.set(v, (map.get(v) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export default function Statistics() {
  const qtl = useCSV<QTLRecord>('qtl.csv')
  const mqtl = useCSV<MetaQTLRecord>('metaqtl.csv')
  const epi = useCSV<EpistaticRecord>('epistatic.csv')

  const loading = qtl.loading || mqtl.loading || epi.loading
  const error = qtl.error ?? mqtl.error ?? epi.error

  const totals = [
    { name: 'QTL', value: qtl.data.length },
    { name: 'MetaQTL', value: mqtl.data.length },
    { name: 'Epistatic', value: epi.data.length },
  ]

  const bySpecies = useMemo(() => countBy(qtl.data, 'species'), [qtl.data])
  const byCategory = useMemo(() => countBy(qtl.data, 'trait_category'), [qtl.data])
  const byChrom = useMemo(() => countBy(qtl.data, 'chromosome'), [qtl.data])

  const byYear = useMemo(() => {
    const all: { year: string; QTL: number; MetaQTL: number; Epistatic: number }[] = []
    const merge = (key: 'QTL' | 'MetaQTL' | 'Epistatic', rows: { year?: number | string }[]) => {
      rows.forEach((r) => {
        const y = String(r.year ?? '').trim()
        if (!y) return
        let row = all.find((x) => x.year === y)
        if (!row) { row = { year: y, QTL: 0, MetaQTL: 0, Epistatic: 0 }; all.push(row) }
        row[key] += 1
      })
    }
    merge('QTL', qtl.data)
    merge('MetaQTL', mqtl.data)
    merge('Epistatic', epi.data)
    return all.sort((a, b) => Number(a.year) - Number(b.year))
  }, [qtl.data, mqtl.data, epi.data])

  return (
    <div>
      <PageHeader title="Statistics" subtitle="Interactive distributions across the database." />
      <AsyncBoundary loading={loading} error={error}>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Totals">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={totals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8b66533" />
                <XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="value" fill="#cc9d3f" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by species">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={bySpecies} dataKey="value" nameKey="name" outerRadius={90} label>
                  {bySpecies.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by trait category">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8b66533" />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="#9a6628" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="QTL by chromosome">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byChrom}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8b66533" />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis /><Tooltip />
                <Bar dataKey="value" fill="#7c4d24" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Publications per year" wide>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8b66533" />
                <XAxis dataKey="year" /><YAxis /><Tooltip /><Legend />
                <Line type="monotone" dataKey="QTL" stroke="#cc9d3f" strokeWidth={2} />
                <Line type="monotone" dataKey="MetaQTL" stroke="#9a6628" strokeWidth={2} />
                <Line type="monotone" dataKey="Epistatic" stroke="#7c4d24" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </AsyncBoundary>
    </div>
  )
}

function ChartCard({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`card ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="mb-3 font-semibold text-wheat-900 dark:text-wheat-50">{title}</h3>
      {children}
    </div>
  )
}
