import { ReactNode, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Github, Wheat } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/statistics', label: 'Statistics' },
  { to: '/map', label: 'Map' },
  { to: '/data', label: 'Data' },
  { to: '/search', label: 'Search' },
  { to: '/team', label: 'Team' },
  { to: '/contact', label: 'Contact' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-wheat-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Wheat className="h-7 w-7 text-wheat-600" />
            <div className="leading-tight">
              <div className="text-lg font-bold text-wheat-800">WheatQTLdb</div>
              <div className="text-[10px] uppercase tracking-wider text-wheat-600">v3.0 · open source</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/ank-man/WheatQTLdbV3.0"
              target="_blank"
              rel="noreferrer"
              className="btn"
              aria-label="GitHub repository"
              title="GitHub repository"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button
              className="btn lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-wheat-200 bg-white px-4 py-2 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-wheat-200 bg-white pt-10 text-sm text-wheat-700">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-wheat-900">
              <Wheat className="h-4 w-4 text-wheat-600" /> WheatQTLdb
            </div>
            <p className="mt-2 text-xs text-wheat-600">
              An open-access, manually curated reference of published wheat QTL, MetaQTL, epistatic-QTL and
              candidate-gene records.
            </p>
          </div>
          <FooterCol title="Documentation" links={[
            { to: '/about', label: 'About the database' },
            { to: '/faq', label: 'FAQ & methodology' },
            { to: '/tutorial', label: 'Tutorial' },
            { to: '/credits', label: 'Credits & how to cite' },
          ]} />
          <FooterCol title="Data & analysis" links={[
            { to: '/data', label: 'Browse all data' },
            { to: '/search', label: 'Advanced search' },
            { to: '/statistics', label: 'Statistics' },
            { to: '/map', label: 'Genome map' },
            { to: '/links', label: 'Related resources' },
          ]} />
          <FooterCol title="Project" links={[
            { to: '/team', label: 'Team' },
            { to: '/contact', label: 'Contact' },
          ]} external={[
            { href: 'https://github.com/ank-man/WheatQTLdbV3.0', label: 'Source code (GitHub)' },
          ]} />
        </div>

        <div className="mt-8 border-t border-wheat-200 py-6 text-center">
          <div className="mx-auto max-w-7xl px-4">
            <p>
              © {new Date().getFullYear()} WheatQTLdb · Conceived by Department of Genetics &amp; Plant Breeding,{' '}
              <a className="underline hover:text-wheat-900" href="http://www.ccsuniversity.ac.in/" target="_blank" rel="noreferrer">CCS University, Meerut</a>.
            </p>
            <p className="mt-1 text-xs">Open-source rebuild · Reproducible archive · Code openly available for transparency.</p>
            <p className="mt-1 text-[11px] text-wheat-600">
              Botanical imagery sourced from Wikimedia Commons / GBIF (CC BY-SA / Public Domain).
              Citing this resource: see <a className="underline" href="/credits">Credits</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({
  title,
  links,
  external,
}: {
  title: string
  links?: { to: string; label: string }[]
  external?: { href: string; label: string }[]
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-wheat-900">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {links?.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-wheat-600 hover:text-wheat-900 hover:underline">{l.label}</Link>
          </li>
        ))}
        {external?.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer" className="text-wheat-600 hover:text-wheat-900 hover:underline">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
