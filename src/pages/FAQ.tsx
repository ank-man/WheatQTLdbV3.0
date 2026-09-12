import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PageHero from '../components/PageHero'
import { GLOSSARY } from '../lib/glossary'

const faqs = [
  {
    q: 'What are QTL/MTA?',
    a: 'Quantitative Trait Loci (QTL) are chromosomal regions containing genes that contribute additively to a complex trait, identified by linkage of polymorphic molecular markers and phenotypic variation. Marker–trait associations (MTA) are genome-wide association results between markers (e.g. SNPs) and phenotypes. WheatQTLdb treats both as QTL.',
  },
  {
    q: 'What is WheatQTLdb? Is there any publication about it?',
    a: 'WheatQTLdb is the wheat QTL database — published QTL/MTA curated into structured tables. See Mol Genet Genomics (2021) doi:10.1007/s00438-021-01796-9 and Mol Breeding (2022) doi:10.1007/s11032-022-01329-1.',
  },
  {
    q: 'Which species are included?',
    a: 'V1.0 included Triticum aestivum only. V2.0 added T. durum, T. monococcum, T. boeoticum, T. turgidum, T. dicoccoides, T. dicoccum and Aegilops tauschii. V3.0 keeps all of these; T. durum and the T. turgidum subspecies are grouped under Triticum turgidum in the Search species filter.',
  },
  {
    q: 'How are traits classified?',
    a: 'Traits are grouped into functional categories such as abiotic-stress tolerance, biotic-stress resistance, biofortification, morphological, quality, yield, developmental, physiological and nitrogen-use-efficiency.',
  },
  {
    q: 'What do PVE, R² and LOD mean, and how are QTL positions reported?',
    a: `${GLOSSARY.pve} ${GLOSSARY.lod} ${GLOSSARY.position_interval}`,
  },
  {
    q: 'What is the difference between a QTL, a MetaQTL and an epistatic QTL?',
    a: `${GLOSSARY.qtl} ${GLOSSARY.metaqtl} ${GLOSSARY.epistatic}`,
  },
  {
    q: 'How are public QTL data curated?',
    a: 'For each record we extract: Species, Trait, Parameter, Cross, Population/Germplasm (size), Method, QTL name, Chromosome, Position/Interval (cM/bp), Associated markers, PVE/R², Candidate gene and Reference — hover the (?) icon on any column header in a data table for that column’s definition.',
  },
  {
    q: 'Can I contribute data?',
    a: 'Yes. V3.0 is open-source: edit public/data/*.csv files and open a pull request, or email the maintainers a CSV/XLSX through the contact page.',
  },
  {
    q: 'Why an open, reproducible archive?',
    a: 'An open architecture ensures long-term accessibility and reproducibility. The data is plain CSV — anyone can audit, fork or reuse it. Search and filtering run entirely in the browser for speed and offline capability.',
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
          <Item key={i} n={i + 1} q={f.q} a={f.a} />
        ))}
      </div>
    </div>
  )
}

function Item({ n, q, a }: { n: number; q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-wheat-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
        onClick={() => setOpen(!open)}
      >
        <span>{n}. {q}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-wheat-200 px-4 py-3 text-sm text-wheat-700">{a}</div>}
    </div>
  )
}
