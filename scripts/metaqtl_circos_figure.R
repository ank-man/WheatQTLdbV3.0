# MetaQTL-only circos figure for manuscript
# Requires: install.packages("circlize")
# Run: Rscript scripts/metaqtl_circos_figure.R
#
# Coded by Ankush Sharma <mr.ank2999@gmail.com>

library(circlize)

# ---------- Configuration ----------
CSV_PATH <- file.path("public", "data", "metaqtl.csv")
EPISTATIC_CSV_PATH <- file.path("public", "data", "epistatic.csv")
OUT_PREFIX <- "metaqtl_circos"

# IWGSC RefSeq v1.0 pseudomolecule lengths (bp), GCA_900519105.1.
# Cross-checked against Ensembl Plants' triticum_aestivum assembly info.
chr_lengths <- c(
  "1A" = 594102056, "1B" = 689851870, "1D" = 495453186,
  "2A" = 780798557, "2B" = 801256715, "2D" = 651852609,
  "3A" = 750843639, "3B" = 830829764, "3D" = 615552423,
  "4A" = 744588157, "4B" = 673617499, "4D" = 509857067,
  "5A" = 709773743, "5B" = 713149757, "5D" = 566080677,
  "6A" = 618079260, "6B" = 720988478, "6D" = 473592718,
  "7A" = 736706236, "7B" = 750620385, "7D" = 638686055
)

# Trait category colours (same as the web application)
# Kept in sync with src/lib/map.ts TRAIT_COLORS, which is validated with the
# dataviz skill's categorical checker (scripts/validate_palette.js) for OKLCH
# lightness band, chroma floor, CVD-safe separation and contrast.
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

