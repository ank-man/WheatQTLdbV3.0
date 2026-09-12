import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHero from '../components/PageHero'

export default function About() {
  return (
    <div>
      <PageHero
        eyebrow="About"
        title="A manually curated QTL database for wheat"
        subtitle="WheatQTLdb V3.0 is an open-access academic resource consolidating QTL, MetaQTL and epistatic-QTL data from published literature on Triticum aestivum and seven related wheat species."
        image="botanical-illustration.jpg"
        variant="side"
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 text-wheat-800 lg:col-span-2">
          <section>
            <h2 className="text-xl font-semibold text-wheat-900">Scope</h2>
            <p className="mt-2 text-sm leading-relaxed">
              WheatQTLdb is a manually curated database of published wheat QTL, spanning QTL identified through
              interval mapping and marker–trait associations (MTA) identified using genome-wide association
              studies (GWAS). MetaQTL, epistatic QTL and candidate genes are included where the original study
              reported them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-wheat-900">Trait coverage</h2>
            <p className="mt-2 text-sm">Records span the genetic architecture of:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1 text-sm">
              <li>Tolerance to abiotic stresses (drought, water-logging, heat, pre-harvest sprouting, salinity)</li>
              <li>Resistance to biotic stresses (viral, bacterial, fungal, nematode, insect)</li>
              <li>Biofortification traits (Fe / Se / Zn grain content)</li>
              <li>Developmental, morphological and physiological traits</li>
              <li>Nitrogen / phosphorus / potassium use efficiency</li>
              <li>Quality, yield and yield-related traits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-wheat-900">Species covered</h2>
            <p className="mt-2 text-sm leading-relaxed">
              <em>Triticum aestivum</em> (bread wheat) and seven related species/subspecies: <em>T. durum</em>,{' '}
              <em>T. monococcum</em>, <em>T. boeoticum</em>, <em>T. turgidum</em> (including subsp.{' '}
              <em>dicoccoides</em> and <em>dicoccum</em>) and <em>Aegilops tauschii</em>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-wheat-900">Why an open, reproducible archive</h2>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>V3.0</strong> is a community, open-source rebuild of the original PHP/MySQL WheatQTLdb — openly
              archived with reproducible builds and a plain-CSV data layer, so every record can be audited, forked
              or reused without relying on this site staying online.
            </p>
          </section>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/faq" className="btn text-sm">Curation methodology &amp; FAQ <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/credits" className="btn text-sm">How to cite this data <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/tutorial" className="btn text-sm">Tutorial <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>

        <aside className="card h-fit space-y-3 text-sm">
          <h3 className="font-semibold text-wheat-900">At a glance</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-wheat-600">Record types</dt>
              <dd>QTL/MTA, MetaQTL, epistatic QTL, candidate genes</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-wheat-600">Species</dt>
              <dd>8 (Triticum aestivum + 7 related)</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-wheat-600">Genome reference</dt>
              <dd>IWGSC RefSeq v1.0</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-wheat-600">Data format</dt>
              <dd>Plain CSV, versioned in Git</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-wheat-600">Licence</dt>
              <dd>MIT (code) · see <Link className="underline" to="/credits">Credits</Link> for data attribution</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
