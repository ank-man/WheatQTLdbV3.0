export interface QTLRecord {
  id: string
  species: string
  trait_category: string
  trait: string
  parameter?: string
  cross?: string
  population?: string
  population_size?: number | string
  method?: string
  qtl_name: string
  chromosome: string
  position_cm?: number | string
  position_bp?: number | string
  interval_cm?: string
  interval_bp?: string
  associated_markers?: string
  pve?: number | string
  candidate_gene?: string
  reference?: string
  doi?: string
  year?: number | string
}

export interface MetaQTLRecord {
  id: string
  species: string
  trait_category: string
  trait: string
  mqtl_name: string
  chromosome: string
  position_cm?: number | string
  interval_cm?: string
  n_qtl?: number | string
  candidate_gene?: string
  reference?: string
  doi?: string
  year?: number | string
}

export interface EpistaticRecord {
  id: string
  species: string
  trait: string
  qtl1: string
  qtl2: string
  chromosome1: string
  chromosome2: string
  interaction_type?: string
  pve?: number | string
  reference?: string
  doi?: string
  year?: number | string
}

export interface CandidateGeneRecord {
  id: string
  gene: string
  chromosome: string
  position?: string
  trait: string
  qtl_name?: string
  reference?: string
  doi?: string
}