# ---------- Helpers ----------
# Kept in sync with normalizeTrait() in src/lib/map.ts.
normalize_trait <- function(trait, parameter) {
  t <- tolower(paste(c(ifelse(is.na(trait), "", trait), ifelse(is.na(parameter), "", parameter)), collapse = " "))
  if (grepl("yield|grain weight|tgw", t)) return("Yield")
  if (grepl("fungal|fhb|rust|mildew|blight|smut|bunt|powdery|septoria|tan spot", t)) return("Fungal resistance")
  if (grepl("quality|protein|gluten|hardness|sediment|dough|test weight", t)) return("Quality traits")
  if (grepl("sprouting|dormancy", t)) return("Pre-harvest sprouting")
  if (grepl("salt|drought|heat|cold|abiotic|osmotic|water-?log|water log|alumin|frost|toxic", t)) return("Abiotic stress")
  if (grepl("use efficiency|n-use|n use|nue|nitrogen", t)) return("N-use efficiency")
  if (grepl("zinc|zink|iron|selenium|biofort|mineral|cadmium|calcium|sulph|sulfur|manganese|copper|nickel|molybden|phosphor|potassium|rubidium|lead|strontium|arsenic|sodium|boron|lithium|barium|platinum|co |mo |grain fe|grain zn", t)) return("Biofortification")
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

extract_chromosome <- function(chr, name) {
  chr <- as.character(chr)
  name <- as.character(name)
  m <- regmatches(chr, regexpr("^[1-7][ABD]$", chr))
  if (length(m) > 0 && nchar(m) > 0) return(m)
  m <- regmatches(name, regexpr("[Mm][Qq][Tt][Ll][_-]?([1-7][ABD])", name))
  if (length(m) > 0 && nchar(m) > 0) {
    subm <- regmatches(m, regexpr("[1-7][ABD]", m))
    if (length(subm) > 0) return(subm)
  }
  return(NA_character_)
}

# Recover a chromosome code (e.g. "5B") embedded in a QTL/marker identifier
# when the dedicated chromosome column is missing or malformed. Wheat QTL/MQTL
# names conventionally embed the chromosome (e.g. "Qhd.tamu.5B", "chr5B_...",
# "QCcnr.ccsu-1D.4"), so this recovers real locus information that would
# otherwise be silently dropped.
extract_chr_from_text <- function(x) {
  x <- as.character(x)
  if (is.na(x) || x == "") return(NA_character_)
  # Tier 1: explicit "chr" prefix, e.g. "chr5B_592211698"
  m <- regmatches(x, regexec("(?i)chr[_]?([1-7][abd])", x, perl = TRUE))[[1]]
  if (length(m) == 2) return(toupper(m[2]))
  # Tier 2: token cleanly bounded by separators on both sides,
  # e.g. "Qhd.tamu.5B", "QCcnr.ccsu-1D.4", "eqAl-1A-1"
  m <- regmatches(x, regexec("(?i)[-_. ]([1-7][abd])(?=[-_. ]|$)", x, perl = TRUE))[[1]]
  if (length(m) == 2) return(toupper(m[2]))
  # Tier 3 (low-confidence): bounded only on the left, e.g. "EQZn-2A1"
  m <- regmatches(x, regexec("(?i)[-_]([1-7][abd])", x, perl = TRUE))[[1]]
  if (length(m) == 2) return(toupper(m[2]))
  return(NA_character_)
}

parse_position <- function(interval) {
  interval <- as.character(interval)
  if (is.na(interval) || interval == "" || interval == "-") {
    return(c(point = NA_real_, start = NA_real_, end = NA_real_))
  }
  interval <- gsub("−", "-", interval)
  interval <- gsub("\\s+", "", interval)

  # form: 46.8(43.5-50.1)
  m <- regmatches(interval, regexec("^([0-9.]+)\\(?([0-9.]*)[-–]([0-9.]*)\\)?$", interval))[[1]]
  if (length(m) == 4) {
    point <- as.numeric(m[2])
    start <- suppressWarnings(as.numeric(m[3]))
    end   <- suppressWarnings(as.numeric(m[4]))
    if (is.na(start) || is.nan(start)) start <- point
    if (is.na(end)   || is.nan(end))   end <- point
    return(c(point = point, start = min(start, end, na.rm = TRUE), end = max(start, end, na.rm = TRUE)))
  }

  # form: 22.8/- or -/45.2 or 22.8/45.2 (the CSV uses "/" for some records)
  m <- regmatches(interval, regexec("^([0-9.]*)[/\\-]([0-9.]*)$", interval))[[1]]
  if (length(m) == 3) {
    left  <- suppressWarnings(as.numeric(m[2]))
    right <- suppressWarnings(as.numeric(m[3]))
    vals  <- c(left, right)
    vals  <- vals[!is.na(vals)]
    if (length(vals) == 0) return(c(point = NA_real_, start = NA_real_, end = NA_real_))
    point <- mean(vals)
    start <- min(vals)
    end   <- max(vals)
    return(c(point = point, start = start, end = end))
  }

  # form: 100-110.9
  m <- regmatches(interval, regexec("^([0-9.]+)[-–]([0-9.]+)$", interval))[[1]]
  if (length(m) == 3) {
    start <- as.numeric(m[2])
    end   <- as.numeric(m[3])
    return(c(point = (start + end) / 2, start = min(start, end), end = max(start, end)))
  }

  # single value
  single <- suppressWarnings(as.numeric(interval))
  if (!is.na(single)) {
    return(c(point = single, start = single, end = single))
  }

  return(c(point = NA_real_, start = NA_real_, end = NA_real_))
}

# ---------- Load and clean data ----------
df <- read.csv(CSV_PATH, stringsAsFactors = FALSE, na.strings = c("", "NA", "N/A"))

# Some rows have an empty chromosome but encode it in mqtl_name
df$chr <- mapply(extract_chromosome, df$chromosome, df$mqtl_name)
df <- df[!is.na(df$chr), ]

df$category <- mapply(normalize_trait, df$trait, df$parameter)
df$colour   <- trait_cols[df$category]

positions <- t(sapply(df$position_interval, parse_position))
df$point <- as.numeric(positions[, "point"])
df$start <- as.numeric(positions[, "start"])
df$end   <- as.numeric(positions[, "end"])

# Drop rows where we could not get a position
df <- df[!is.na(df$point), ]

# ---------- Determine coordinate units ----------
# Infer the unit for every MetaQTL row from the numeric magnitude: values below
# 1000 are treated as cM; values >= 1000 are treated as physical bp.
df$unit <- apply(df[, c("point", "start", "end")], 1, function(x) {
  if (any(!is.na(x) & x >= 1000)) return("bp") else return("cM")
})
n_cm  <- sum(df$unit == "cM", na.rm = TRUE)
n_bp  <- sum(df$unit == "bp", na.rm = TRUE)
message("Coordinate unit summary: ", n_cm, " cM rows; ", n_bp, " bp rows")

# ---------- Unit confirmation CSV ----------
# Record the unit inference for every MetaQTL together with its citation so
# you can cross-check the original study.  A row is flagged for review when the
# same reference reports both cM and bp coordinates.
df$unit_reason <- apply(df[, c("point", "start", "end")], 1, function(x) {
  vals <- x[!is.na(x)]
  if (any(vals >= 1000)) return("contains value >= 1000 -> bp") else return("all values < 1000 -> cM")
})

ref_units <- tapply(df$unit, df$reference, function(u) length(unique(u)))
df$needs_review <- ifelse(is.na(df$reference), FALSE, ref_units[df$reference] > 1)

confirmation_csv <- data.frame(
  id                = df$id,
  mqtl_name         = df$mqtl_name,
  chromosome        = df$chr,
  trait             = df$trait,
  parameter         = df$parameter,
  category          = df$category,
  position_interval = df$position_interval,
  parsed_start      = df$start,
  parsed_end        = df$end,
  inferred_unit     = df$unit,
  reason            = df$unit_reason,
  reference         = df$reference,
  doi               = df$doi,
  source_file       = df$source_file,
  needs_review      = df$needs_review,
  stringsAsFactors  = FALSE
)
write.csv(confirmation_csv, "metaqtl_unit_confirmation.csv", row.names = FALSE)
message("Saved unit confirmation CSV: metaqtl_unit_confirmation.csv")

# Print per-study unit summary to the console
study_units <- aggregate(unit ~ reference, df, function(u) paste(sort(unique(u)), collapse = "/"))
message("Per-study unit breakdown:")
print(study_units)

# ---------- Normalise coordinates ----------
# When every row is cM we plot on a cM scale; when every row is bp we plot on the
# physical bp scale; when they are mixed we convert cM to bp proportionally.
cm_max <- sapply(split(df[df$unit == "cM", c("point", "start", "end")], df$chr[df$unit == "cM"]), function(x) {
  max(c(as.vector(as.matrix(x))), na.rm = TRUE)
})

normalise_value <- function(value, chr, unit) {
  len <- chr_lengths[chr]
  res <- ifelse(unit == "bp", pmin(value, len), (value / cm_max[chr]) * len)
  pmax(0, pmin(as.integer(res), len))
}

if (n_bp == 0) {
  coord_unit <- "cM"
  chr_coord_len <- sapply(split(df[, c("point", "start", "end")], df$chr), function(x) {
    max(c(as.vector(as.matrix(x))), na.rm = TRUE)
  })
  df$plot_start <- df$start
  df$plot_end   <- df$end
} else if (n_cm == 0) {
  coord_unit <- "bp"
  chr_coord_len <- chr_lengths
  df$plot_start <- pmax(0, pmin(as.integer(df$start), chr_lengths[df$chr]))
  df$plot_end   <- pmax(0, pmin(as.integer(df$end),   chr_lengths[df$chr]))
} else {
  coord_unit <- "bp (cM rows scaled)"
  df$plot_start <- normalise_value(df$start, df$chr, df$unit)
  df$plot_end   <- normalise_value(df$end,   df$chr, df$unit)
  chr_coord_len <- chr_lengths
}

# If an interval collapsed to a point, give it a small visible width (~0.5% of
# the chromosome coordinate length), but never exceed the chromosome bounds.
vis_pad <- as.integer(chr_coord_len[df$chr] * 0.005)
df$plot_end <- pmin(pmax(df$plot_end, df$plot_start + vis_pad), chr_coord_len[df$chr])

# ---------- Load and normalise epistatic QTLs ----------
# Only marker names that literally encode a physical bp coordinate as
# "chr<chrom>_<digits>" (e.g. "chr3B_559428575") are trustworthy positions.
# Naively grabbing every digit run in a marker string (the previous approach)
# also picks up the "3" in "chr3B" itself, which silently corrupts the
# interval (e.g. turning "chr3B_559428575" into the range 3-559428575 -
# almost the entire chromosome). Marker/probe IDs without that prefix
# (SNP_12033, WSNP5306-WSNP2694, wmc728.1, AX-110669146) do not encode a
# genomic coordinate at all, so no position is fabricated for them.
parse_marker_positions <- function(markers) {
  markers <- as.character(markers)
  if (is.na(markers) || markers == "" || markers == "-") {
    return(c(start = NA_real_, end = NA_real_))
  }
  hits <- regmatches(markers, gregexpr("(?i)chr[1-7][abd][_-]?[0-9]+", markers, perl = TRUE))[[1]]
  nums <- suppressWarnings(as.numeric(gsub("(?i)^chr[1-7][abd][_-]?", "", hits, perl = TRUE)))
  nums <- nums[!is.na(nums)]
  if (length(nums) == 0) return(c(start = NA_real_, end = NA_real_))
  if (length(nums) == 1) return(c(start = nums[1], end = nums[1]))
  c(start = min(nums), end = max(nums))
}

epi_region1 <- NULL
epi_region2 <- NULL

if (file.exists(EPISTATIC_CSV_PATH)) {
  edf <- read.csv(EPISTATIC_CSV_PATH, stringsAsFactors = FALSE, na.strings = c("", "NA", "N/A"))

  p1 <- t(sapply(edf$position_interval1, parse_position))
  p2 <- t(sapply(edf$position_interval2, parse_position))
  m1 <- t(sapply(edf$markers1, parse_marker_positions))
  m2 <- t(sapply(edf$markers2, parse_marker_positions))

  edf$start1 <- ifelse(!is.na(p1[, "start"]), p1[, "start"], m1[, "start"])
  edf$end1   <- ifelse(!is.na(p1[, "end"]),   p1[, "end"],   m1[, "end"])
  edf$start2 <- ifelse(!is.na(p2[, "start"]), p2[, "start"], m2[, "start"])
  edf$end2   <- ifelse(!is.na(p2[, "end"]),   p2[, "end"],   m2[, "end"])

  edf$unit1 <- apply(cbind(edf$start1, edf$end1), 1, function(x) {
    if (any(!is.na(x) & x >= 1000)) return("bp") else return("cM")
  })
  edf$unit2 <- apply(cbind(edf$start2, edf$end2), 1, function(x) {
    if (any(!is.na(x) & x >= 1000)) return("bp") else return("cM")
  })

  # Several source studies leave chromosome1/chromosome2 blank or miswritten
  # (e.g. a population label instead of a chromosome code) even though the
  # chromosome is embedded in the QTL/marker identifier by convention. Recover
  # it from those identifiers instead of discarding the row outright.
  resolve_chr <- function(primary, qtl_name, markers) {
    primary <- as.character(primary)
    out <- ifelse(grepl("^[1-7][ABD]$", primary), primary, NA_character_)
    need <- is.na(out)
    if (any(need)) out[need] <- vapply(qtl_name[need], extract_chr_from_text, character(1))
    need <- is.na(out)
    if (any(need)) out[need] <- vapply(markers[need], extract_chr_from_text, character(1))
    out
  }

  edf$chr1 <- resolve_chr(edf$chromosome1, edf$qtl1, edf$markers1)
  chr2_recovered <- resolve_chr(edf$chromosome2, edf$qtl2, edf$markers2)
  # When the second locus's chromosome truly cannot be recovered, assume it is
  # on the same chromosome as the first locus. Reported epistatic pairs are
  # very commonly intra-chromosomal (linked QTLs on one linkage group), so
  # this is the more defensible default than dropping the interaction.
  chr2_intra_assumed <- is.na(chr2_recovered) & !is.na(edf$chr1)
  edf$chr2 <- ifelse(is.na(chr2_recovered), edf$chr1, chr2_recovered)

  valid_chr <- grepl("^[1-7][ABD]$", edf$chr1) & grepl("^[1-7][ABD]$", edf$chr2)
  message(
    "Epistatic chromosome recovery: ", sum(chr2_intra_assumed & valid_chr, na.rm = TRUE),
    " pairs had no recoverable locus-2 chromosome and were assumed intra-chromosomal; ",
    sum(!valid_chr), " rows dropped for unresolvable chromosome/position."
  )
  edf <- edf[valid_chr & !is.na(edf$start1) & !is.na(edf$start2), ]

  # Classify each epistatic pair the same way as the MetaQTL track data, so the
  # legend and colour scale are shared across the whole figure.
  edf$category <- mapply(normalize_trait, edf$trait, edf$parameter)

  if (n_bp == 0) {
    edf$plot_start1 <- edf$start1
    edf$plot_end1   <- edf$end1
    edf$plot_start2 <- edf$start2
    edf$plot_end2   <- edf$end2
  } else {
    edf$plot_start1 <- normalise_value(edf$start1, edf$chr1, edf$unit1)
    edf$plot_end1   <- normalise_value(edf$end1,   edf$chr1, edf$unit1)
    edf$plot_start2 <- normalise_value(edf$start2, edf$chr2, edf$unit2)
    edf$plot_end2   <- normalise_value(edf$end2,   edf$chr2, edf$unit2)
  }

  pad1 <- as.integer(chr_coord_len[edf$chr1] * 0.005)
  pad2 <- as.integer(chr_coord_len[edf$chr2] * 0.005)
  edf$plot_end1 <- pmin(pmax(edf$plot_end1, edf$plot_start1 + pad1), chr_coord_len[edf$chr1])
  edf$plot_end2 <- pmin(pmax(edf$plot_end2, edf$plot_start2 + pad2), chr_coord_len[edf$chr2])

  epi_region1 <- data.frame(
    chr   = edf$chr1,
    start = edf$plot_start1,
    end   = edf$plot_end1,
    stringsAsFactors = FALSE
  )
  epi_region2 <- data.frame(
    chr   = edf$chr2,
    start = edf$plot_start2,
    end   = edf$plot_end2,
    stringsAsFactors = FALSE
  )
  epi_category <- edf$category

  message("Epistatic QTL interactions loaded: ", nrow(epi_region1))
  print(table(epi_category))
}

# ---------- Build circos input ----------
# Keep a data frame per trait category so each trait can have its own track.
track_data <- lapply(names(trait_cols), function(trait) {
  d <- df[df$category == trait & !is.na(df$plot_start), c("chr", "plot_start", "plot_end", "colour")]
  names(d) <- c("chr", "start", "end", "colour")
  d
})
names(track_data) <- names(trait_cols)
track_data <- track_data[sapply(track_data, nrow) > 0]

# ---------- Plot ----------
# Publication-style circos: clean genome-coloured chromosomes, a scale ring,
# one thin bar track per trait, and a modern colour palette.

# Use the validated trait_cols directly (see color-formula/validate_palette
# notes above) rather than a synthetically generated qualitative palette.
plot_trait_cols <- trait_cols
for (trait in names(track_data)) {
  track_data[[trait]]$colour <- plot_trait_cols[trait]
}

# Bread wheat (Triticum aestivum) is an allohexaploid whose three subgenomes
# (A, B, D) each descend from a different diploid ancestor (A: Triticum
# urartu-like; B: an Aegilops speltoides-related Sitopsis species; D: Aegilops
# tauschii). Giving each subgenome its own hue - rather than shades of one
# colour - makes that three-way homoeologous structure legible at a glance,
# and keeps the ideogram ring visually distinct from the vivid, fully
# saturated trait-category palette used in the data tracks below.
genome_col <- c("A" = "#E8A33D", "B" = "#4F8FC0", "D" = "#5FA777")

chr_df <- data.frame(
  chr   = names(chr_coord_len),
  start = 0L,
  end   = as.integer(chr_coord_len),
  stringsAsFactors = FALSE
)

make_trait_panel <- function(trait_name) {
  function(region, value, ...) {
    # Draw each interval as a filled ring segment, full track height
    circos.genomicRect(
      region,
      value,
      col    = adjustcolor(value$colour, alpha.f = 0.85),
      border = NA,
      ...
    )
  }
}

plot_circos <- function() {
  circos.clear()
  par(mar = c(3, 3, 3, 3), family = "sans", bg = "white")
  circos.par(
    "start.degree" = 90,
    "gap.degree" = 2,
    "track.height" = 0.026,
    "cell.padding" = c(0, 0, 0, 0),
    "track.margin" = c(0.003, 0.003),
    "circle.margin" = c(0.12, 0.12, 0.12, 0.12)
  )

  circos.genomicInitialize(chr_df, plotType = NULL)

  # Outer chromosome ideogram track
  circos.genomicTrack(
    chr_df,
    ylim = c(0, 1),
    track.height = 0.055,
    bg.border = NA,
    panel.fun = function(region, value, ...) {
      sector <- get.cell.meta.data("sector.index")
      genome <- substr(sector, 2, 2)
      circos.genomicRect(region, value, col = genome_col[genome], border = "white", lwd = 0.7, ...)
      circos.text(
        CELL_META$xcenter,
        CELL_META$ycenter,
        sector,
        facing = "inside",
        niceFacing = TRUE,
        cex = 0.8,
        font = 2,
        col = "grey20"
      )
    }
  )

  # Dedicated scale track just inside the chromosome ideogram
  circos.genomicTrack(
    chr_df,
    ylim = c(0, 1),
    track.height = 0.04,
    bg.border = NA,
    panel.fun = function(region, value, ...) {
      circos.genomicAxis(
        h = "top",
        major.by = ifelse(coord_unit == "cM", 25, 5e7),
        labels.cex = 0.35,
        direction = "outside",
        labels.facing = "outside",
        lwd = 0.4,
        col = "grey40"
      )
    }
  )

  # Trait tracks
  for (trait in names(track_data)) {
    circos.genomicTrack(
      track_data[[trait]],
      ylim = c(0, 1),
      track.height = 0.026,
      bg.col = "white",
      bg.border = NA,
      panel.fun = make_trait_panel(trait)
    )
  }

  # Epistatic QTL links inside the trait tracks, coloured by the same trait
  # classification as the MetaQTL tracks so a chord's colour tells you which
  # trait the interacting locus pair affects.
  if (!is.null(epi_region1)) {
    epi_col <- plot_trait_cols[epi_category]
    epi_col[is.na(epi_col)] <- plot_trait_cols[["Other"]]
    circos.genomicLink(
      epi_region1,
      epi_region2,
      col = adjustcolor(epi_col, alpha.f = 0.18),
      border = NA,
      lwd = 0.3
    )
  }

  title(
    "MetaQTLs and epistatic interactions by trait category",
    sub = paste0(
      "Coordinate system: ", coord_unit, " | ", n_cm, " cM and ", n_bp, " bp intervals",
      if (!is.null(epi_region1)) paste0(" | ", nrow(epi_region1), " epistatic QTL pairs") else ""
    ),
    line = -2.5,
    cex.main = 1.5,
    cex.sub = 0.9,
    col.main = "grey20",
    col.sub = "grey50"
  )

  legend(
    "topright",
    legend = names(track_data),
    fill = plot_trait_cols[names(track_data)],
    bty = "n",
    cex = 0.75,
    inset = c(0.02, 0),
    title = "Trait category (bars & chords)"
  )
  legend(
    "bottomright",
    legend = c("A genome", "B genome", "D genome"),
    fill = genome_col,
    bty = "n",
    cex = 0.75,
    inset = c(0.02, 0),
    title = "Subgenome"
  )

  circos.clear()
}

pdf(paste0(OUT_PREFIX, "_by_trait.pdf"), width = 15, height = 15)
plot_circos()
dev.off()

svg(paste0(OUT_PREFIX, "_by_trait.svg"), width = 15, height = 15)
plot_circos()
dev.off()

message("Saved: ", OUT_PREFIX, "_by_trait.pdf and ", OUT_PREFIX, "_by_trait.svg (", coord_unit, ")")
