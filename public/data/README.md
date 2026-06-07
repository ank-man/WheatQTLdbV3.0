# Data files

These CSVs are loaded at runtime by the site. Replace the sample rows with the curated dataset and redeploy. Headers (column names) must match exactly.

## Schemas

### `qtl.csv`
`id, species, trait_category, trait, parameter, cross, population, population_size, method, qtl_name, chromosome, position_cm, position_bp, interval_cm, interval_bp, associated_markers, pve, candidate_gene, reference, doi, year`

### `metaqtl.csv`
`id, species, trait_category, trait, mqtl_name, chromosome, position_cm, interval_cm, n_qtl, candidate_gene, reference, doi, year`

### `epistatic.csv`
`id, species, trait, qtl1, qtl2, chromosome1, chromosome2, interaction_type, pve, reference, doi, year`

### `candidate_genes.csv`
`id, gene, chromosome, position, trait, qtl_name, reference, doi`

## Notes

- Use UTF-8 encoding.
- Year should be a 4-digit integer (e.g. `2022`).
- `doi` should be the DOI **without** `https://doi.org/` prefix; the UI builds the link.
- Empty cells are fine — leave the column but the value blank.
