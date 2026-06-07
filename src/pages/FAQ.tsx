import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PageHero from '../components/PageHero'

const faqs = [
  {
    q: '1. What are QTL/MTA?',
    a: 'Quantitative Trait Loci (QTL) are chromosomal regions containing genes that contribute additively to a complex trait, identified by linkage of polymorphic molecular markers and phenotypic variation. Marker–trait associations (MTA) are genome-wide association results between markers (e.g. SNPs) and phenotypes. WheatQTLdb treats both as QTL.',
  },
  {
    q: '2. What is WheatQTLdb? Is there any publication about it?',
    a: 'WheatQTLdb is the wheat QTL database — published QTL/MTA curated into structured tables. See Mol Genet Genomics (2021) doi:10.1007/s00438-021-01796-9 and Mol Breeding (2022) doi:10.1007/s11032-022-01329-1.',
  },
  {
    q: '3. Which species are included?',
    a: 'V1.0 included Triticum aestivum only. V2.0 added T. durum, T. monococcum, T. boeoticum, T. turgidum, T. dicoccoides, T. dicoccum and Aegilops tauschii. V3.0 keeps all of these.',
  },
  {
    q: '4. How are traits classified?',
    a: 'Traits are grouped into functional categories such as abiotic-stress tolerance, biotic-stress resistance, biofortification, morphological, quality, yield, developmental, physiological and N/P-use-efficiency.',
  },
  {
    q: '5. How are public QTL data curated?',
    a: 'For each record we extract: Species, Trait, Parameter, Cross, Population/Germplasm (size), Method, QTL name, Chromosome, Position/Interval (cM/bp), Associated markers, PVE/R², Candidate gene and Reference.',
  },
  {
    q: '6. Can I contribute data?',
    a: 'Yes. V3.0 is open-source: edit public/data/*.csv files and open a pull request, or email the maintainers a CSV/XLSX through the contact page.',
  },
  {
    q: '7. Why a static site / GitHub Pages?',
    a: 'No backend keeps hosting free, fast and reproducible. The data is plain CSV — anyone can audit, fork or reuse it. Search/filter happens client-side and works offline.',
  },
]

export default function FAQ() {
  return (
    <div>
      <PageHero
        eyebrow="FAQ"
        title="Frequently Asked Questions"
        subtitle="Definitions, scope, curation methodology and contribution policy."
        image="wheat-herbarium.jpg"
        variant="side"
      />
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <Item key={i} q={f.q} a={f.a} />
        ))}
      </div>
    </div>
  )
}

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-wheat-200 bg-white dark:border-wheat-700 dark:bg-wheat-800">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-wheat-200 px-4 py-3 text-sm text-wheat-700 dark:border-wheat-700 dark:text-wheat-200">{a}</div>}
    </div>
  )
}
