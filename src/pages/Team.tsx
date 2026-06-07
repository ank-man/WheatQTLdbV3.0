import PageHeader from '../components/PageHeader'

interface Member { name: string; role: string; affiliation: string; email?: string }

const team: Member[] = [
  { name: 'PK Gupta', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'pkgupta36@gmail.com' },
  { name: 'Harindra Singh Balyan', role: 'Hony. Emeritus Professor & INSA Senior Scientist', affiliation: 'CCS University, Meerut', email: 'hsbalyan@gmail.com' },
  { name: 'Shailendra Sharma', role: 'Professor & Head', affiliation: 'CCS University, Meerut' },
  { name: 'Pradeep Kumar Sharma', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Shailendra S Gaurav', role: 'Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Rahul Kumar', role: 'Associate Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Sachin Kumar', role: 'Assistant Professor', affiliation: 'CCS University, Meerut' },
  { name: 'Kalpana Singh', role: 'Research Associate / Original Developer', affiliation: 'CCS University, Meerut', email: 'kalpana.iiita@gmail.com' },
  { name: 'Dinesh Kumar Saini', role: 'Research Scholar', affiliation: 'Punjab Agricultural University, Ludhiana' },
  { name: 'Ritu Batra', role: 'DS Kothari PostDoc Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Shiveta Sharma', role: 'BioCARe Women Scientist', affiliation: 'CCS University, Meerut' },
  { name: 'Gautam Saripalli', role: 'Senior Research Fellow', affiliation: 'CCS University, Meerut' },
  { name: 'Jitendra Kumar', role: 'Research Associate', affiliation: 'NABI, Mohali' },
]

export default function Team() {
  return (
    <div>
      <PageHeader title="Team" subtitle="Researchers behind WheatQTLdb" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => (
          <div key={m.name} className="card">
            <div className="font-semibold text-wheat-900 dark:text-wheat-50">{m.name}</div>
            <div className="text-sm text-wheat-700 dark:text-wheat-300">{m.role}</div>
            <div className="mt-1 text-xs text-wheat-600 dark:text-wheat-400">{m.affiliation}</div>
            {m.email && <a className="mt-2 inline-block text-xs underline" href={`mailto:${m.email}`}>{m.email}</a>}
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-wheat-600 dark:text-wheat-400">
        Full team list (V1.0 / V2.0) preserved from the original site at{' '}
        <a className="underline" href="http://wheatqtldb.net" target="_blank" rel="noreferrer">wheatqtldb.net</a>.
      </p>
    </div>
  )
}
