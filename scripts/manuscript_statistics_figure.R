# Publication-quality, multi-panel statistics figure for the manuscript.
# Coded by Ankush Sharma <mr.ank2999@gmail.com>
#
# Requires: install.packages(c("ggplot2","patchwork","scales","dplyr","forcats"))
# Run: Rscript scripts/manuscript_statistics_figure.R
#
# Produces manuscript_statistics_figure.svg / .pdf: six panels summarising the
# curated QTL/MetaQTL/epistatic-QTL data - record totals, trait-category and
# chromosome distributions, species composition, publication-year trend, and
# the fraction of QTLs that fall inside a MetaQTL consensus interval (the one
# genuinely cross-table, biologically meaningful statistic in the set).

suppressPackageStartupMessages({
  library(ggplot2)
  library(patchwork)
  library(scales)
  library(dplyr)
  library(forcats)
})

OUT_PREFIX <- "manuscript_statistics_figure"

# ---------- Shared palette (kept in sync with src/lib/map.ts / metaqtl_circos_figure.R) ----------
trait_cols <- c(
  "Yield"             = "#2e7d32",
  "Fungal resistance" = "#c62828",
  "Quality traits"    = "#d4a017",
  "Abiotic stress"    = "#1565c0",
  "Biofortification"  = "#7b1fa2",
  "Bacterial resistance" = "#0e8fa0",
  "Nematode resistance"  = "#ef6c00",
  "Herbicide tolerance"  = "#5c6bc0",
  "Developmental"      = "#0f9178",
  "Morphological"      = "#a05a2c",
  "N-use efficiency"   = "#0277bd",
  "Physiological traits" = "#5e35b1",
  "Insect resistance"    = "#c2185b",
  "Viral resistance"     = "#7cb342",
  "Pre-harvest sprouting" = "#33691e",
  "Other"              = "#a87025"
)

genome_col <- c("A" = "#e8a33d", "B" = "#4f8fc0", "D" = "#5fa777", "Un" = "#9e9e9e")

chr_lengths <- c(
  "1A" = 594102056, "1B" = 689851870, "1D" = 495453186,
  "2A" = 780798557, "2B" = 801256715, "2D" = 651852609,
  "3A" = 750843639, "3B" = 830829764, "3D" = 615552423,
  "4A" = 744588157, "4B" = 673617499, "4D" = 509857067,
  "5A" = 709773743, "5B" = 713149757, "5D" = 566080677,
  "6A" = 618079260, "6B" = 720988478, "6D" = 473592718,
  "7A" = 736706236, "7B" = 750620385, "7D" = 638686055
)
chr_order <- c(names(chr_lengths)[order(as.integer(substr(names(chr_lengths), 1, 1)),
                                          substr(names(chr_lengths), 2, 2))], "Un")

theme_pub <- theme_minimal(base_size = 10, base_family = "sans") +
  theme(
    panel.grid.minor = element_blank(),
    panel.grid.major = element_line(color = "grey90", linewidth = 0.3),
    plot.title = element_text(face = "bold", size = 11, margin = margin(b = 4)),
    axis.title = element_text(size = 9, color = "grey30"),
    legend.position = "none",
    plot.margin = margin(6, 10, 6, 6)
  )

# ---------- Helpers (kept in sync with normalizeTrait() in src/lib/map.ts) ----------
normalize_trait <- function(trait, parameter) {
  t <- tolower(paste(c(ifelse(is.na(trait), "", trait), ifelse(is.na(parameter), "", parameter)), collapse = " "))
  if (grepl("yield|grain weight|tgw", t)) return("Yield")
  if (grepl("fungal|fhb|rust|mildew|blight|smut|bunt|powdery|septoria|tan spot", t)) return("Fungal resistance")
  if (grepl("quality|protein|gluten|hardness|sediment|dough|test weight", t)) return("Quality traits")
  if (grepl("sprouting|dormancy", t)) return("Pre-harvest sprouting")
  if (grepl("salt|drought|heat|cold|abiotic|osmotic|water-?log|water log|alumin|frost|toxic", t)) return("Abiotic stress")
  if (grepl("use efficiency|n-use|n use|nue|nitrogen", t)) return("N-use efficiency")
  if (grepl("zinc|zink|iron|selenium|biofort|mineral|cadmium|calcium|sulph|sulfur|manganese|copper|nickel|molybden|phosphor|potassium|cobalt|rubidium|lead|strontium|arsenic|sodium|boron|lithium|barium|platinum|co |mo |grain fe|grain zn", t)) return("Biofortification")
  if (grepl("bacterial|leaf streak|bls", t)) return("Bacterial resistance")
  if (grepl("virus|viral", t)) return("Viral resistance")
  if (grepl("nematode|cereal cyst", t)) return("Nematode resistance")
  if (grepl("insect", t)) return("Insect resistance")
  if (grepl("disease", t)) return("Fungal resistance")
  if (grepl("herbicide", t)) return("Herbicide tolerance")
  if (grepl("development|heading|vernal|photoperiod|earliness|flowering|maturity", t)) return("Developmental")
  if (grepl("morpholog|plant height|tiller|awn|spike length", t)) return("Morphological")
  if (grepl("physiological", t)) return("Physiological traits")
  return("Other")
}

