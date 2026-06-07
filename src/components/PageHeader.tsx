interface Props {
  title: string
  subtitle?: string
}
export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6 border-b border-wheat-200 pb-4 dark:border-wheat-700">
      <h1 className="text-3xl font-bold text-wheat-900 dark:text-wheat-50">{title}</h1>
      {subtitle && <p className="mt-1 text-wheat-700 dark:text-wheat-300">{subtitle}</p>}
    </div>
  )
}
