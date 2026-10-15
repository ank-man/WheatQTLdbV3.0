#!/usr/bin/env Rscript
# WheatQTLdb V3.0 database flowchart: sources -> curation & validation -> data -> analyses -> website.
# Drawn with DiagrammeR (Graphviz); every count is read from public/data/ so the chart follows rebuilds.
# Writes figures/database_flowchart.{svg,png,jpeg}.
# Usage: Rscript scripts/flowchart.R      (from the project root; needs DiagrammeR, DiagrammeRsvg, rsvg)
suppressPackageStartupMessages({ library(DiagrammeR); library(DiagrammeRsvg); library(rsvg); library(data.table) })

d   <- function(f) fread(file.path("public/data", f), colClasses = "character", showProgress = FALSE)
qtl <- d("qtl.csv"); mq <- d("metaqtl.csv"); epi <- d("epistatic.csv"); pub <- d("publications.csv")
cg  <- d("candidate_genes.csv"); maps <- d("maps.csv"); ml <- d("map_loci.csv")
ga  <- d("gwas_atlas_summary.csv"); ex <- d("extracted_qtl_summary.csv"); pend <- d("pending_studies.csv")
f <- function(x) format(as.numeric(x), big.mark = ",")

n_src  <- length(list.files("Final_data/Updated data (2.0+3.0)", pattern = "\\.(xlsx?|csv)$", recursive = TRUE))
n_mt   <- sum(qtl$multi_trait == "yes")
n_phys <- sum(grepl("Mb|bp|^[0-9]{5,}", qtl$position_interval))
n_view <- length(unique(ml$map_id))
n_cg   <- length(unique(cg$gene))
n_yr   <- sum(qtl$year != "")

lab <- function(title, detail, big = NULL) {
  b <- if (!is.null(big)) sprintf("<FONT POINT-SIZE='22' COLOR='#15803D'><B>%s</B></FONT><BR/>", big) else ""
  sprintf("<%s<FONT POINT-SIZE='13'><B>%s</B></FONT><BR/><FONT POINT-SIZE='10' COLOR='#57575F'>%s</FONT>>", b, title, detail)
}

