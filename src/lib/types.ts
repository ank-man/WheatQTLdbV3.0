export interface QTLRecord {
  id: string
  species: string
  trait: string
  parameter?: string
  cross?: string
  population?: string
  method?: string
  qtl_name: string
  chromosome: string
  position_interval?: string
  associated_markers?: string
  pve?: number | string
  candidate_gene?: string
  reference?: string
  doi?: string
  /**
   * Publication year, written by the data pipeline from the record's resolved
   * publication (publications.csv). Empty when the reference could not be
   * resolved - never inferred from the link text.
   */
  year?: string
  source_file?: string
  /**
   * Which arm of a treatment-contrast experiment the QTL was detected in
   * ("Drought stress" / "Well-watered control"), where the source recorded
   * both. Empty for the great majority of records, whose study had no such
   * contrast - so filtering on it narrows to the studies that did.
   */
  treatment?: string
  /** Computed in convert_datasets.py, where whole-dataset context is available. */
  multi_trait?: string
  n_traits?: number | string
}

export interface MetaQTLRecord {
  id: string
  species: string
  trait: string
  parameter?: string
  mqtl_name: string
  chromosome: string
  position_interval?: string
  associated_markers?: string
  pve?: number | string
  candidate_gene?: string
  reference?: string
  doi?: string
  year?: string
  source_file?: string
}

export interface EpistaticRecord {
  id: string
  species: string
  trait: string
  parameter?: string
  cross?: string
  population?: string
  method?: string
  qtl1: string
  chromosome1: string
  position_interval1?: string
  markers1?: string
  qtl2: string
  chromosome2: string
  position_interval2?: string
  markers2?: string
  lod?: string
  pve?: number | string
  reference?: string
  doi?: string
  year?: string
  source_file?: string
}

export interface CandidateGeneRecord {
  id: string
  gene: string
  /** Symbol / gene model / functional annotation - decides which link fits. */
  gene_type?: string
  chromosome: string
  position?: string
  trait: string
  qtl_name?: string
  /** How many QTL/MetaQTL records name this gene. */
  records?: number | string
  record_types?: string
  reference?: string
  doi?: string
}

/** A source publication behind one or more records, enriched from Crossref. */
export interface PublicationRecord {
  id: string
  doi: string
  title: string
  authors: string
  journal: string
  year: string
  type: string
  publisher: string
  citations: string
  records: number | string
  record_types: string
  species: string
  top_trait: string
  url: string
}
