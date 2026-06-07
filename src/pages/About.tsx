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
      <div className="prose prose-wheat max-w-none text-wheat-800 dark:text-wheat-200">
        <p>
          WheatQTLdb is a manually curated QTL database for wheat that includes information about QTL identified
          through interval mapping and MTA identified using GWAS. Information on metaQTL, epistatic QTL and
          candidate genes is also included where available.
        </p>
        <p>Users may browse and download the database for genetic architecture of:</p>
        <ul className="list-inside list-disc">
          <li>Tolerance to abiotic stresses (drought, water-logging, heat, pre-harvest sprouting, salinity)</li>
          <li>Resistance to biotic stresses (viral, bacterial, fungal, nematode, insect)</li>
          <li>Biofortification traits (Fe / Se / Zn content)</li>
          <li>Developmental, morphological and physiological traits</li>
          <li>N / P / K use efficiency</li>
          <li>Quality, yield and yield-related traits</li>
        </ul>
        <p>
          WheatQTLdb covers <em>Triticum aestivum</em> and seven other wheat species (<em>T. durum, T. monococcum,
          T. boeoticum, T. turgidum, T. dicoccoides, T. dicoccum</em> and <em>Aegilops tauschii</em>).
        </p>
        <p>
          <strong>V3.0</strong> is a community, open-source rebuild — fully static, hosted on GitHub Pages, with a
          CSV-based data layer for transparent contribution and reproducibility.
        </p>
      </div>
    </div>
  )
}
