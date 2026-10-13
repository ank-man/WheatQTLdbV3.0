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
# All panels share one width (180 mm, a full two-column page width), one type
# size and one palette, so they can be placed alone or assembled into a
# multi-panel figure without rescaling.
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
W   <- 180 / 25.4          # full page width, inches

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
INK   <- "#19191c"
MUTED <- "#57575f"
RULE  <- "#c9c9cf"
GRID  <- "#ececef"
GREY  <- "#b9b9c0"
# One colour per main trait, the same in every panel that shows traits. The
# order is fixed; the five were checked with the dataviz palette validator for
# colour-blind separation (worst adjacent pair dE 9.1) and every bar is also
# labelled, so no reading depends on colour alone.
MAIN_ORDER <- c("Nutrient use efficiency", "Abiotic stress", "Biotic stress", "Biofortification", "Others")
MAIN_COL   <- setNames(c("#2a78d6", "#d95926", "#199e70", "#c98500", "#d55181"), MAIN_ORDER)
GENOME     <- c(A = "#c98a1a", B = "#3f7fb5", D = "#3d9163")
ACCENT     <- "#1c5cab"                                  # single-series panels
SEQ        <- c("#f3f6fb", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b")  # density ramp

theme_panel <- function(base = 8.5) {
  theme_classic(base_size = base, base_family = "Helvetica") +
    theme(
      text = element_text(colour = INK),
      axis.text = element_text(colour = INK, size = base),
      axis.title = element_text(colour = MUTED, size = base),
      axis.title.x = element_text(margin = margin(t = 5)),
      axis.title.y = element_text(margin = margin(r = 5)),
      axis.line = element_line(colour = RULE, linewidth = 0.35),
      axis.ticks = element_line(colour = RULE, linewidth = 0.35),
      axis.ticks.length = unit(1.2, "mm"),
      panel.grid.major = element_line(colour = GRID, linewidth = 0.3),
      panel.grid.minor = element_blank(),
      strip.background = element_blank(),
      strip.text = element_text(face = "bold", hjust = 0, size = base + 0.5, colour = INK,
                                margin = margin(b = 3, t = 2)),
      legend.position = "top", legend.justification = "left",
      legend.title = element_blank(), legend.text = element_text(size = base),
      legend.key.size = unit(3.2, "mm"), legend.margin = margin(0, 0, 0, 0),
      legend.box.spacing = unit(2, "mm"),
      plot.margin = margin(4, 8, 4, 4, "mm")
    )
}

save_panel <- function(plot, name, height, width = W) {
  base <- file.path(OUT, name)
  ggsave(paste0(base, ".pdf"), plot, width = width, height = height, units = "in", device = cairo_pdf)
  ggsave(paste0(base, ".tiff"), plot, width = width, height = height, units = "in", dpi = DPI,
         device = ragg::agg_tiff, compression = "lzw", bg = "white")
  ggsave(paste0(base, ".png"), plot, width = width, height = height, units = "in", dpi = DPI,
         device = ragg::agg_png, bg = "white")
  message(sprintf("  %-32s %3.0f x %3.0f mm  (%d x %d px at %d dpi)", name, width * 25.4,
                  height * 25.4, round(width * DPI), round(height * DPI), DPI))
}

# Sub-categories as horizontal bars, grouped under a heading that carries the
# main trait and its total, coloured by main trait.
trait_bars <- function(d, unit_label) {
  d <- d %>%
    mutate(main_trait = factor(main_trait, levels = MAIN_ORDER)) %>%
    group_by(main_trait) %>%
    mutate(heading = sprintf("%s  ·  %s", main_trait, comma(sum(records)))) %>%
    ungroup() %>%
    arrange(main_trait)
  d$heading <- factor(d$heading, levels = unique(d$heading))
  d <- d %>% group_by(heading) %>% mutate(sub_category = reorder(sub_category, records)) %>% ungroup()
  ggplot(d, aes(records, sub_category, fill = main_trait)) +
    geom_col(width = 0.7, show.legend = FALSE) +
    geom_text(aes(label = comma(records)), hjust = -0.18, size = 2.6, colour = INK) +
    facet_grid(heading ~ ., scales = "free_y", space = "free_y") +
    scale_fill_manual(values = MAIN_COL) +
    scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.12))) +
    labs(x = unit_label, y = NULL) +
    theme_panel() +
    theme(panel.grid.major.y = element_blank(), axis.line.y = element_blank(),
          axis.ticks.y = element_blank(), panel.spacing.y = unit(2.5, "mm"),
          strip.text.y = element_blank())
}
# facet_grid cannot put a left-aligned heading above each group, so the
# headings are drawn as their own facet title with facet_wrap-like spacing:
trait_panel <- function(d, unit_label) {
  d <- d %>%
    mutate(main_trait = factor(main_trait, levels = MAIN_ORDER)) %>%
    group_by(main_trait) %>%
    mutate(heading = sprintf("%s  (%s)", main_trait, comma(sum(records)))) %>%
    ungroup() %>% arrange(main_trait)
  d$heading <- factor(d$heading, levels = unique(d$heading))
  d <- d %>% group_by(heading) %>% mutate(sub_category = reorder(sub_category, records)) %>% ungroup()
  ggplot(d, aes(records, sub_category, fill = main_trait)) +
    geom_col(width = 0.7, show.legend = FALSE) +
    geom_text(aes(label = comma(records)), hjust = -0.18, size = 2.6, colour = INK) +
    ggforce::facet_col(vars(heading), scales = "free_y", space = "free") +
    scale_fill_manual(values = MAIN_COL) +
    scale_x_continuous(labels = comma, expand = expansion(mult = c(0, 0.12))) +
    labs(x = unit_label, y = NULL) +
    theme_panel() +
    theme(panel.grid.major.y = element_blank(), axis.line.y = element_blank(),
          axis.ticks.y = element_blank(), panel.spacing.y = unit(1.5, "mm"))
}