parse_position <- function(interval) {
  interval <- as.character(interval)
  if (is.na(interval) || interval == "" || interval == "-") return(c(point = NA_real_, start = NA_real_, end = NA_real_))
  interval <- gsub("−", "-", interval); interval <- gsub("\\s+", "", interval)
  m <- regmatches(interval, regexec("^([0-9.]+)\\(?([0-9.]*)[-–]([0-9.]*)\\)?$", interval))[[1]]
  if (length(m) == 4) {
    point <- as.numeric(m[2]); start <- suppressWarnings(as.numeric(m[3])); end <- suppressWarnings(as.numeric(m[4]))
    if (is.na(start)) start <- point
    if (is.na(end)) end <- point
    return(c(point = point, start = min(start, end, na.rm = TRUE), end = max(start, end, na.rm = TRUE)))
  }
  single <- suppressWarnings(as.numeric(interval))
  if (!is.na(single)) return(c(point = single, start = single, end = single))
  return(c(point = NA_real_, start = NA_real_, end = NA_real_))
}

extract_year <- function(reference) {
  m <- regmatches(reference, regexpr("(19|20)[0-9]{2}", reference))
  ifelse(length(m) == 0, NA_character_, m)
}

# ---------- Load data (already chromosome/species-normalized by convert_datasets.py) ----------
qtl <- read.csv("public/data/qtl.csv", stringsAsFactors = FALSE, na.strings = c("", "NA"))
mqtl <- read.csv("public/data/metaqtl.csv", stringsAsFactors = FALSE, na.strings = c("", "NA"))
epi <- read.csv("public/data/epistatic.csv", stringsAsFactors = FALSE, na.strings = c("", "NA"))

qtl$category <- mapply(normalize_trait, qtl$trait, qtl$parameter)
mqtl$category <- mapply(normalize_trait, mqtl$trait, mqtl$parameter)

message(sprintf("QTL: %d | MetaQTL: %d | Epistatic: %d", nrow(qtl), nrow(mqtl), nrow(epi)))

# ---------- Panel A: record totals ----------
totals <- data.frame(
  table = factor(c("QTL", "MetaQTL", "Epistatic"), levels = c("QTL", "MetaQTL", "Epistatic")),
  n = c(nrow(qtl), nrow(mqtl), nrow(epi))
)
pA <- ggplot(totals, aes(table, n, fill = table)) +
  geom_col(width = 0.65) +
  geom_text(aes(label = comma(n)), vjust = -0.4, size = 3, color = "grey20") +
  scale_fill_manual(values = c(QTL = "#cc9d3f", MetaQTL = "#9a6628", Epistatic = "#5e3a1f")) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.15))) +
  labs(title = "A. Record totals", x = NULL, y = "Records") +
  theme_pub

# ---------- Panel B: QTL by trait category ----------
cat_counts <- qtl %>% count(category, name = "n") %>% arrange(desc(n)) %>%
  mutate(category = fct_reorder(category, n))
pB <- ggplot(cat_counts, aes(n, category, fill = category)) +
  geom_col(width = 0.72) +
  scale_fill_manual(values = trait_cols) +
  scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.08))) +
  labs(title = "B. QTL by trait category", x = "QTL count", y = NULL) +
  theme_pub

# ---------- Panel C: QTL by chromosome, coloured by subgenome ----------
chr_counts <- qtl %>% count(chromosome, name = "n") %>%
  mutate(chromosome = factor(chromosome, levels = chr_order),
         genome = ifelse(chromosome == "Un", "Un", substr(as.character(chromosome), 2, 2))) %>%
  filter(!is.na(chromosome))
pC <- ggplot(chr_counts, aes(chromosome, n, fill = genome)) +
  geom_col(width = 0.72) +
  scale_fill_manual(values = genome_col, name = "Subgenome") +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.08))) +
  labs(title = "C. QTL by chromosome", x = NULL, y = "QTL count") +
  theme_pub +
  theme(axis.text.x = element_text(angle = 45, hjust = 1, size = 7), legend.position = "top",
        legend.title = element_text(size = 8), legend.text = element_text(size = 7),
        legend.key.size = unit(0.35, "cm"))

# ---------- Panel D: species composition ----------
sp_counts <- qtl %>% mutate(species = ifelse(is.na(species) | species == "", "Not reported", species)) %>%
  count(species, name = "n") %>% arrange(desc(n)) %>% mutate(species = fct_reorder(species, n))
pD <- ggplot(sp_counts, aes(n, species)) +
  geom_col(width = 0.7, fill = "#7c4d24") +
  scale_x_log10(labels = comma) +
  labs(title = "D. QTL by species (log scale)", x = "QTL count", y = NULL) +
  theme_pub

