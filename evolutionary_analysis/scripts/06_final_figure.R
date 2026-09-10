# Final publication figure: honest, ascertainment- and GC-corrected test of the
# homoeolog-fractionation / wheat-trait-mapping relationship.
#
# This figure reports what SURVIVES rigorous testing, not the naive first pass:
#   Panel A: headline result at 20 Mb using the ascertainment-corrected metric
#            (distinct studies/gene), hotspot vs. genome background, with a
#            circular-block PERMUTATION p-value (not a naive t-test).
#   Panel B: scale-dependence -- the raw QTL-row-count metric (records_per_gene)
#            is null at every window size; the ascertainment-corrected metric
#            (studies_per_gene) strengthens with window size. Demonstrates that
#            the naive gene-density-confounded signal was an artefact.
#   Panel C: partial correlation controlling for GC content -- most of the
#            studies_per_gene signal survives GC-partialling at 50 Mb.
#   Panel D: GC content itself is an independent, modest correlate of
#            fractionation rate (negative), reported transparently as an
#            ancillary finding, not folded silently into the headline result.
#
# Requires: install.packages(c("ggplot2","patchwork","ggsignif","cowplot","scales","ggbeeswarm","dplyr"))
# Run: Rscript evolutionary_analysis/scripts/06_final_figure.R
#
# Coded by Ankush Sharma <mr.ank2999@gmail.com>

suppressPackageStartupMessages({
  library(ggplot2)
  library(patchwork)
  library(ggsignif)
  library(cowplot)
  library(scales)
  library(ggbeeswarm)
  library(dplyr)
})

HERE <- dirname(dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))))
if (length(HERE) == 0 || is.na(HERE)) HERE <- "evolutionary_analysis"

GROUP_COL <- c("Genome background" = "#9a6628", "Trait hotspot" = "#c62828")
METRIC_COL <- c("studies_per_gene" = "#c62828", "records_per_gene" = "#9e9e9e")
METRIC_LABEL <- c("studies_per_gene" = "Ascertainment-corrected\n(distinct studies / gene)",
                   "records_per_gene" = "Raw density\n(QTL+MetaQTL rows / gene)")

theme_pub <- theme_cowplot(font_size = 11) +
  theme(plot.title = element_text(size = 12, face = "bold"), legend.position = "none",
        axis.title = element_text(size = 10.5))

stats_df <- read.csv(file.path(HERE, "data", "rigorous_statistics.csv"), stringsAsFactors = FALSE)
df20 <- read.csv(file.path(HERE, "data", "window_metrics_20mb.csv"), stringsAsFactors = FALSE)

# ---------- Panel A: headline result, 20 Mb, ascertainment-corrected metric ----------
thr <- quantile(df20$studies_per_gene, 0.9, type = 7)
df20$group <- ifelse(df20$studies_per_gene >= thr, "Trait hotspot", "Genome background")
df_bg <- df20; df_bg$group <- "Genome background"
plotA_df <- rbind(df_bg, df20[df20$group == "Trait hotspot", ])
plotA_df$group <- factor(plotA_df$group, levels = c("Genome background", "Trait hotspot"))

statA <- stats_df %>% filter(window_mb == 20, metric == "studies_per_gene")
pA_lab <- sprintf("permutation p = %.3f", statA$p_hotspot_diff_perm)

pA <- ggplot(plotA_df, aes(group, fractionation_rate * 100, fill = group, color = group)) +
  geom_violin(alpha = 0.15, linewidth = 0.3, trim = TRUE) +
  geom_quasirandom(size = 1.1, alpha = 0.45, width = 0.15) +
  stat_summary(fun = mean, geom = "point", size = 3, shape = 23, fill = "white", color = "black") +
  stat_summary(fun.data = mean_se, geom = "errorbar", width = 0.12, linewidth = 0.6, color = "grey20") +
  scale_fill_manual(values = GROUP_COL) +
  scale_color_manual(values = GROUP_COL) +
  annotate("text", x = 1.5, y = max(plotA_df$fractionation_rate * 100) * 1.03, label = pA_lab, size = 3.2, fontface = "italic") +
  labs(title = "A. Trait-hotspot fractionation (20 Mb, ascertainment-corrected)",
       x = NULL, y = "Homoeolog fractionation rate (%)\n(singleton genes / window)") +
  theme_pub

