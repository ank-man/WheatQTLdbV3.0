import PageHero from '../components/PageHero'

export default function Credits() {
  return (
    <div>
      <PageHero
        eyebrow="Attribution"
        title="Credits & licences"
        subtitle="Data attribution follows the original WheatQTLdb publications and the source references for each record."
        variant="side"
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Imagery</h2>
        <p className="text-sm text-wheat-700">
          Field and specimen photographs throughout the site are original, taken in the curation team's own wheat
          trial plots.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Data</h2>
        <p className="text-sm text-wheat-700">
          QTL/MTA, MetaQTL, epistatic-QTL and candidate-gene records are manually curated from peer-reviewed
          publications. Each row carries the primary reference (with DOI). Please cite both the original publication
          and the WheatQTLdb papers when reusing data.
        </p>
        <ul className="ml-6 list-disc text-sm text-wheat-800">
          <li>Singh, K., Saini, D.K., Saripalli, G. et al. <em>WheatQTLdb V2.0: a supplement to the database for wheat QTL.</em> Mol Breeding 42, 56 (2022). <a className="underline" href="https://doi.org/10.1007/s11032-022-01329-1" target="_blank" rel="noreferrer">doi:10.1007/s11032-022-01329-1</a></li>
          <li>Singh K, Batra R, Sharma S, et al. <em>WheatQTLdb: a QTL database for wheat.</em> Mol Genet Genomics 296, 1051–1056 (2021). <a className="underline" href="https://doi.org/10.1007/s00438-021-01796-9" target="_blank" rel="noreferrer">doi:10.1007/s00438-021-01796-9</a></li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Maintenance</h2>
        <p className="text-sm text-wheat-700">
          The V3.0 release is maintained by Ankush Sharma (<a className="underline" href="mailto:mr.ank2999@gmail.com">mr.ank2999@gmail.com</a>).
          Data is provided as plain CSV so every record can be independently audited and reused in downstream
          analysis pipelines.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Copyright</h2>
        <p className="text-sm text-wheat-700">
          © {new Date().getFullYear()} WheatQTLdb. Jointly copyrighted by the Department of Genetics &amp; Plant
          Breeding, Ch. Charan Singh University, Meerut, and the Rustgi Lab, Clemson University.
        </p>
      </section>
    </div>
  )
}
