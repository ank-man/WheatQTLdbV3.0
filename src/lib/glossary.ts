// Single source of truth for genetics/statistics terminology used across the
// data tables (as column-header tooltips, via GlossaryHeader) and the FAQ
// page - so a term is defined once and reads identically everywhere it
// appears, rather than being paraphrased differently in each place.
export const GLOSSARY = {
  qtl: 'Quantitative Trait Locus (QTL): a chromosomal region containing genetic variation associated with a measurable trait, identified by linkage between molecular markers and phenotype in a segregating population (interval mapping).',
  mta: 'Marker–Trait Association (MTA): a marker (typically a SNP) statistically associated with a trait via genome-wide association study (GWAS), rather than interval mapping in a bi-parental population. WheatQTLdb records QTL and MTA together.',
  metaqtl: 'MetaQTL: a consensus interval derived by projecting and clustering overlapping QTL from multiple independent studies onto a common map, narrowing the likely causal region shared across studies.',
  epistatic: 'Epistatic QTL: a pair of loci whose combined effect on a trait deviates from the sum of their individual (additive) effects, detected by two-locus interaction analysis.',
  trait: 'Trait: the phenotype under genetic study (e.g. grain yield, drought tolerance, grain protein content), as reported by the original publication.',
  parameter: 'Parameter: the specific measurement or sub-trait scored (e.g. "1000-grain weight", "days to heading") underlying the broader trait category.',
  chromosome: 'Chromosome: one of the 21 hexaploid bread wheat chromosomes - 7 homoeologous groups × the A/B/D subgenomes - written e.g. "3B".',
  position_interval: 'Position / Interval: the locus’ map location, reported either as a genetic distance in centimorgans (cM, from a linkage map) or a physical position in base pairs (bp, on the IWGSC RefSeq v1.0 assembly), depending on what the original study reported. A single value is a point position; two values in parentheses give the flanking interval.',
  associated_markers: 'Associated markers: the molecular marker(s) (SNP, SSR, DArT, etc.) flanking or most closely linked to the locus.',
  pve: 'PVE / R² (Phenotypic Variance Explained): the percentage of total phenotypic variation in the trait attributable to this locus, as estimated by the mapping model - a measure of effect size, not statistical significance.',
  lod: 'LOD score (Logarithm of Odds): a statistical measure of the strength of linkage evidence between a marker and a trait at a given map position. Higher values indicate stronger evidence for a QTL there; most studies use a threshold (often ~3) to declare significance.',
  candidate_gene: 'Candidate gene: a gene proposed by the original study as the likely causal gene underlying the locus, based on its position, annotated function, or expression pattern - not necessarily functionally validated.',
  method: 'Method: the statistical mapping approach used in the original study (e.g. composite interval mapping, inclusive composite interval mapping, or GWAS).',
  cross: 'Cross: the parental combination used to generate the mapping population (e.g. "Parent A × Parent B").',
  population: 'Mapping population: the segregating population used to map the locus (e.g. RIL: recombinant inbred line, DH: doubled haploid, F2), derived from the listed cross; population size in parentheses where reported.',
} as const

export type GlossaryTerm = keyof typeof GLOSSARY
