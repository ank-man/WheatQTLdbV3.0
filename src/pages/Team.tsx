import { Github, Mail, ExternalLink } from 'lucide-react'
import PageHero from '../components/PageHero'
import Avatar from '../components/Avatar'

const img = (p: string) => `${import.meta.env.BASE_URL}images/${p}`

interface Member {
  name: string
  role: string
  affiliation: string
  email?: string
  photo?: string  // optional URL; falls back to auto avatar
  github?: string
  links?: { label: string; url: string }[]
}

// V3.0 maintainers / new contributors
const v3Team: Member[] = [
  {
    name: 'Ankush Sharma',
    role: 'Lead Developer & Maintainer (V3.0)',
    affiliation: 'University of Georgia, USA',
    github: 'ank-man',
    links: [{ label: 'Repository', url: 'https://github.com/ank-man/WheatQTLdbV3.0' }],
  },
  {
    name: 'Kalpana Singh',
    role: 'Maintainer · Original V1/V2 Developer',
    affiliation: 'Punjab Agricultural University, Ludhiana, India',
    email: 'kalpana.iiita@gmail.com',
  },
]

// V1.0 / V2.0 founding faculty (CCS University, Meerut) plus faculty who
// have since joined as maintainers/collaborators.
const facultyLeads: Member[] = [
  { name: 'PK Gupta', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'pkgupta36@gmail.com' },
  { name: 'Sachin Rustgi', role: 'Associate Professor', affiliation: 'Clemson University, USA' },
  { name: 'Harindra Singh Balyan', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'hsbalyan@gmail.com' },
  { name: 'Shailendra Sharma', role: 'Professor & Head', affiliation: 'CCS University, Meerut' },
  { name: 'Pradeep Kumar Sharma', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Shailendra S Gaurav', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Rahul Kumar', role: 'Associate Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Sachin Kumar', role: 'Assistant Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Vinay Kumar', role: 'Assistant Professor', affiliation: 'CCS University, Meerut' },
]

export default function Team() {
  return (
    <div className="space-y-10">
      <PageHero
        eyebrow="People"
        title="Team"
        subtitle="Authors, curators and maintainers behind WheatQTLdb."
        image="wheat-spring.jpg"
        variant="side"
      />

      <Section title="V3.0 — Maintainers" caption="Open-source modernisation, reproducible build, openly archived.">
        <Grid members={v3Team} highlight />
      </Section>

      <Section title="Faculty Leads (V1.0 / V2.0)" caption="Department of Genetics & Plant Breeding, Ch. Charan Singh University, Meerut.">
        <Grid members={facultyLeads} />
      </Section>

      <div className="card">
        <h3 className="font-semibold text-wheat-900">Development &amp; data curation</h3>
        <p className="mt-2 text-sm text-wheat-700">
          Developed and maintained by Ankush Sharma, University of Georgia, USA and Kalpana Singh, Punjab
          Agricultural University, Ludhiana, India. Data curated by Gautam Saripalli, Clemson University, USA and
          Dinesh Saini, Texas Tech, USA. All the data was jointly collected by the students of the above faculty
          members.
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold">Institution</h3>
        <p className="mt-2 text-sm text-wheat-700">
          The original WheatQTLdb was conceived and curated at the
          <strong> Department of Genetics &amp; Plant Breeding, Ch. Charan Singh University, Meerut, India</strong>.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <img className="h-32 w-full rounded-lg object-cover" alt="Wheat field" src={img('wheat-field-gbif.jpg')} loading="lazy" />
          <img className="h-32 w-full rounded-lg object-cover" alt="Wheat ears" src={img('wheat-ears.jpg')} loading="lazy" />
          <img className="h-32 w-full rounded-lg object-cover" alt="Crop research" src={img('crop-research.jpg')} loading="lazy" />
        </div>
        <p className="mt-3 text-xs text-wheat-600">
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
      <h2 className="text-2xl font-semibold text-wheat-900">{title}</h2>
      {caption && <p className="mt-1 text-sm text-wheat-700">{caption}</p>}
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
          className={`card flex gap-3 ${highlight ? 'ring-2 ring-wheat-400' : ''}`}
        >
          <Avatar
            name={m.name}
            src={m.photo}
            size={64}
            className="h-16 w-16 flex-shrink-0 rounded-full border border-wheat-200 object-cover"
          />
          <div className="min-w-0">
            <div className="truncate font-semibold text-wheat-900">{m.name}</div>
            <div className="text-sm text-wheat-700">{m.role}</div>
            <div className="mt-0.5 text-xs text-wheat-600">{m.affiliation}</div>
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