totals <- rd("totals.csv")
message("writing panels to ", OUT, "/")

# ---- 1. QTL by trait ---------------------------------------------------------
save_panel(trait_panel(rd("qtl_by_trait.csv"),
                       sprintf("QTL / MTA records (total %s)", comma(totals$qtl))),
           "Fig_QTL_by_trait", 6.4)

# ---- 2. QTL by chromosome, in homoeologous groups ----------------------------
chr <- rd("qtl_by_chromosome.csv") %>% filter(chromosome != "Un") %>%
  mutate(group = paste("Group", substr(chromosome, 1, 1)),
         subgenome = factor(subgenome, levels = c("A", "B", "D")))
p <- ggplot(chr, aes(subgenome, records, fill = subgenome)) +
  geom_col(width = 0.78) +
  geom_text(aes(label = comma(records)), vjust = -0.5, size = 2.2, colour = INK) +
  facet_grid(. ~ group, switch = "x") +
  scale_fill_manual(values = GENOME, labels = function(x) paste(x, "subgenome")) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.1))) +
  labs(x = "Homoeologous group and subgenome", y = "QTL / MTA records") +
  theme_panel() +
  theme(panel.grid.major.x = element_blank(), panel.spacing.x = unit(1.5, "mm"),
        strip.placement = "outside", strip.text = element_text(face = "plain", hjust = 0.5,
                                                               size = 8.5, colour = MUTED),
        legend.position = "none")
save_panel(p, "Fig_QTL_by_chromosome", 3.0)

