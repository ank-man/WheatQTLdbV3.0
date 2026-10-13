# Manuscript figure panels, one file per panel.
# Coded for WheatQTLdb V3.0 <mr.ank2999@gmail.com>
#
# Each panel is written to manuscript_figures/ three times:
#   .pdf   vector - the version to submit where the journal takes vector art
#   .tiff  600 dpi, LZW - for journals that require TIFF
#   .png   600 dpi - for slides and drafts
#
# The numbers are not computed here. scripts/manuscript_panel_data.ts
# classifies every record with the site's own trait rules and writes the
# summary tables in manuscript_figures/data/, so a figure cannot disagree with
# the Statistics page. This script runs that step first, then draws.
#
# v2_counts.csv is the WheatQTLdb v2.0 column of the curators' comparison
# table, entered by hand; it is the only input not derived from public/data.
#
# Requires: ggplot2, dplyr, scales, ragg, and node_modules (for esbuild).
# Run from the project root:  Rscript scripts/manuscript_panels.R

suppressPackageStartupMessages({
  library(ggplot2)
  library(dplyr)
  library(scales)
})

OUT <- "manuscript_figures"
DAT <- file.path(OUT, "data")
DPI <- 600

esbuild <- file.path("node_modules", ".bin", "esbuild")
if (file.exists(esbuild)) {
  ok <- system2(esbuild, c("scripts/manuscript_panel_data.ts", "--bundle", "--platform=node",
                           "--format=esm", "--outfile=scripts/manuscript_panel_data.mjs",
                           "--log-level=error")) == 0 &&
        system2("node", "scripts/manuscript_panel_data.mjs") == 0
  if (!ok) stop("could not regenerate the panel data")
} else {
  message("node_modules not installed - drawing from the existing tables in ", DAT)
}

rd <- function(name) read.csv(file.path(DAT, name), check.names = FALSE, stringsAsFactors = FALSE)

# ---- one look for every panel -------------------------------------------------
# A single accent for single-series panels; colour is used for identity only
# where there is an identity to show (the three subgenomes, v2.0 against v3.0).
INK    <- "#19191c"
MUTED  <- "#57575f"
GRID   <- "#e7e7ea"
ACCENT <- "#15803d"
SOFT   <- "#86c79b"
GREY   <- "#b4b4bb"
GENOME <- c(A = "#c98a1a", B = "#3f7fb5", D = "#3d9163", Un = GREY)
MAIN_ORDER <- c("Nutrient use efficiency", "Abiotic stress", "Biotic stress", "Biofortification", "Others")

theme_panel <- function(base = 8) {
  theme_minimal(base_size = base, base_family = "Helvetica") +
    theme(
      text = element_text(colour = INK),
      axis.text = element_text(colour = MUTED, size = base),
      axis.title = element_text(colour = MUTED, size = base),
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = GRID, linewidth = 0.25),
      strip.text = element_text(face = "bold", hjust = 0, size = base, colour = INK),
      strip.text.y.left = element_text(angle = 0, face = "bold", hjust = 0, vjust = 1, colour = INK),
      strip.placement = "outside",
      legend.position = "top", legend.justification = "left",
      legend.title = element_blank(), legend.key.size = unit(3, "mm"),
      legend.margin = margin(0, 0, 0, 0), legend.box.spacing = unit(1.5, "mm"),
      plot.margin = margin(3, 6, 3, 3, "mm")
    )
}

save_panel <- function(plot, name, width, height) {
  base <- file.path(OUT, name)
  ggsave(paste0(base, ".pdf"), plot, width = width, height = height, units = "in", device = cairo_pdf)
  ggsave(paste0(base, ".tiff"), plot, width = width, height = height, units = "in", dpi = DPI,
         device = ragg::agg_tiff, compression = "lzw", bg = "white")
  ggsave(paste0(base, ".png"), plot, width = width, height = height, units = "in", dpi = DPI,
         device = ragg::agg_png, bg = "white")
  message(sprintf("  %-34s %.1f x %.1f in  (%d x %d px at %d dpi)", name, width, height,
                  round(width * DPI), round(height * DPI), DPI))
}

# Horizontal bars grouped under their main trait, value printed at the bar end.
trait_bars <- function(d, xlab) {
  d <- d %>%
    mutate(main_trait = factor(main_trait, levels = MAIN_ORDER)) %>%
    group_by(main_trait) %>%
    mutate(sub_category = reorder(sub_category, records)) %>%
    ungroup()
  ggplot(d, aes(records, sub_category)) +
    geom_col(fill = ACCENT, width = 0.68) +
    geom_text(aes(label = comma(records)), hjust = -0.15, size = 2.4, colour = INK) +
    facet_grid(main_trait ~ ., scales = "free_y", space = "free_y", switch = "y") +
    scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.14))) +
    labs(x = xlab, y = NULL) +
    theme_panel() +
    theme(panel.grid.major.y = element_blank(), panel.spacing.y = unit(3, "mm"))
}

totals <- rd("totals.csv")
message("writing panels to ", OUT, "/")

# ---- 1. QTL by trait ---------------------------------------------------------
save_panel(trait_bars(rd("qtl_by_trait.csv"),
                      sprintf("QTL / MTA records (n = %s)", comma(totals$qtl))),
           "Fig_QTL_by_trait", 7, 6.2)