# ---------- Panel B: scale-dependence, raw vs. ascertainment-corrected ----------
pb_df <- stats_df %>% filter(metric %in% c("studies_per_gene", "records_per_gene"))
pb_df$metric <- factor(pb_df$metric, levels = c("records_per_gene", "studies_per_gene"))
pb_df$sig <- ifelse(pb_df$p_r_perm < 0.05, "*", "")

pB <- ggplot(pb_df, aes(factor(window_mb), r_obs, fill = metric)) +
  geom_col(position = position_dodge(width = 0.7), width = 0.6) +
  geom_text(aes(label = sig, y = r_obs + sign(r_obs) * 0.012), position = position_dodge(width = 0.7), size = 5, fontface = "bold") +
  geom_hline(yintercept = 0, linewidth = 0.3, color = "grey40") +
  scale_fill_manual(values = METRIC_COL, labels = METRIC_LABEL, name = NULL) +
  labs(title = "B. Naive density is null;\nascertainment-corrected signal scales up",
       x = "Window size (Mb)", y = "Pearson r\n(density vs. fractionation rate)") +
  theme_pub + theme(legend.position = "bottom", legend.text = element_text(size = 8))

# ---------- Panel C: partial correlation controlling for GC content ----------
pc_df <- stats_df %>% filter(metric == "studies_per_gene") %>%
  select(window_mb, raw = r_obs, partial = r_partial_gc)

pc_long <- rbind(
  data.frame(window_mb = pc_df$window_mb, type = "Unadjusted", r = pc_df$raw),
  data.frame(window_mb = pc_df$window_mb, type = "Partial (GC-controlled)", r = pc_df$partial)
)
pc_long$type <- factor(pc_long$type, levels = c("Unadjusted", "Partial (GC-controlled)"))

pC <- ggplot(pc_long, aes(factor(window_mb), r, fill = type)) +
  geom_col(position = position_dodge(width = 0.7), width = 0.6) +
  geom_hline(yintercept = 0, linewidth = 0.3, color = "grey40") +
  scale_fill_manual(values = c("Unadjusted" = "#c62828", "Partial (GC-controlled)" = "#e39a3f"), name = NULL) +
  labs(title = "C. Signal mostly survives GC-content partialling",
       x = "Window size (Mb)", y = "Pearson r\n(studies/gene vs. fractionation rate)") +
  theme_pub + theme(legend.position = "bottom", legend.text = element_text(size = 8))

# ---------- Panel D: GC content is an independent, modest correlate ----------
r20 <- stats_df %>% filter(window_mb == 20, metric == "GC_vs_fractionation")
annotD <- sprintf("r = %.3f\npermutation p = %.3f", r20$r_obs, r20$p_r_perm)

pD <- ggplot(df20, aes(mean_gc_content, fractionation_rate * 100)) +
  geom_point(size = 1.3, alpha = 0.35, color = "#4f8fc0") +
  geom_smooth(method = "lm", color = "#1f5f8b", fill = "#1f5f8b", alpha = 0.15, linewidth = 0.8) +
  annotate("text", x = max(df20$mean_gc_content) * 0.98, y = max(df20$fractionation_rate * 100) * 0.98,
           label = annotD, hjust = 1, size = 3.2, fontface = "italic") +
  labs(title = "D. GC content: an independent, modest correlate",
       x = "Mean gene GC content (%, 20 Mb window)", y = "Fractionation rate (%)") +
  theme_pub

fig <- (pA | pB) / (pC | pD)
fig <- fig + plot_annotation(
  title = "Homoeolog fractionation and wheat trait-mapping density: an ascertainment- and GC-corrected test",
  subtitle = "Circular block permutation tests (per-chromosome, 9,999 permutations) on Ensembl Plants homoeolog calls (IWGSC RefSeq v1.0)\ncombined with physically-anchored WheatQTLdb V3.0 QTL/MetaQTL records; robustness assessed at 10/20/50 Mb windows",
  theme = theme(plot.title = element_text(size = 14, face = "bold"), plot.subtitle = element_text(size = 9, color = "grey30"))
)

out_svg <- file.path(HERE, "figures", "final_rigorous_figure.svg")
out_pdf <- file.path(HERE, "figures", "final_rigorous_figure.pdf")
ggsave(out_svg, fig, width = 11, height = 9, units = "in")
ggsave(out_pdf, fig, width = 11, height = 9, units = "in")
message("Saved: ", out_svg, " and ", out_pdf)
