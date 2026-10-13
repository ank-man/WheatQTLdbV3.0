#!/usr/bin/env Rscript
# Rebuild the companion Plotly report from the same CSV files served by the site.
# Usage: Rscript scripts/plot_statistics.R [output.html]
suppressPackageStartupMessages({
  library(plotly)
  library(htmltools)
})

args <- commandArgs(trailingOnly = TRUE)
output <- if (length(args)) args[[1]] else "dist/statistics-r.html"
data_dir <- "public/data"
read_data <- function(name) {
  read.csv(file.path(data_dir, name), stringsAsFactors = FALSE,
           check.names = FALSE, na.strings = character(), fileEncoding = "UTF-8")
}
qtl <- read_data("qtl.csv")
mqtl <- read_data("metaqtl.csv")
epi <- read_data("epistatic.csv")

palette <- c("#2f7d59", "#cb743e", "#477eaa", "#b2943e",
             "#8666a5", "#cf6e81", "#4b9b91", "#ae6648")
clean <- function(x) {
  x <- trimws(as.character(x))
  x[is.na(x) | x == ""] <- "Unknown"
  x
}
counts <- function(x, limit = Inf) {
  tab <- sort(table(clean(x)), decreasing = TRUE)
  data.frame(name = names(tab)[seq_len(min(length(tab), limit))],
             value = as.integer(tab[seq_len(min(length(tab), limit))]))
}
chrom_order <- function(x) {
  m <- regexec("^([1-7])([ABD])$", x)
  parts <- regmatches(x, m)
  vapply(parts, function(p) {
    if (length(p) < 3) return(999L)
    as.integer(p[[2]]) * 10L + match(p[[3]], c("A", "B", "D"))
  }, integer(1))
}
chrom_counts <- function(x) {
  out <- counts(x)
  out[order(chrom_order(out$name)), , drop = FALSE]
}
bar_plot <- function(data, color = palette[[1]], horizontal = FALSE, height = 370) {
  if (!nrow(data)) return(plot_ly() %>% layout(height = height))
  if (horizontal) {
    data <- data[nrow(data):1, , drop = FALSE]
    p <- plot_ly(x = data$value, y = factor(data$name, levels = data$name), height = height,
                 type = "bar", orientation = "h", marker = list(color = color),
                 hovertemplate = "%{y}: %{x:,}<extra></extra>")
    p <- layout(p, xaxis = list(title = "Records", tickformat = ",d",
                                gridcolor = "#e5ece4"),
                yaxis = list(title = "", automargin = TRUE))
  } else {
    p <- plot_ly(x = factor(data$name, levels = data$name), y = data$value, height = height,
                 type = "bar", marker = list(color = color),
                 hovertemplate = "%{x}: %{y:,}<extra></extra>")
    p <- layout(p, xaxis = list(title = "", tickangle = -45),
                yaxis = list(title = "Records", tickformat = ",d",
                             gridcolor = "#e5ece4"))
  }
  layout(p, showlegend = FALSE,
         paper_bgcolor = "rgba(0,0,0,0)", plot_bgcolor = "rgba(0,0,0,0)",
         font = list(family = "Arial, sans-serif", color = "#35483b"),
         margin = list(l = if (horizontal) 210 else 60, r = 25, t = 15,
                       b = if (horizontal) 45 else 105))
}

# Match the physical-map rule: a valid wheat chromosome plus a numeric
# coordinate of at least 1,000 bp. cM values are never projected onto bp.
position_point <- function(x) {
  x <- gsub(",", "", gsub("−", "-", trimws(as.character(x)), fixed = TRUE), fixed = TRUE)
  out <- rep(NA_real_, length(x))
  single <- grepl("^[0-9]+(\\.[0-9]+)?$", x)
  out[single] <- as.numeric(x[single])
  range <- grepl("^[0-9]+(\\.[0-9]+)?\\s*[-–]\\s*[0-9]+(\\.[0-9]+)?$", x)
  if (any(range)) {
    ends <- strsplit(gsub("\\s", "", x[range]), "[-–]")
    out[range] <- vapply(ends, function(v) mean(as.numeric(v)), numeric(1))
  }
  paren <- grepl("^[0-9]+(\\.[0-9]+)?\\s*\\(\\s*[0-9]+(\\.[0-9]+)?\\s*[-–]\\s*[0-9]+(\\.[0-9]+)?\\s*\\)$", x)
  if (any(paren)) out[paren] <- as.numeric(sub("^([0-9]+(\\.[0-9]+)?).*", "\\1", x[paren]))
  out
}
position_status <- function(data) {
  chromosome <- toupper(trimws(data$chromosome))
  valid_chr <- grepl("^[1-7][ABD][LS]?$", chromosome)
  point <- position_point(data$position_interval)
  status <- rep("No resolvable position", nrow(data))
  valid <- valid_chr & !is.na(point)
  status[valid & point < 1000] <- "Genetic (cM)"
  status[valid & point >= 1000] <- "Physical (bp)"
  # The browser parser considers either bound of a point(interval) physical.
  paren <- valid & grepl("\\(", data$position_interval) & point < 1000
  if (any(paren)) {
    bounds <- regmatches(data$position_interval[paren], gregexpr("[0-9]+(?:\\.[0-9]+)?", data$position_interval[paren], perl = TRUE))
    status[which(paren)] <- vapply(bounds, function(v) {
      if (any(as.numeric(v) >= 1000)) "Physical (bp)" else "Genetic (cM)"
    }, character(1))
  }
  status
}