# ---- 2. QTL by chromosome ----------------------------------------------------
chr <- rd("qtl_by_chromosome.csv") %>% filter(chromosome != "Un")
chr$chromosome <- factor(chr$chromosome, levels = chr$chromosome)
p <- ggplot(chr, aes(chromosome, records, fill = subgenome)) +
  geom_col(width = 0.72) +
  scale_fill_manual(values = GENOME, labels = function(x) paste(x, "subgenome")) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.05))) +
  labs(x = "Chromosome", y = "QTL / MTA records") +
  theme_panel() + theme(panel.grid.major.x = element_blank())
save_panel(p, "Fig_QTL_by_chromosome", 7, 3.2)

# ---- 3. QTL by publication year ----------------------------------------------
yr <- rd("qtl_by_year.csv")
p <- ggplot(yr, aes(year, records)) +
  geom_col(fill = ACCENT, width = 0.78) +
  scale_x_continuous(breaks = seq(1995, 2030, 5)) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.05))) +
  labs(x = "Year of publication",
       y = sprintf("QTL / MTA records (%s with a dated source)", comma(sum(yr$records)))) +
  theme_panel() + theme(panel.grid.major.x = element_blank())
save_panel(p, "Fig_QTL_by_publication_year", 7, 3.2)

# ---- 4. Type of map position -------------------------------------------------
pos <- rd("qtl_by_position_type.csv")
pos$position_type <- factor(pos$position_type, levels = rev(pos$position_type))
pos$label <- sprintf("%s (%s)", comma(pos$records), percent(pos$records / sum(pos$records), accuracy = 0.1))
p <- ggplot(pos, aes(records, position_type, fill = position_type)) +
  geom_col(width = 0.6, show.legend = FALSE) +
  geom_text(aes(label = label), hjust = -0.08, size = 2.4, colour = INK) +
  scale_fill_manual(values = setNames(c(ACCENT, SOFT, GREY), levels(pos$position_type)[3:1])) +
  scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.32))) +
  labs(x = "QTL / MTA records", y = NULL) +
  theme_panel() + theme(panel.grid.major.y = element_blank())
save_panel(p, "Fig_QTL_position_type", 5, 1.8)

# ---- 5. Species --------------------------------------------------------------
sp <- rd("qtl_by_species.csv")
sp$species <- reorder(sp$species, sp$records)
p <- ggplot(sp, aes(records, species)) +
  geom_col(fill = ACCENT, width = 0.65) +
  geom_text(aes(label = comma(records)), hjust = -0.15, size = 2.4, colour = INK) +
  # log axis: bread wheat is 93% of the records and would flatten every other bar
  scale_x_log10(labels = comma, expand = expansion(mult = c(0, 0.16))) +
  labs(x = "QTL / MTA records (log scale)", y = NULL) +
  theme_panel() +
  theme(panel.grid.major.y = element_blank(), axis.text.y = element_text(face = "italic"))
save_panel(p, "Fig_QTL_by_species", 5, 2.6)

# ---- 6-7. MetaQTL and epistatic QTL by trait ---------------------------------
save_panel(trait_bars(rd("metaqtl_by_trait.csv"), sprintf("MetaQTLs (n = %s)", comma(totals$metaqtl))),
           "Fig_MetaQTL_by_trait", 7, 5.6)
save_panel(trait_bars(rd("epistatic_by_trait.csv"),
                      sprintf("Epistatic QTL pairs (n = %s)", comma(totals$epistatic))),
           "Fig_EpistaticQTL_by_trait", 7, 3.4)

# ---- 8. v2.0 against v3.0 ----------------------------------------------------
v3 <- rd("qtl_by_trait.csv")
# v2.0 reported biofortification as one row, so v3.0 is summed to match
v3 <- bind_rows(
  filter(v3, main_trait != "Biofortification"),
  v3 %>% filter(main_trait == "Biofortification") %>%
    summarise(main_trait = "Biofortification", sub_category = "Biofortification", records = sum(records))
)
cmp <- rd("v2_counts.csv") %>%
  left_join(v3, by = c("main_trait", "sub_category")) %>%
  rename(`WheatQTLdb v3.0` = records, `WheatQTLdb v2.0` = v2) %>%
  mutate(main_trait = factor(main_trait, levels = MAIN_ORDER)) %>%
  group_by(main_trait) %>%
  mutate(sub_category = reorder(sub_category, `WheatQTLdb v3.0`)) %>%
  ungroup()
long <- bind_rows(
  transmute(cmp, main_trait, sub_category, release = "WheatQTLdb v2.0", records = `WheatQTLdb v2.0`),
  transmute(cmp, main_trait, sub_category, release = "WheatQTLdb v3.0", records = `WheatQTLdb v3.0`)
) %>% mutate(release = factor(release, levels = c("WheatQTLdb v3.0", "WheatQTLdb v2.0")))
long$label <- ifelse(is.na(long$records), "not in v2.0", comma(long$records))
long$records[is.na(long$records)] <- 0
p <- ggplot(long, aes(records, sub_category, fill = release)) +
  geom_col(position = position_dodge(width = 0.78), width = 0.72) +
  geom_text(aes(label = label), position = position_dodge(width = 0.78), hjust = -0.12,
            size = 2.1, colour = INK) +
  facet_grid(main_trait ~ ., scales = "free_y", space = "free_y", switch = "y") +
  scale_fill_manual(values = c("WheatQTLdb v2.0" = GREY, "WheatQTLdb v3.0" = ACCENT),
                    breaks = c("WheatQTLdb v2.0", "WheatQTLdb v3.0")) +
  scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.14))) +
  labs(x = "QTL / MTA records", y = NULL) +
  theme_panel() +
  theme(panel.grid.major.y = element_blank(), panel.spacing.y = unit(3, "mm"))
save_panel(p, "Fig_v2_vs_v3_by_trait", 7, 7.4)

message("done.")