# ---------- Panel E: publications by year ----------
qtl$year <- suppressWarnings(as.integer(extract_year(qtl$reference)))
year_counts <- qtl %>% filter(!is.na(year), year >= 1990, year <= 2026) %>% count(year, name = "n")
pE <- ggplot(year_counts, aes(year, n)) +
  geom_col(width = 0.8, fill = "#b88231") +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.08))) +
  labs(title = "E. QTL records by publication year", x = NULL, y = "QTL count") +
  theme_pub +
  theme(axis.text.x = element_text(angle = 45, hjust = 1, size = 7))

# ---------- Panel F: QTL coverage by MetaQTL consensus intervals ----------
qp <- t(sapply(qtl$position_interval, parse_position))
qtl$point <- as.numeric(qp[, "point"])
mp <- t(sapply(mqtl$position_interval, parse_position))
mqtl$start <- as.numeric(mp[, "start"]); mqtl$end <- as.numeric(mp[, "end"])

# Normalise every position onto a common per-chromosome bp scale: values >=
# 1000 are already bp; smaller values are cM, scaled by that chromosome's
# observed max cM (same convention as the circos script / src/lib/map.ts).
combo <- rbind(
  data.frame(chr = qtl$chromosome, v = qtl$point),
  data.frame(chr = mqtl$chromosome, v = mqtl$start),
  data.frame(chr = mqtl$chromosome, v = mqtl$end)
)
cm_max <- combo %>% filter(!is.na(v), v < 1000) %>% group_by(chr) %>% summarise(m = max(v), .groups = "drop")
cm_max_v <- setNames(cm_max$m, cm_max$chr)

to_bp <- function(chr, v) {
  len <- chr_lengths[chr]
  ifelse(is.na(v) | is.na(len), NA_real_,
         ifelse(v >= 1000, pmin(v, len), (v / pmax(cm_max_v[chr], 1, na.rm = TRUE)) * len))
}

qtl$bp <- to_bp(qtl$chromosome, qtl$point)
mqtl$bp_start <- to_bp(mqtl$chromosome, mqtl$start)
mqtl$bp_end <- to_bp(mqtl$chromosome, mqtl$end)

qtl_mapped <- qtl %>% filter(chromosome %in% names(chr_lengths), !is.na(bp))
mqtl_mapped <- mqtl %>% filter(chromosome %in% names(chr_lengths), !is.na(bp_start), !is.na(bp_end)) %>%
  mutate(lo = pmin(bp_start, bp_end), hi = pmax(bp_start, bp_end))

overlap_flag <- sapply(seq_len(nrow(qtl_mapped)), function(i) {
  chr <- qtl_mapped$chromosome[i]; pt <- qtl_mapped$bp[i]
  ivs <- mqtl_mapped[mqtl_mapped$chromosome == chr, ]
  if (nrow(ivs) == 0) return(FALSE)
  any(pt >= ivs$lo & pt <= ivs$hi)
})
qtl_mapped$in_meta <- overlap_flag

overlap_pct <- round(100 * mean(qtl_mapped$in_meta), 1)
message(sprintf("QTL coverage by MetaQTL intervals: %.1f%% (%d of %d chromosome-mapped QTLs)",
                 overlap_pct, sum(qtl_mapped$in_meta), nrow(qtl_mapped)))

cov_by_chr <- qtl_mapped %>%
  mutate(chromosome = factor(chromosome, levels = chr_order[chr_order != "Un"])) %>%
  count(chromosome, in_meta) %>%
  mutate(status = ifelse(in_meta, "Within a MetaQTL", "Outside all MetaQTLs"))

pF <- ggplot(cov_by_chr, aes(chromosome, n, fill = status)) +
  geom_col(width = 0.72, position = "stack") +
  scale_fill_manual(values = c("Within a MetaQTL" = "#2e7d32", "Outside all MetaQTLs" = "#d8b665"),
                     name = NULL) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.08))) +
  labs(title = sprintf("F. QTL coverage by MetaQTL intervals (%.1f%% overall)", overlap_pct),
       x = NULL, y = "QTL count") +
  theme_pub +
  theme(axis.text.x = element_text(angle = 45, hjust = 1, size = 7), legend.position = "top",
        legend.text = element_text(size = 7))

# ---------- Compose ----------
fig <- (pA | pD) / (pB | pC) / (pE | pF) +
  plot_layout(heights = c(0.8, 1.3, 1))

fig <- fig + plot_annotation(
  title = "WheatQTLdb V3.0 — summary statistics",
  subtitle = sprintf("%s QTL, %s MetaQTL and %s epistatic-QTL records curated from published wheat genetics literature",
                      comma(nrow(qtl)), comma(nrow(mqtl)), comma(nrow(epi))),
  theme = theme(plot.title = element_text(face = "bold", size = 15),
                plot.subtitle = element_text(size = 10, color = "grey30"))
)

ggsave(paste0(OUT_PREFIX, ".svg"), fig, width = 12, height = 14, units = "in")
ggsave(paste0(OUT_PREFIX, ".pdf"), fig, width = 12, height = 14, units = "in")
message("Saved: ", OUT_PREFIX, ".svg and .pdf")
