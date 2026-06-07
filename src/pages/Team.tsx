import { Github, Mail, ExternalLink } from 'lucide-react'
import PageHeader from '../components/PageHeader'

interface Member {
  name: string
  role: string
  affiliation: string
  email?: string
  photo?: string  // optional URL; falls back to auto avatar
  github?: string
  links?: { label: string; url: string }[]
}

// Avatar generator (no third-party lock-in: ui-avatars.com is free, CDN-cached, no API key)
const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=cc9d3f&color=fff&size=160&bold=true&font-size=0.45`

// V3.0 maintainers / new contributors
const v3Team: Member[] = [
  {
    name: 'Ankush Sharma',
    role: 'Lead Developer & Maintainer (V3.0)',
    affiliation: 'Open-source modernisation · GitHub Pages rebuild',
    github: 'ank-man',
    links: [{ label: 'Repository', url: 'https://github.com/ank-man/WheatQTLdbV3.0' }],
  },
]

// V1.0 / V2.0 founding team (CCS University, Meerut)
const facultyLeads: Member[] = [
  { name: 'PK Gupta', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'pkgupta36@gmail.com' },
  { name: 'Harindra Singh Balyan', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'hsbalyan@gmail.com' },
  { name: 'Shailendra Sharma', role: 'Professor & Head', affiliation: 'CCS University, Meerut' },
  { name: 'Pradeep Kumar Sharma', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Shailendra S Gaurav', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Rahul Kumar', role: 'Associate Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Sachin Kumar', role: 'Assistant Professor', affiliation: 'CCS University, Meerut' },
]

const researchers: Member[] = [
  { name: 'Kalpana Singh', role: 'Research Associate · Original V1/V2 Developer', affiliation: 'CCS University, Meerut', email: 'kalpana.iiita@gmail.com' },
  { name: 'Dinesh Kumar Saini', role: 'Research Scholar', affiliation: 'Punjab Agricultural University, Ludhiana' },
  { name: 'Ritu Batra', role: 'DS Kothari PostDoc Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Shiveta Sharma', role: 'BioCARe Women Scientist', affiliation: 'CCS University, Meerut' },
  { name: 'Gautam Saripalli', role: 'Senior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Tinku Gautam', role: 'Senior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Jitendra Kumar', role: 'Research Associate', affiliation: 'NABI, Mohali' },
  { name: 'Sunita Pal', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Parveen Malik', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Manoj Kumar', role: 'Senior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Hemant Sharma', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Anuj Kumar', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Kuldeep Kumar', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Anshu Rani', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Anjali Verma', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Deepak Kumar', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Saksham Pundir', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Vikas Kumar Singh', role: 'DST Inspire Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Sahadev Singh', role: 'DST Inspire Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Rakhi', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Irfat Jan', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Jyoti', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
  { name: 'Sourabh Kumar', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Vivudh Pratap Singh', role: 'Junior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Deepti Chaturvedi', role: 'Research Scholar', affiliation: 'CCS University, Meerut' },
]

export default function Team() {
  return (
    <div className="space-y-10">
      <PageHeader title="Team" subtitle="Authors, curators and maintainers behind WheatQTLdb." />

      <Section title="V3.0 — Maintainers" caption="Open-source modernisation, static rebuild, GitHub Pages deployment.">
        <Grid members={v3Team} highlight />
      </Section>

      <Section title="Faculty Leads (V1.0 / V2.0)" caption="Department of Genetics & Plant Breeding, Ch. Charan Singh University, Meerut.">
        <Grid members={facultyLeads} />
      </Section>

      <Section title="Researchers, Curators & Developers" caption="Curated published literature into the structured QTL database.">
        <Grid members={researchers} compact />
      </Section>

      <div className="card">
        <h3 className="font-semibold">Institution</h3>
        <p className="mt-2 text-sm text-wheat-700 dark:text-wheat-300">
          The original WheatQTLdb was conceived and curated at the
          <strong> Department of Genetics &amp; Plant Breeding, Ch. Charan Singh University, Meerut, India</strong>.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <img className="h-32 w-full rounded-lg object-cover" alt="Wheat field" src="https://images.unsplash.com/photo-1574323347407-f5e1c5a1ec21?w=600&q=70" />
          <img className="h-32 w-full rounded-lg object-cover" alt="Wheat ears" src="https://images.unsplash.com/photo-1535912559178-b1ed1bcb853a?w=600&q=70" />
          <img className="h-32 w-full rounded-lg object-cover" alt="Crop research" src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=70" />
        </div>
        <p className="mt-3 text-xs text-wheat-600 dark:text-wheat-400">
          Full original team listing preserved at{' '}
          <a className="underline" href="http://wheatqtldb.net" target="_blank" rel="noreferrer">wheatqtldb.net <ExternalLink className="inline h-3 w-3" /></a>.
        </p>
      </div>
    </div>
  )
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-wheat-900 dark:text-wheat-50">{title}</h2>
      {caption && <p className="mt-1 text-sm text-wheat-700 dark:text-wheat-300">{caption}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Grid({ members, highlight, compact }: { members: Member[]; highlight?: boolean; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
      {members.map((m) => (
        <div
          key={m.name}
          className={`card flex gap-3 ${highlight ? 'ring-2 ring-wheat-400 dark:ring-wheat-500' : ''}`}
        >
          <img
            src={m.photo || avatar(m.name)}
            alt={m.name}
            loading="lazy"
            className="h-16 w-16 flex-shrink-0 rounded-full border border-wheat-200 object-cover dark:border-wheat-700"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatar(m.name) }}
          />
          <div className="min-w-0">
            <div className="truncate font-semibold text-wheat-900 dark:text-wheat-50">{m.name}</div>
            <div className="text-sm text-wheat-700 dark:text-wheat-300">{m.role}</div>
            <div className="mt-0.5 text-xs text-wheat-600 dark:text-wheat-400">{m.affiliation}</div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
              {m.email && (
                <a className="inline-flex items-center gap-1 underline" href={`mailto:${m.email}`}>
                  <Mail className="h-3 w-3" /> Email
                </a>
              )}
              {m.github && (
                <a className="inline-flex items-center gap-1 underline" href={`https://github.com/${m.github}`} target="_blank" rel="noreferrer">
                  <Github className="h-3 w-3" /> @{m.github}
                </a>
              )}
              {m.links?.map((l) => (
                <a key={l.url} className="inline-flex items-center gap-1 underline" href={l.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" /> {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