g <- sprintf('
digraph db {
  graph [rankdir = LR, bgcolor = "white", fontname = "Helvetica", nodesep = 0.28, ranksep = 0.75, pad = 0.4,
         splines = spline, newrank = true, compound = true, label = <%s>, labelloc = t, labeljust = l, fontsize = 12]
  node  [shape = box, style = "rounded,filled", fontname = "Helvetica", color = "#D6DBD6", fillcolor = "white",
         penwidth = 1.1, margin = "0.18,0.10", width = 2.6]
  edge  [color = "#B7C0B8", arrowsize = 0.6, penwidth = 1.2]

  subgraph cluster_src  { label = <<B>1  SOURCES</B>>; CLUSTER
    cur [label = %s]; gwa [label = %s]; lit [label = %s]; gg [label = %s] }
  subgraph cluster_proc { label = <<B>2  CURATION &amp; VALIDATION</B>>; CLUSTER
    conv [label = %s]; tax [label = %s]; pubr [label = %s]; val [label = %s] }
  subgraph cluster_data { label = <<B>3  DATA</B>>; CLUSTER
    q [label = %s, color = "#15803D", penwidth = 1.7]; m [label = %s]; e [label = %s]; mt [label = %s]; p [label = %s] }
  subgraph cluster_ext  { label = <<B>4  LINKED RESOURCES</B>>; CLUSTER
    cand [label = %s]; lm [label = %s]; atlas [label = %s]; pen [label = %s] }
  subgraph cluster_web  { label = <<B>5  WEBSITE</B>>; CLUSTER
    srch [label = %s]; gmap [label = %s]; stat [label = %s]; help [label = %s] }

  { rank = same; cur; gwa; lit; gg }
  { rank = same; conv; tax; pubr; val }
  { rank = same; q; m; e; mt; p }
  { rank = same; cand; lm; atlas; pen }
  { rank = same; srch; gmap; stat; help }
  conv -> tax -> pubr -> val [constraint = false]

  cur -> conv [ltail = cluster_src, lhead = cluster_proc]
  val -> q [ltail = cluster_proc, lhead = cluster_data]
  q -> cand [ltail = cluster_data, lhead = cluster_ext]
  atlas -> gmap [ltail = cluster_ext, lhead = cluster_web]
}',
  "<FONT POINT-SIZE='22'><B>WheatQTLdb V3.0</B></FONT><BR/><FONT POINT-SIZE='11' COLOR='#57575F'>Curated QTL, MetaQTL, epistatic and multi-trait QTL of wheat and its relatives, with publications, genes, maps and a genome browser</FONT><BR/>",
  lab("Curated spreadsheets", sprintf("Final_data: v2.0 + v3.0 trait files<BR/>%s source files", n_src)),
  lab("GWAS Atlas", "NGDC wheat associations<BR/>(papers not curated here)"),
  lab("Literature", "Europe PMC search<BR/>open-access tables · Crossref"),
  lab("GrainGenes &amp; papers", "linkage-map catalogue<BR/>supplementary map tables"),
  lab("Harmonise &amp; de-duplicate", "names, chromosomes, positions<BR/>encoding repair · exact duplicates removed"),
  lab("Trait taxonomy", "5 main traits, sub-categories<BR/>audited against the curators&#39; table"),
  lab("Publications", sprintf("DOI / PubMed resolution<BR/>year for %s of %s QTL", f(n_yr), f(nrow(qtl)))),
  lab("Validation", "schema, ranges, years, exclusions<BR/>every rebuild must pass"),
  lab("QTL / MTA", "main-effect QTL and marker-trait associations", f(nrow(qtl))),
  lab("MetaQTL", "consensus regions across studies", f(nrow(mq))),
  lab("Epistatic QTL", "QTL x QTL interactions", f(nrow(epi))),
  lab("Multi-trait QTL", "curated multi-trait files", f(n_mt)),
  lab("Publications", "title, authors, journal, year", f(nrow(pub))),
  lab("Candidate genes", sprintf("%s candidate genes<BR/>GrainGenes / Ensembl Plants links", f(n_cg))),
  lab("Linkage maps", sprintf("%s maps · %s with marker positions", f(nrow(maps)), f(n_view))),
  lab("GWAS Atlas associations", sprintf("%s associations · %s papers", f(ga$associations), f(ga$publications))),
  lab("Studies awaiting curation", sprintf("%s candidate papers<BR/>%s auto-extracted QTL (unverified)", f(nrow(pend)), f(ex$records))),
  lab("Search &amp; tables", "trait · chromosome · species · PVE · CSV"),
  lab("Genome map", "ideogram · Circos · linkage (cM)"),
  lab("Statistics", "trait, chromosome, year charts"),
  lab("Guide &amp; news", "annotated tutorial · Word guide")
)
g <- gsub("CLUSTER", "fontcolor = \"#15803D\"; fontsize = 12; color = \"#E4EBE5\"; style = \"rounded,filled\"; fillcolor = \"#F8FBF8\"; margin = 14;", g)

svg <- export_svg(grViz(g))
# left-align the title with the subtitle (Graphviz centres the HTML title block)
sx <- sub('.* x="([^"]+)".*', "\\1", regmatches(svg, regexpr('<text[^>]*font-size="11.00"[^>]*>', svg)))
svg <- sub('(<text text-anchor="start" x=")[^"]+("[^>]*font-size="22.00"[^>]*>WheatQTLdb)', paste0("\\1", sx, "\\2"), svg)
dir.create("figures", showWarnings = FALSE)
writeLines(svg, "figures/database_flowchart.svg")
rsvg_png(charToRaw(svg), "figures/database_flowchart.png", width = 4000)
cat("wrote figures/database_flowchart.svg / .png\n")
