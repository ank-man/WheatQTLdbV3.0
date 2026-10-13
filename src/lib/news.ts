import { useCSV } from './useCSV'

/**
 * One announcement on the site's News list.
 *
 * News is data, not code: add a row to public/data/news.csv
 * (date as YYYY-MM-DD, title, summary, optional site path or URL) whenever
 * records are added or a table is rebuilt, and it appears on the home page and
 * the News page on the next deploy.
 */
export interface NewsItem {
  date: string
  title: string
  summary: string
  link?: string
}

export function useNews() {
  const { data, loading, error } = useCSV<NewsItem>('news.csv')
  const items = [...data].sort((a, b) => b.date.localeCompare(a.date))
  return { items, loading, error }
}

export function formatNewsDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
