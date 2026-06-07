import { ReactNode, useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Moon, Sun, Github, Wheat } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/tutorial', label: 'Tutorial' },
  { to: '/statistics', label: 'Statistics' },
  { to: '/data', label: 'Data' },
  { to: '/team', label: 'Team' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
  { to: '/links', label: 'Links' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-wheat-200 bg-white/80 backdrop-blur dark:border-wheat-700 dark:bg-wheat-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Wheat className="h-7 w-7 text-wheat-600" />
            <div className="leading-tight">
              <div className="text-lg font-bold text-wheat-800 dark:text-wheat-50">WheatQTLdb</div>
              <div className="text-[10px] uppercase tracking-wider text-wheat-600 dark:text-wheat-300">v3.0 · open source</div>
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
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="btn"
              aria-label="GitHub repository"
              title="GitHub repository"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button className="btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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
          <nav className="border-t border-wheat-200 bg-white px-4 py-2 dark:border-wheat-700 dark:bg-wheat-900 lg:hidden">
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

      <footer className="border-t border-wheat-200 bg-white py-6 text-center text-sm text-wheat-700 dark:border-wheat-700 dark:bg-wheat-900 dark:text-wheat-300">
        <div className="mx-auto max-w-7xl px-4">
          <p>
            © {new Date().getFullYear()} WheatQTLdb · Conceived by Department of Genetics &amp; Plant Breeding,{' '}
            <a className="underline hover:text-wheat-900 dark:hover:text-wheat-50" href="http://www.ccsuniversity.ac.in/" target="_blank" rel="noreferrer">CCS University, Meerut</a>.
          </p>
          <p className="mt-1 text-xs">Open-source rebuild · Static site · Hosted on GitHub Pages.</p>
        </div>
      </footer>
    </div>
  )
}