# ---- 3. QTL density along the chromosomes ------------------------------------
dens <- rd("qtl_density_10mb.csv")
chrs <- rd("chromosomes.csv")
ord  <- rev(chrs$chromosome)
dens$chromosome <- factor(dens$chromosome, levels = ord)
chrs$chromosome <- factor(chrs$chromosome, levels = ord)
p <- ggplot(dens) +
  geom_rect(aes(xmin = start_mb, xmax = end_mb,
                ymin = as.numeric(chromosome) - 0.36, ymax = as.numeric(chromosome) + 0.36,
                fill = records)) +
  geom_rect(data = chrs, aes(xmin = 0, xmax = length_mb,
                             ymin = as.numeric(chromosome) - 0.36, ymax = as.numeric(chromosome) + 0.36),
            fill = NA, colour = MUTED, linewidth = 0.2) +
  geom_point(data = chrs, aes(centromere_mb, as.numeric(chromosome) + 0.5), shape = 25,
             size = 1.1, fill = INK, colour = INK) +
  scale_y_continuous(breaks = seq_along(ord), labels = ord, expand = expansion(add = 0.6)) +
  scale_x_continuous(expand = expansion(mult = c(0, 0.02)), breaks = seq(0, 800, 100)) +
  # square-root colour scale: a few windows hold hundreds of QTL and would
  # otherwise leave the rest of the genome indistinguishable from empty
  scale_fill_gradientn(colours = SEQ, trans = "sqrt", labels = comma,
                       breaks = function(l) { b <- c(0, 25, 100, 250, 500, 1000, 2000); b[b <= l[2]] },
                       guide = guide_colourbar(barwidth = unit(55, "mm"), barheight = unit(2.2, "mm"),
                                               title.position = "left", title.vjust = 0.9,
                                               frame.colour = RULE, ticks.colour = "white")) +
  labs(x = "Physical position, Mb (IWGSC RefSeq v1.0)", y = NULL,
       fill = "QTL / MTA per 10 Mb window") +
  theme_panel() +
  theme(panel.grid = element_blank(), axis.line.y = element_blank(), axis.ticks.y = element_blank(),
        legend.title = element_text(size = 8.5, colour = MUTED))
save_panel(p, "Fig_QTL_density_along_chromosomes", 5.2)

# ---- 4. QTL by publication year ----------------------------------------------
yr <- rd("qtl_by_year.csv")
peak <- yr[which.max(yr$records), ]
p <- ggplot(yr, aes(year, records)) +
  geom_col(fill = ACCENT, width = 0.8) +
  annotate("text", x = peak$year, y = peak$records, label = sprintf("%s in %d", comma(peak$records), peak$year),
           vjust = -0.6, size = 2.6, colour = INK) +
  scale_x_continuous(breaks = seq(1995, 2030, 5), expand = expansion(add = 0.8)) +
  scale_y_continuous(labels = comma, expand = expansion(mult = c(0, 0.1))) +
  labs(x = "Year of publication",
       y = "QTL / MTA records",
       caption = sprintf("%s of %s records trace to a dated publication.",
                         comma(sum(yr$records)), comma(totals$qtl))) +
  theme_panel() +
  theme(panel.grid.major.x = element_blank(),
        plot.caption = element_text(colour = MUTED, size = 7.5, hjust = 0, margin = margin(t = 6)))
save_panel(p, "Fig_QTL_by_publication_year", 3.0)

# ---- 5. Type of map position: one bar, three parts ---------------------------
pos <- rd("qtl_by_position_type.csv")
pos$share <- pos$records / sum(pos$records)
pos$xmax <- cumsum(pos$share); pos$xmin <- pos$xmax - pos$share
pos$mid <- (pos$xmin + pos$xmax) / 2
pos$fill <- c(ACCENT, "#86b6ef", GREY)
pos$ink <- c("white", INK, INK)
p <- ggplot(pos) +
  geom_rect(aes(xmin = xmin + 0.002, xmax = xmax - 0.002, ymin = 0, ymax = 1, fill = fill)) +
  geom_text(aes(mid, 0.5, label = sprintf("%s\n%s", comma(records), percent(share, accuracy = 0.1)),
                colour = ink), size = 2.9, lineheight = 1.05, fontface = "bold") +
  geom_text(aes(mid, 1.3, label = sub("No usable position", "No usable\nposition", position_type)),
            size = 2.9, colour = INK, lineheight = 0.95) +
  scale_fill_identity() + scale_colour_identity() +
  scale_y_continuous(limits = c(0, 1.62), expand = c(0, 0)) +
  scale_x_continuous(expand = c(0, 0)) +
  theme_void(base_family = "Helvetica") + theme(plot.margin = margin(3, 6, 4, 6, "mm"))
save_panel(p, "Fig_QTL_position_type", 1.35)

