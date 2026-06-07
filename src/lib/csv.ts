import Papa from 'papaparse'

const cache = new Map<string, unknown[]>()

export async function loadCSV<T>(path: string): Promise<T[]> {
  if (cache.has(path)) return cache.get(path) as T[]
  const url = `${import.meta.env.BASE_URL}data/${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  const text = await res.text()
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })
  if (parsed.errors.length) {
    console.warn(`CSV parse warnings for ${path}:`, parsed.errors.slice(0, 3))
  }
  const rows = (parsed.data as T[]).filter(Boolean)
  cache.set(path, rows as unknown[])
  return rows
}

export function toCSV<T extends object>(rows: T[]): string {
  return Papa.unparse(rows)
}

export function downloadCSV(filename: string, rows: object[]) {
  const csv = toCSV(rows as Record<string, unknown>[])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
