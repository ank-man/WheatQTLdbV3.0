import { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Image filename in /public/images (without leading slash) */
  image?: string
  /** Treatment of the image: 'cover' (full-bleed) or 'side' (right column) */
  variant?: 'cover' | 'side'
  /** Additional content (e.g. CTA buttons) */
  children?: ReactNode
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  image = 'wheat-field-gbif.jpg',
  variant = 'cover',
  children,
}: Props) {
  const src = `${import.meta.env.BASE_URL}images/${image}`

  if (variant === 'side') {
    return (
      <section className="relative -mx-4 -mt-8 mb-10 overflow-hidden border-b border-wheat-200 dark:border-wheat-700">
        <div className="absolute inset-0 bg-grid opacity-50 dark:opacity-25" />
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1.3fr_1fr] md:py-16">
          <div className="animate-fade-up">
            {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600 dark:text-wheat-300">{eyebrow}</div>}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-wheat-900 dark:text-wheat-50 sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 max-w-2xl text-wheat-700 dark:text-wheat-200">{subtitle}</p>}
            {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
          </div>
          <div className="relative hidden h-56 overflow-hidden rounded-2xl border border-wheat-200 shadow-lg dark:border-wheat-700 md:block">
            <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-wheat-900/30 via-transparent to-transparent" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative -mx-4 -mt-8 mb-10 overflow-hidden border-b border-wheat-200 dark:border-wheat-700">
      <img src={src} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover opacity-30 dark:opacity-15" />
      <div className="absolute inset-0 bg-grid opacity-60 dark:opacity-25" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-gradient-to-b from-wheat-50/60 via-wheat-50/85 to-wheat-50 dark:from-wheat-900/50 dark:via-wheat-900/85 dark:to-wheat-900" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 animate-fade-up">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600 dark:text-wheat-300">{eyebrow}</div>}
        <h1 className="mt-2 max-w-4xl text-3xl font-extrabold tracking-tight text-wheat-900 dark:text-wheat-50 sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-3xl text-wheat-700 dark:text-wheat-200">{subtitle}</p>}
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  )
}
