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
      <section className="relative -mx-4 -mt-8 mb-10 overflow-hidden border-b border-wheat-200 bg-white">
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1.3fr_1fr] md:py-16">
          <div className="animate-fade-up">
            {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600">{eyebrow}</div>}
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-wheat-900 sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 max-w-2xl text-wheat-700">{subtitle}</p>}
            {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
          </div>
          <div className="relative hidden h-56 overflow-hidden rounded-2xl border border-wheat-200 shadow-sm md:block">
            <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative -mx-4 -mt-8 mb-10 overflow-hidden border-b border-wheat-200 bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 animate-fade-up">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wheat-600">{eyebrow}</div>}
        <h1 className="mt-2 max-w-4xl text-3xl font-extrabold tracking-tight text-wheat-900 sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-3xl text-wheat-700">{subtitle}</p>}
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  )
}
