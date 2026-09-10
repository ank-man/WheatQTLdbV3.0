# WheatQTLdb V3.0 — Materials and Methods / Results draft text

*Auto-compiled from the live database (public/data/qtl.csv, metaqtl.csv, epistatic.csv) after normalization and deduplication. All counts are exact as of this build; edit freely.*

**Affiliation:** Sachin Rustagi, Department of Plant and Environmental Sciences, Clemson University, Clemson, SC, USA.

**Funding:** [Grant/Funding Agency, Grant #XXXXX].

---

## Materials and Methods

### Data collection and literature curation

QTL, meta-QTL (MetaQTL) and epistatic-QTL records were manually curated from peer-reviewed wheat genetics literature, spanning both bi-parental linkage-mapping studies and genome-wide association studies (GWAS). Source records were organized by trait domain (yield, biotic stress resistance, abiotic stress tolerance, quality, biofortification, nutrient-use efficiency, developmental and morphological traits, and epistatic QTL × QTL interactions) into individual curation spreadsheets prior to integration.

### Data extraction and table construction

A dedicated extraction pipeline (`convert_datasets.py`) consolidated the curated spreadsheets into three relational tables — QTL, MetaQTL, and epistatic QTL — using fuzzy, token-based column-header matching to accommodate inconsistent header naming across independently curated source files. For each record, species, trait, parameter, chromosome, genomic position/interval, flanking markers, phenotypic variance explained (PVE), candidate gene, mapping method, and literature reference (including DOI where available) were extracted.

### Chromosome standardization

Chromosome designations were highly heterogeneous across source studies (arm-level suffixes, duplicate-locus indices, "chr" prefixes, and, for a subset of GWAS studies, no chromosome column at all). A rule-based resolver normalized every record to one of the 21 canonical hexaploid wheat chromosomes (1A–7D) or a single residual category ("Un") for loci that could not be confidently anchored — most commonly GWAS-derived markers reported without a chromosome assignment. Where the dedicated chromosome field was blank or malformed, the resolver attempted recovery from the embedded QTL/marker identifier (e.g., "Qhd.tamu.5B", "chr5B_18621222"), consistent with standard wheat QTL nomenclature. Physical genome coordinates follow the IWGSC RefSeq v1.0 pseudomolecule assembly (GCA_900519105.1).

### Species-name standardization

Raw species labels (39 distinct spellings, reflecting inconsistent author abbreviation, trailing authority citations, and ploidy annotations) were mapped to 12 canonical binomial designations spanning *Triticum aestivum*, *T. durum*, *T. turgidum* (and subspecies *dicoccoides*, *dicoccum*), *T. monococcum*, and their wild relatives (*Aegilops tauschii*, *Ae. cylindrica*, *Ae. crassa*) where studies used interspecific populations.

### Trait classification

Each record's trait and parameter fields were classified into one of 16 mutually exclusive biological trait categories (yield, fungal/bacterial/viral/nematode/insect resistance, abiotic stress, biofortification, nutrient-use efficiency, quality traits, developmental traits, morphological traits, physiological traits, herbicide tolerance, pre-harvest sprouting, and an "other" residual) via a keyword-matching classifier applied consistently across the QTL, MetaQTL, and epistatic tables and across all downstream visualizations.

### Redundancy removal

Exact byte-for-byte duplicate records — arising from copy-paste entry errors within individual source spreadsheets — were identified and collapsed to a single instance, removing 5,626 QTL, 69 MetaQTL, and 44 epistatic-QTL duplicate rows prior to final table construction.

### Database development, software architecture, and hosting

**Design rationale.** WheatQTLdb V3.0 was rebuilt as a fully static, serverless web application rather than a conventional relational-database-plus-backend deployment. Because the underlying data are curated in discrete batches (literature review cycles) rather than updated transactionally by end users, a static architecture removes the operational burden and security surface of a live database server and API layer, while every data change remains fully version-controlled, auditable, and reproducible through the project's Git history.

**Frontend application.** The client is a single-page application (SPA) built with React 18.3 and TypeScript 5.6, compiled and bundled with Vite 5.4. Client-side routing (`react-router-dom` 6.28) serves fourteen application routes — a landing page, an interactive statistics dashboard, three tabular data-browsing pages (QTL, MetaQTL, epistatic QTL), a candidate-gene index, an advanced multi-criteria search interface, a combined genome-visualization page, and supporting informational pages (team, contact, credits, useful links) — from a single compiled JavaScript bundle with no server-side rendering or per-request computation. Visual design uses Tailwind CSS 3.4 with a custom design-token system (a dedicated "wheat" brand color scale and an "ink" dark-mode elevation scale) supporting both light and dark themes. Tabular data browsing is implemented with `@tanstack/react-table` 8.20 (client-side sorting, filtering, and pagination over the in-memory curated tables); summary charts use `recharts` 2.13; iconography uses `lucide-react`.

**Data layer.** The three curated tables (QTL, MetaQTL, epistatic QTL) and a candidate-gene index are distributed as static, git-versioned CSV files under `public/data/` (18 MB, 696 KB, 356 KB, and 4 KB respectively at the current release), parsed client-side at load time with `papaparse` 5.4 and held in browser memory for search and visualization. This "flat-file data layer" design means the production deployment requires no database engine, connection pooling, or query layer to serve — every page load is a static-asset fetch, and the entire application scales through standard HTTP/CDN caching rather than database read-replica infrastructure.

**Data curation and processing pipeline.** Upstream of the static data layer, a set of offline Python scripts (`convert_datasets.py` and companions) perform the literature-to-table extraction, chromosome and species-name standardization, trait classification, and exact-duplicate removal described in the preceding subsections. These scripts are run once per curation cycle in the development environment (not at request time), and their output is committed directly as the new `public/data/*.csv` release, giving every deployed version of the database a complete, reproducible provenance trail from raw curation spreadsheet to production data file.

**Genome-visualization modules.** Two complementary, purpose-built React/SVG components render the curated data against real IWGSC RefSeq v1.0 physical chromosome coordinates: a Circos-style circular genome plot (`CircosMap.tsx`; per-trait-category concentric tracks for both QTL and MetaQTL, and rendered chords for QTL × QTL epistatic interactions) and a linear chromosome-ideogram view (`IdeogramMap.tsx`, `ChromosomeMap.tsx`; genome-colored chromosome bars, a physical-scale ruler, a QTL density strip, and MetaQTL interval brackets). Both visualizations plot only physically-anchored (base-pair-resolved) records; genetic-map-only (centimorgan) records are explicitly excluded from chromosome-scale plotting rather than being projected onto physical coordinates by proportional scaling, to avoid presenting a fabricated physical position for markers that were never physically mapped. Manuscript-quality static figures (the circos overview figure and the summary-statistics figure) were produced separately in R (v4.x) using `circlize` and `ggplot2`/`patchwork`, respectively.

**Build and deployment pipeline.** Production builds are produced with `vite build` (TypeScript project-reference compilation followed by Rollup-based bundling, minification, and static-asset hashing), emitting a fully static output directory (HTML, JS, CSS, and the data/image assets) with no build-time or run-time dependency on a database or application server. A `404.html` fallback (a copy of the compiled `index.html`) is served for any deep-linked SPA route so that a direct link or page refresh on, e.g., `/data/qtl` resolves correctly instead of returning a server 404.

**Hosting infrastructure.** The compiled static site is hosted at **wheatqtldb.clemson.edu**, on infrastructure maintained by the Rustagi laboratory, Department of Plant and Environmental Sciences, Clemson University, under the direction of Dr. Sachin Rustagi. The static build artifact is served directly from this lab-managed server [Linux, Nginx]; because the deployed application performs no server-side computation, hosting requirements are limited to static-file serving with HTTPS termination and a client-side-routing fallback rule (all non-asset request paths resolved to the compiled `index.html`/`404.html`), rather than application-server process management, database administration, or API-layer maintenance.

**Availability and sustainability.** Because the entire production artifact — code, curated data, and build configuration — is git-versioned, the database can be redeployed, mirrored, or migrated to alternate infrastructure at any time without data loss or vendor lock-in, and each successive curation release (V1.0 → V3.0) is independently reproducible from its corresponding commit. The static architecture also minimizes the long-term maintenance burden relative to a conventional database-backed deployment: there is no database engine to patch or upgrade, no API surface to secure, and no query layer whose performance depends on server load, which together support continued public availability of the resource with modest ongoing systems-administration effort.

---

## Results

### Database content overview

WheatQTLdb V3.0 curates **84,529 QTL**, **3,018 MetaQTL**, and **1,193 epistatic QTL-pair** records (88,740 total), each traceable to its originating publication. Records derive from approximately **1,578 distinct source studies** (identified by normalized DOI or, where a DOI was unavailable, literature citation text), reflecting the breadth of the underlying wheat QTL-mapping literature synthesized into the database. A subset of records — predominantly from GWAS panels reported without an explicit chromosome column — could not be anchored to a specific chromosome (8.5% of QTL records) and are retained in the database under an explicit "unplaced" category rather than being discarded, preserving their trait and marker information for search while excluding them from chromosome-scale visualizations. Candidate genes are annotated for 5,867 QTL (6.9%), and a phenotypic variance explained (PVE) estimate is available for 52,521 QTL (62.1%). Mapping methods are dominated by mixed linear model GWAS approaches (MLM, FarmCPU, BLINK, CMLM; collectively >45% of QTL) alongside classical bi-parental interval/composite-interval mapping (CIM, ICIM, IM).

### Genomic distribution

Among chromosome-anchored QTL, the B subgenome carries the largest share (31,145 QTL; 40.2% of anchored records), followed by the A subgenome (28,126; 36.3%) and the D subgenome (18,104; 23.4%). This ordering mirrors the relative physical sizes of the three subgenomes in the IWGSC RefSeq v1.0 assembly (B > A > D), consistent with QTL density scaling broadly with chromosome length rather than indicating disproportionate trait enrichment on any one subgenome. MetaQTL show a similar subgenome ordering (B: 1,163; A: 1,122; D: 723).

### Trait spectrum

Abiotic stress tolerance is the single largest trait category among QTL (35,584 records; 42.1%), reflecting the intensity of drought-, heat-, and salinity-tolerance mapping efforts in the source literature, followed by yield-component traits (14,722; 17.4%), fungal disease resistance (8,065; 9.5%), biofortification/grain mineral-content traits (6,649; 7.9%), and nutrient-use efficiency (5,692; 6.7%). The remaining categories — quality, developmental, morphological, and physiological traits, pre-harvest sprouting, herbicide tolerance, and bacterial/viral/insect resistance — together account for the balance. The MetaQTL table shows a markedly different profile, weighted toward morphological (22.8%), yield (19.1%) and fungal-resistance (14.2%) consensus regions, consistent with these trait classes having accumulated enough independent QTL-mapping studies over time to support formal meta-analysis; abiotic-stress MetaQTL remain comparatively under-represented (9.2%) relative to their dominance in the primary QTL literature, suggesting an area where future meta-QTL synthesis would be valuable.

### Epistatic interactions

Of 1,193 curated epistatic QTL pairs, 699 (58.6%) are intra-chromosomal (both interacting loci on the same chromosome) and 344 (28.8%) are inter-chromosomal, with the remainder involving an unplaced locus. Epistatic pairs are heavily skewed toward yield (44.0%), abiotic stress (19.8%) and morphological traits (19.1%), indicating that epistatic mapping efforts in wheat have concentrated on complex, polygenic agronomic traits rather than qualitative disease-resistance loci.

### QTL–MetaQTL concordance

To assess how comprehensively the curated MetaQTL consensus regions summarize the underlying primary-QTL evidence, every chromosome-anchored, position-resolved QTL was tested for containment within any MetaQTL interval on the same chromosome (positions harmonized to a common physical bp scale per chromosome). **89.8% of chromosome-mapped QTL (59,283 of 66,010) fall within at least one MetaQTL interval**, indicating that the curated MetaQTL set captures the large majority of independently reported QTL signal, while the remaining ~10% represents QTL evidence not yet consolidated into a formal meta-analysis — a natural target for future meta-QTL curation.

---

## Biological insights (discussion-ready paragraph)

The trait and genomic distributions curated in WheatQTLdb V3.0 reflect two decades of wheat QTL-mapping priorities shaped by global breeding pressures. The dominance of abiotic-stress QTL (42.1% of records) is consistent with drought, heat, and salinity tolerance being the primary breeding targets under climate change, while the comparatively modest MetaQTL representation for this category (9.2%) suggests that abiotic-stress QTL mapping has outpaced formal meta-analytic consolidation — individual studies are accumulating faster than they are being synthesized into consensus intervals, an important gap this database is positioned to help close. The subgenome-proportional QTL density (B > A > D, tracking physical chromosome length) argues against a strong intrinsic subgenome bias in trait control and instead reflects marker/gene density scaling with sequence length, a useful null expectation when interpreting QTL hotspots. The high QTL–MetaQTL concordance (89.8%) is a meaningful internal validation: it indicates that the curated MetaQTL intervals genuinely summarize the primary literature rather than representing an independent or incomplete sampling, lending confidence to their use as consensus targets for marker-assisted selection and fine-mapping. Finally, the strong skew of epistatic interactions toward intra-chromosomal pairs (58.6%) and complex traits (yield, abiotic stress, morphology) is consistent with linked-QTL epistasis being more readily detected than inter-chromosomal epistasis in typical bi-parental population sizes, and highlights yield and stress-tolerance loci as priority candidates for higher-order (epistatic) marker-assisted selection strategies in wheat breeding.

---

## Literature coverage note

Based on normalized DOI (or, when no DOI was recorded, full citation text) as the study identifier, WheatQTLdb V3.0 draws on approximately **1,578 distinct published studies**. This is a lower-bound estimate: DOIs were normalized for common formatting variants (protocol prefixes, `doi:` labels, URL fragments), but a small number of studies may still be split across two identifiers if a source spreadsheet cited the same paper inconsistently (e.g., once via DOI and once via a publisher landing-page URL). 4,893 records (5.5% of the database) carry neither a DOI nor reference text and are excluded from this count; conversely, some records legitimately share a single study (a paper reporting many QTL/MetaQTL in one publication), so the study count is intentionally much smaller than the record count.
