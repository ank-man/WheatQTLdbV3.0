import PageHero from '../components/PageHero'
import AsyncBoundary from '../components/AsyncBoundary'
import NewsList from '../components/NewsList'
import { useNews } from '../lib/news'

export default function NewsPage() {
  const { items, loading, error } = useNews()
  return (
    <div>
      <PageHero
        eyebrow="Updates"
        title="News"
        subtitle="New data, rebuilt tables and new views, most recent first."
        variant="side"
      />
      <AsyncBoundary loading={loading} error={error}>
        <div className="card"><NewsList items={items} /></div>
      </AsyncBoundary>
    </div>
  )
}
