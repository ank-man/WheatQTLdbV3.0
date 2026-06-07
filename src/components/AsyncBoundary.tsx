import { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  loading: boolean
  error: string | null
  children: ReactNode
  empty?: boolean
  emptyMessage?: string
}

export default function AsyncBoundary({ loading, error, empty, emptyMessage, children }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-wheat-200 bg-white p-6 text-wheat-700 dark:border-wheat-700 dark:bg-wheat-800 dark:text-wheat-200">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-semibold">Failed to load data</div>
          <div className="text-sm">{error}</div>
          <div className="mt-2 text-xs opacity-80">
            Add your CSV files to <code>public/data/</code>. See <code>README.md</code> for the schema.
          </div>
        </div>
      </div>
    )
  }
  if (empty) {
    return (
      <div className="rounded-lg border border-wheat-200 bg-white p-6 text-wheat-700 dark:border-wheat-700 dark:bg-wheat-800 dark:text-wheat-200">
        {emptyMessage ?? 'No data yet.'}
      </div>
    )
  }
  return <>{children}</>
}