species <- clean(qtl$species)
species[tolower(species) %in% c("triticum durum", "triticum turgidum",
  "triticum turgidum subsp. dicoccoides", "triticum turgidum subsp. dicoccum",
  "triticum turgidum ssp. dicoccoides", "triticum turgidum ssp. dicoccum")] <- "Triticum turgidum"

# The publication year the data pipeline wrote for each record (from its
# resolved publication). Never scraped from the reference link: DOIs and
# publisher URLs contain four-digit runs that are not years.
year <- function(data) {
  y <- as.character(data$year)
  y[is.na(y) | y == ""] <- "Unknown"
  y
}

panels <- list(
  list("QTL position availability", bar_plot(
    data.frame(name = c("Physical (bp)", "Genetic (cM)", "No resolvable position"),
               value = as.integer(table(factor(position_status(qtl),
                 levels = c("Physical (bp)", "Genetic (cM)", "No resolvable position"))))),
    color = c("#a8b5ac", "#d49a46", "#2f7d59"), horizontal = TRUE, height = 250)),
  list("QTL by species", bar_plot(counts(species), palette[[1]], TRUE)),
  list("QTL by source trait", bar_plot(counts(qtl$trait, 15), palette[[2]], TRUE, 530)),
  list("QTL by chromosome", bar_plot(chrom_counts(qtl$chromosome), palette[[3]])),
  list("MetaQTL by source trait", bar_plot(counts(mqtl$trait, 15), palette[[4]], TRUE, 530)),
  list("MetaQTL by chromosome", bar_plot(chrom_counts(mqtl$chromosome), palette[[5]])),
  list("Epistatic QTL by source trait", bar_plot(counts(epi$trait, 15), palette[[6]], TRUE, 530)),
  list("Epistatic QTL pairs by chromosome", bar_plot(chrom_counts(unlist(mapply(
    function(a, b) unique(c(a, b)), epi$chromosome1, epi$chromosome2,
    SIMPLIFY = FALSE))), palette[[7]])),
  list("QTL by publication year", bar_plot({
    d <- counts(year(qtl)); d <- d[d$name != "Unknown", , drop = FALSE]
    d[order(d$name), , drop = FALSE]
  }, palette[[4]])),
  list("Top QTL parameters", bar_plot(counts(qtl$parameter, 12), palette[[8]], TRUE, 460))
)

style <- "body{font-family:Inter,Arial,sans-serif;background:#f6f8f3;color:#273a30;max-width:1350px;margin:auto;padding:24px}h1{margin-bottom:8px}.intro{color:#54695c;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(500px,1fr));gap:20px}.panel{background:white;border:1px solid #dce5d8;border-radius:14px;padding:18px;box-shadow:0 3px 12px #2638280a}.panel h2{font-size:18px;margin:0 0 12px}@media(max-width:600px){body{padding:12px}.grid{display:block}.panel{margin-bottom:18px}}"
page <- tagList(
  tags$html(tags$head(tags$meta(charset = "utf-8"), tags$title("WheatQTLdb R / Plotly statistics"),
                  tags$style(HTML(style))),
    tags$body(tags$h1("WheatQTLdb statistics"),
      tags$p(class = "intro", sprintf("Generated from the current CSVs: %s QTL records, %s MetaQTLs, %s epistatic QTLs. Source trait labels are shown as recorded; the live dashboard groups them into curated categories.",
        format(nrow(qtl), big.mark = ","), format(nrow(mqtl), big.mark = ","), format(nrow(epi), big.mark = ","))),
      tags$div(class = "grid", lapply(panels, function(panel)
        tags$section(class = "panel", tags$h2(panel[[1]]), panel[[2]]))))))

dir.create(dirname(output), recursive = TRUE, showWarnings = FALSE)
save_html(browsable(page), output, libdir = paste0(tools::file_path_sans_ext(basename(output)), "-libs"))
cat("Wrote", output, "with", length(panels), "Plotly figures\n")
