# Remaining figures for the manuscript figure set:
#   Figure 1: Data composition & physical-anchoring coverage (QTL and MetaQTL)
#             -- what fraction of the literature-curated database is usable
#             for a bp-coordinate genomic-window analysis, and how many
#             distinct studies survive that filter.
#   Figure 3: Per-chromosome overview -- physically-anchored record density
#             and fractionation rate, colored by subgenome (companion to the
#             main statistical result in final_rigorous_figure).
#   Figure S1: MetaQTL-inclusion sensitivity check -- combined (QTL+MetaQTL)
#              vs. QTL-only results are compared directly to show the tiny
#              MetaQTL contribution (0.9% of physically-anchored records)
#              does not drive the result.
#
# Requires: install.packages(c("ggplot2","patchwork","cowplot","scales","dplyr"))
# Run: Rscript evolutionary_analysis/scripts/09_figures_composition_and_sensitivity.R
#
# Coded by Ankush Sharma <mr.ank2999@gmail.com>

suppressPackageStartupMessages({
  library(ggplot2)
  library(patchwork)
  library(cowplot)
  library(scales)
  library(dplyr)
})

HERE <- dirname(dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))))
if (length(HERE) == 0 || is.na(HERE)) HERE <- "evolutionary_analysis"

GENOME_COL <- c("A" = "#e8a33d", "B" = "#4f8fc0", "D" = "#5fa777")
theme_pub <- theme_cowplot(font_size = 11) +
  theme(plot.title = element_text(size = 12, face = "bold"), axis.title = element_text(size = 10.5))

# =========================================================================
# FIGURE 1: data composition & physical-anchoring coverage
# =========================================================================
cov <- read.csv(file.path(HERE, "data", "literature_coverage.csv"), stringsAsFactors = FALSE)

cov_long <- rbind(
  data.frame(dataset = cov$dataset, category = "Physically-anchored (used)", n = cov$physically_anchored),
  data.frame(dataset = cov$dataset, category = "cM-only (genetic map)", n = cov$cm_only),
  data.frame(dataset = cov$dataset, category = "No parseable position", n = cov$no_position),
  data.frame(dataset = cov$dataset, category = "No valid chromosome", n = cov$no_chromosome)
)
cov_long$category <- factor(cov_long$category, levels = c("Physically-anchored (used)", "cM-only (genetic map)",
                                                            "No parseable position", "No valid chromosome"))
cov_long <- cov_long %>% group_by(dataset) %>% mutate(pct = n / sum(n) * 100) %>% ungroup()

CAT_COL <- c("Physically-anchored (used)" = "#c62828", "cM-only (genetic map)" = "#e3ac6f",
             "No parseable position" = "#c9c9c9", "No valid chromosome" = "#8a8a8a")

# "Physically-anchored" is the first factor level, which ggplot2 stacks at the
# TOP of the bar -- so its label midpoint is (100 - pct/2), not the whole-bar
# midpoint. Computing this explicitly avoids position_stack() on filtered data
# (which would center the label on the filtered subset, not the real stack).
anchored_labels <- cov_long %>% filter(category == "Physically-anchored (used)") %>%
  mutate(y_mid = 100 - pct / 2)

p1A <- ggplot(cov_long, aes(dataset, pct, fill = category)) +
  geom_col(width = 0.6) +
  geom_text(data = anchored_labels, aes(x = dataset, y = y_mid, label = sprintf("%.0f%%\n(n=%s)", pct, comma(n))),
            inherit.aes = FALSE, size = 3, color = "white", fontface = "bold") +
  scale_fill_manual(values = CAT_COL, name = NULL) +
  labs(title = "A. Record-level physical-anchoring coverage", x = NULL, y = "% of curated records") +
  theme_pub + theme(legend.position = "right", legend.text = element_text(size = 8))

study_long <- rbind(
  data.frame(dataset = cov$dataset, category = "Full literature set", n = cov$distinct_studies_all_records),
  data.frame(dataset = cov$dataset, category = "Physically-anchored subset", n = cov$distinct_studies_physically_anchored)
)
study_long$category <- factor(study_long$category, levels = c("Full literature set", "Physically-anchored subset"))

p1B <- ggplot(study_long, aes(dataset, n, fill = category)) +
  geom_col(position = position_dodge(width = 0.7), width = 0.6) +
  geom_text(aes(label = n), position = position_dodge(width = 0.7), vjust = -0.4, size = 3.2) +
  scale_fill_manual(values = c("Full literature set" = "#9a6628", "Physically-anchored subset" = "#c62828"), name = NULL) +
  labs(title = "B. Distinct source studies represented", x = NULL, y = "Distinct studies (by DOI/reference)") +
  theme_pub + theme(legend.position = "right", legend.text = element_text(size = 8)) +
  expand_limits(y = max(study_long$n) * 1.15)