# ---- 6. Species ---------------------------------------------------------------
sp <- rd("qtl_by_species.csv")
sp$plain <- sp$species %in% c("Two or more species", "Not recorded")
sp$species <- reorder(sp$species, sp$records)
face <- ifelse(sp$plain[order(sp$records)], "plain", "italic")
# Dots on a log axis: bread wheat is 93% of the records, and a bar chart on a
# linear axis would show nothing else (a bar on a log axis has no true base).
p <- ggplot(sp, aes(records, species)) +
  geom_segment(aes(x = 1, xend = records, yend = species), colour = GRID, linewidth = 0.6) +
  geom_point(colour = ACCENT, size = 2.4) +
  geom_text(aes(label = comma(records)), hjust = 0, position = position_nudge(x = 0.09),
            size = 2.6, colour = INK) +
  scale_x_log10(labels = comma, breaks = 10^(0:5), limits = c(1, 4e5), expand = c(0, 0)) +
  labs(x = "QTL / MTA records (log scale)", y = NULL) +
  theme_panel() +
  theme(panel.grid.major.y = element_blank(), axis.line.y = element_blank(),
        axis.ticks.y = element_blank(), axis.text.y = element_text(face = face))
save_panel(p, "Fig_QTL_by_species", 2.5)

# ---- 7-8. MetaQTL and epistatic QTL by trait ---------------------------------
save_panel(trait_panel(rd("metaqtl_by_trait.csv"), sprintf("MetaQTLs (total %s)", comma(totals$metaqtl))),
           "Fig_MetaQTL_by_trait", 6.0)
save_panel(trait_panel(rd("epistatic_by_trait.csv"),
                       sprintf("Epistatic QTL pairs (total %s)", comma(totals$epistatic))),
           "Fig_EpistaticQTL_by_trait", 3.6)

# ---- 9. v2.0 against v3.0 ----------------------------------------------------
v3 <- rd("qtl_by_trait.csv")
# v2.0 reported biofortification as one row, so v3.0 is summed to match
v3 <- bind_rows(
  filter(v3, main_trait != "Biofortification"),
  v3 %>% filter(main_trait == "Biofortification") %>%
    summarise(main_trait = "Biofortification", sub_category = "All grain minerals", records = sum(records))
)
v2 <- rd("v2_counts.csv") %>% mutate(sub_category = ifelse(main_trait == "Biofortification", "All grain minerals", sub_category))
cmp <- v2 %>% left_join(v3, by = c("main_trait", "sub_category")) %>%
  mutate(main_trait = factor(main_trait, levels = MAIN_ORDER)) %>% arrange(main_trait)
cmp$heading <- factor(as.character(cmp$main_trait), levels = MAIN_ORDER)
cmp <- cmp %>% group_by(heading) %>% mutate(sub_category = reorder(sub_category, records)) %>% ungroup()
cmp$fold <- ifelse(is.na(cmp$v2), "new in v3.0", sprintf("%s  (%.1f×)", comma(cmp$records), cmp$records / cmp$v2))
p <- ggplot(cmp, aes(y = sub_category)) +
  geom_segment(aes(x = ifelse(is.na(v2), 0, v2), xend = records, yend = sub_category, colour = main_trait),
               linewidth = 1.1, alpha = 0.45, show.legend = FALSE) +
  geom_point(aes(x = v2, shape = "WheatQTLdb v2.0"), colour = MUTED, fill = "white", size = 2.1, stroke = 0.7,
             na.rm = TRUE) +
  geom_point(aes(x = records, colour = main_trait, shape = "WheatQTLdb v3.0"), size = 2.4) +
  geom_text(aes(x = records, label = fold), hjust = -0.12, size = 2.5, colour = INK) +
  ggforce::facet_col(vars(heading), scales = "free_y", space = "free") +
  scale_colour_manual(values = MAIN_COL, guide = "none") +
  scale_shape_manual(values = c("WheatQTLdb v2.0" = 21, "WheatQTLdb v3.0" = 19),
                     guide = guide_legend(override.aes = list(colour = c(MUTED, INK), fill = "white", size = 2.3))) +
  scale_x_continuous(labels = comma, expand = expansion(mult = c(0.02, 0.2))) +
  labs(x = sprintf("QTL / MTA records  (v2.0: %s; v3.0: %s)", comma(sum(cmp$v2, na.rm = TRUE)), comma(totals$qtl)),
       y = NULL) +
  theme_panel() +
  theme(panel.grid.major.y = element_blank(), axis.line.y = element_blank(),
        axis.ticks.y = element_blank(), panel.spacing.y = unit(1.5, "mm"))
save_panel(p, "Fig_v2_vs_v3_by_trait", 6.6)

message("done.")
