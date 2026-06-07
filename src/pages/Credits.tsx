import PageHero from '../components/PageHero'
import { ExternalLink } from 'lucide-react'

interface Credit { file: string; title: string; author?: string; license: string; source: string }

const credits: Credit[] = [
  {
    file: 'botanical-illustration.jpg',
    title: 'Triticum aestivum — botanical illustration',
    author: 'Otto Wilhelm Thomé, Flora von Deutschland (1885)',
    license: 'Public domain',
    source: 'https://commons.wikimedia.org/wiki/File:Illustration_Triticum_aestivum0.jpg',
  },
  {
    file: 'wheat-field-gbif.jpg',
    title: 'Triticum aestivum field (gewone tarwe veld)',
    author: 'Rasbak, Wikimedia Commons',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Triticum_aestivum_field,_gewone_tarwe_veld.jpg',
  },
  {
    file: 'wheat-grains.jpg',
    title: 'Wheat grains (Tarwe korrels)',
    author: 'Rasbak, Wikimedia Commons',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Tarwe_korrels_Triticum_aestivum.jpg',
  },
  {
    file: 'wheat-herbarium.jpg',
    title: 'Triticum aestivum subsp. aestivum (herbarium)',
    author: 'Roger Culos, Muséum de Toulouse (MHNT)',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Triticum_aestivum_subsp._aestivum_MHNT.BOT.2015.2.31.jpg',
  },
  {
    file: 'wheat-spring.jpg',
    title: 'Triticum aestivum spring wheat (zomertarwe)',
    author: 'Rasbak, Wikimedia Commons',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/Category:Triticum_aestivum',
  },
  {
    file: 'hero-wheat.jpg / wheat-field.jpg / wheat-ears.jpg / crop-research.jpg',
    title: 'Wheat field & ear photographs',
    author: 'Various photographers via Unsplash',
    license: 'Unsplash License (free for commercial & non-commercial use)',
    source: 'https://unsplash.com/s/photos/wheat',
  },
]

export default function Credits() {
  return (
    <div>
      <PageHero
        eyebrow="Attribution"
        title="Credits & licences"
        subtitle="All imagery used on this site is openly licensed. Data attribution follows the original WheatQTLdb publications and the source references for each record."
        image="botanical-illustration.jpg"
        variant="side"
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Imagery</h2>
        <p className="text-sm text-wheat-700 dark:text-wheat-300">
          Botanical and agronomic images are sourced from Wikimedia Commons (curated through GBIF where applicable)
          and Unsplash. Each image is reused under its respective licence; please cite the original author when re-using.
        </p>
        <div className="overflow-x-auto rounded-lg border border-wheat-200 dark:border-wheat-700">
          <table className="min-w-full divide-y divide-wheat-200 text-sm dark:divide-wheat-700">
            <thead className="bg-wheat-100 dark:bg-wheat-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">File</th>
                <th className="px-3 py-2 text-left font-semibold">Title</th>
                <th className="px-3 py-2 text-left font-semibold">Author</th>
                <th className="px-3 py-2 text-left font-semibold">Licence</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wheat-100 bg-white dark:divide-wheat-800 dark:bg-wheat-900">
              {credits.map((c) => (
                <tr key={c.file}>
                  <td className="px-3 py-2 font-mono text-xs">{c.file}</td>
                  <td className="px-3 py-2">{c.title}</td>
                  <td className="px-3 py-2">{c.author ?? '—'}</td>
                  <td className="px-3 py-2"><span className="badge">{c.license}</span></td>
                  <td className="px-3 py-2">
                    <a className="inline-flex items-center gap-1 underline" href={c.source} target="_blank" rel="noreferrer">
                      Link <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Data</h2>
        <p className="text-sm text-wheat-700 dark:text-wheat-300">
          QTL/MTA, MetaQTL, epistatic-QTL and candidate-gene records are manually curated from peer-reviewed
          publications. Each row carries the primary reference (with DOI). Please cite both the original publication
          and the WheatQTLdb papers when reusing data.
        </p>
        <ul className="ml-6 list-disc text-sm text-wheat-800 dark:text-wheat-200">
          <li>Singh, K., Saini, D.K., Saripalli, G. et al. <em>WheatQTLdb V2.0: a supplement to the database for wheat QTL.</em> Mol Breeding 42, 56 (2022). <a className="underline" href="https://doi.org/10.1007/s11032-022-01329-1" target="_blank" rel="noreferrer">doi:10.1007/s11032-022-01329-1</a></li>
          <li>Singh K, Batra R, Sharma S, et al. <em>WheatQTLdb: a QTL database for wheat.</em> Mol Genet Genomics 296, 1051–1056 (2021). <a className="underline" href="https://doi.org/10.1007/s00438-021-01796-9" target="_blank" rel="noreferrer">doi:10.1007/s00438-021-01796-9</a></li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Software</h2>
        <p className="text-sm text-wheat-700 dark:text-wheat-300">
          The V3.0 web application is released under the MIT License at{' '}
          <a className="underline" href="https://github.com/ank-man/WheatQTLdbV3.0" target="_blank" rel="noreferrer">github.com/ank-man/WheatQTLdbV3.0</a>.
          Built with React, TypeScript, Vite, Tailwind CSS, TanStack Table, Recharts, PapaParse and Lucide icons.
        </p>
      </section>
    </div>
  )
}
