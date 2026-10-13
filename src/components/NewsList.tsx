import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { NewsItem, formatNewsDate } from '../lib/news'

export default function NewsList({ items }: { items: NewsItem[] }) {
  if (!items.length) return <p className="text-sm text-wheat-600">No announcements yet.</p>
  return (
    <ul className="divide-y divide-wheat-200">
      {items.map((n) => {
        const link = (n.link || '').trim()
        const more = <>View <ArrowRight className="h-3.5 w-3.5" /></>
        return (
          <li key={`${n.date}-${n.title}`} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <time dateTime={n.date} className="text-xs font-medium uppercase tracking-wider text-wheat-500 sm:pt-0.5">
              {formatNewsDate(n.date)}
            </time>
            <div>
              <h3 className="font-semibold text-wheat-900">{n.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-wheat-700">{n.summary}</p>
              {link && (link.startsWith('/')
                ? <Link to={link} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline">{more}</Link>
                : <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline">{more}</a>)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