fig1 <- (p1A | p1B)
fig1 <- fig1 + plot_annotation(
  title = "Literature coverage: only physically-anchored (bp) records enter the genomic-window analysis",
  subtitle = "The large majority of curated QTL/MetaQTL records use genetic (cM) linkage maps only and are correctly excluded, not fabricated by proportional cM->bp scaling",
  theme = theme(plot.title = element_text(size = 13, face = "bold"), plot.subtitle = element_text(size = 9, color = "grey30"))
)
ggsave(file.path(HERE, "figures", "figure1_data_coverage.svg"), fig1, width = 10, height = 4.5, units = "in")
ggsave(file.path(HERE, "figures", "figure1_data_coverage.pdf"), fig1, width = 10, height = 4.5, units = "in")

# =========================================================================
# FIGURE 3: per-chromosome overview
# =========================================================================
chr_df <- read.csv(file.path(HERE, "data", "per_chromosome_summary.csv"), stringsAsFactors = FALSE)
chr_df$chromosome <- factor(chr_df$chromosome, levels = chr_df$chromosome[order(as.integer(substr(chr_df$chromosome, 1, 1)), substr(chr_df$chromosome, nchar(chr_df$chromosome), nchar(chr_df$chromosome)))])

p3A <- ggplot(chr_df, aes(chromosome, fractionation_rate * 100, fill = genome)) +
  geom_col(width = 0.7) +
  scale_fill_manual(values = GENOME_COL, name = "Subgenome") +
  labs(title = "A. Homoeolog fractionation rate", x = NULL, y = "Fractionation rate (%)") +
  theme_pub + theme(axis.text.x = element_text(angle = 90, vjust = 0.5, size = 7.5), legend.position = "none")

p3B <- ggplot(chr_df, aes(chromosome, records_per_gene, fill = genome)) +
  geom_col(width = 0.7) +
  scale_fill_manual(values = GENOME_COL, name = "Subgenome") +
  labs(title = "B. Physically-anchored QTL+MetaQTL density", x = NULL, y = "Records per gene") +
  theme_pub + theme(axis.text.x = element_text(angle = 90, vjust = 0.5, size = 7.5), legend.position = "right")

fig3 <- (p3A | p3B) + plot_layout(widths = c(1, 1.15))
fig3 <- fig3 + plot_annotation(
  title = "Per-chromosome genomic landscape: fractionation and trait-mapping density",
  subtitle = "21 wheat chromosomes, colored by subgenome (A/B/D); companion overview to the window-level statistical result",
  theme = theme(plot.title = element_text(size = 13, face = "bold"), plot.subtitle = element_text(size = 9, color = "grey30"))
)
ggsave(file.path(HERE, "figures", "figure3_per_chromosome.svg"), fig3, width = 10.5, height = 4.6, units = "in")
ggsave(file.path(HERE, "figures", "figure3_per_chromosome.pdf"), fig3, width = 10.5, height = 4.6, units = "in")

# =========================================================================
# FIGURE S1: MetaQTL-inclusion sensitivity check
# =========================================================================
combined <- read.csv(file.path(HERE, "data", "rigorous_statistics.csv"), stringsAsFactors = FALSE) %>%
  filter(metric == "studies_per_gene") %>%
  transmute(window_mb, analysis = "QTL + MetaQTL (combined)", r_obs, p = p_r_perm)
qtl_only <- read.csv(file.path(HERE, "data", "qtl_only_statistics.csv"), stringsAsFactors = FALSE) %>%
  transmute(window_mb, analysis = "QTL-only (MetaQTL excluded)", r_obs, p = p_r_perm)
sens_df <- rbind(combined, qtl_only)
sens_df$analysis <- factor(sens_df$analysis, levels = c("QTL + MetaQTL (combined)", "QTL-only (MetaQTL excluded)"))
sens_df$sig <- ifelse(sens_df$p < 0.05, "*", "")

pS1 <- ggplot(sens_df, aes(factor(window_mb), r_obs, fill = analysis)) +
  geom_col(position = position_dodge(width = 0.7), width = 0.6) +
  geom_text(aes(label = sig, y = r_obs + 0.012), position = position_dodge(width = 0.7), size = 5, fontface = "bold") +
  geom_hline(yintercept = 0, linewidth = 0.3, color = "grey40") +
  scale_fill_manual(values = c("QTL + MetaQTL (combined)" = "#c62828", "QTL-only (MetaQTL excluded)" = "#7c4d24"), name = NULL) +
  labs(title = "Figure S1. MetaQTL contributes 0.9% of records; excluding it changes nothing",
       subtitle = "Genome-wide r (studies/gene vs. fractionation rate); both use identical circular-block permutation tests",
       x = "Window size (Mb)", y = "Pearson r") +
  theme_pub + theme(legend.position = "bottom", plot.subtitle = element_text(size = 8.5, color = "grey30"))

ggsave(file.path(HERE, "figures", "figureS1_metaqtl_sensitivity.svg"), pS1, width = 8, height = 5, units = "in")
ggsave(file.path(HERE, "figures", "figureS1_metaqtl_sensitivity.pdf"), pS1, width = 8, height = 5, units = "in")

message("Saved figure1_data_coverage, figure3_per_chromosome, figureS1_metaqtl_sensitivity (svg+pdf)")
