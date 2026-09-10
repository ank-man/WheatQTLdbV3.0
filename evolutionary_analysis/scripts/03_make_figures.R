# Publication figure: homoeolog fractionation vs. wheat QTL trait hotspots.
# Nature/Science/Crop Science-style multi-panel figure.
#
# Requires: install.packages(c("ggplot2","patchwork","ggsignif","cowplot","scales","viridis","ggbeeswarm"))
# Run: Rscript evolutionary_analysis/scripts/03_make_figures.R
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

GENOME_COL <- c("A" = "#e8a33d", "B" = "#4f8fc0", "D" = "#5fa777")
GROUP_COL  <- c("Genome background" = "#9a6628", "Trait hotspot" = "#c62828", "Coldspot" = "#4f8fc0")

theme_pub <- theme_cowplot(font_size = 11) +
  theme(
    plot.title = element_text(size = 12, face = "bold"),
    legend.position = "none",
    axis.title = element_text(size = 10.5)
  )

df <- read.csv(file.path(HERE, "data", "window_fractionation_qtl.csv"), stringsAsFactors = FALSE)
df$chromosome <- factor(df$chromosome, levels = df$chromosome[order(as.integer(substr(df$chromosome, 1, 1)), substr(df$chromosome, nchar(df$chromosome), nchar(df$chromosome)))] |> unique())

p90 <- quantile(df$total_qtl_metaqtl, 0.9)
df$group <- ifelse(df$total_qtl_metaqtl == 0, "Coldspot",
             ifelse(df$total_qtl_metaqtl >= max(p90, 1), "Trait hotspot", "Genome background"))
# "Genome background" (panel A reference) uses ALL windows; hotspot/coldspot are subsets of it.
df_bg <- df
df_bg$group <- "Genome background"
plot_df <- rbind(df_bg, df[df$group %in% c("Trait hotspot", "Coldspot"), ])
plot_df$group <- factor(plot_df$group, levels = c("Genome background", "Trait hotspot", "Coldspot"))

# ---------- Panel A: distribution by group, with significance bracket ----------
pA <- ggplot(plot_df, aes(group, fractionation_rate * 100, fill = group, color = group)) +
  geom_violin(alpha = 0.15, linewidth = 0.3, trim = TRUE) +
  geom_quasirandom(size = 1.1, alpha = 0.45, width = 0.15) +
  stat_summary(fun = mean, geom = "point", size = 3, shape = 23, fill = "white", color = "black") +
  stat_summary(fun.data = mean_se, geom = "errorbar", width = 0.12, linewidth = 0.6, color = "grey20") +
  scale_fill_manual(values = GROUP_COL) +
  scale_color_manual(values = GROUP_COL) +
  geom_signif(
    comparisons = list(c("Genome background", "Trait hotspot")),
    map_signif_level = TRUE, test = "t.test", textsize = 3.2, tip_length = 0.01, y_position = max(plot_df$fractionation_rate * 100) * 1.05
  ) +
  labs(title = "A. Fractionation by trait density", x = NULL, y = "Homoeolog fractionation rate (%)\n(singleton genes / window)") +
  theme_pub

# ---------- Panel B: genome-wide relationship with regression + CI ----------
r_val <- cor(df$total_qtl_metaqtl, df$fractionation_rate, method = "pearson")
n_val <- nrow(df)
t_val <- r_val * sqrt((n_val - 2) / max(1 - r_val^2, 1e-12))
p_val <- 2 * pt(-abs(t_val), df = n_val - 2)
annot <- sprintf("r = %.3f, n = %d\np = %.3f", r_val, n_val, p_val)

pB <- ggplot(df, aes(total_qtl_metaqtl, fractionation_rate * 100)) +
  geom_point(size = 1.3, alpha = 0.35, color = "#7c4d24") +
  geom_smooth(method = "lm", color = "#c62828", fill = "#c62828", alpha = 0.15, linewidth = 0.8) +
  annotate("text", x = max(df$total_qtl_metaqtl) * 0.72, y = max(df$fractionation_rate * 100) * 0.98,
           label = annot, hjust = 0, size = 3.2, fontface = "italic") +
  labs(title = "B. Genome-wide window relationship", x = "QTL + MetaQTL records per 20 Mb window", y = "Fractionation rate (%)") +
  theme_pub

# ---------- Panel C: per-chromosome fractionation, coloured by subgenome ----------
chrom_summary <- df %>%
  group_by(chromosome, genome) %>%
  summarise(mean_rate = mean(fractionation_rate) * 100, se = sd(fractionation_rate) / sqrt(n()) * 100, .groups = "drop")

pC <- ggplot(chrom_summary, aes(chromosome, mean_rate, fill = genome)) +
  geom_col(width = 0.7) +
  geom_errorbar(aes(ymin = mean_rate - 1.96 * se, ymax = mean_rate + 1.96 * se), width = 0.25, linewidth = 0.4) +
  scale_fill_manual(values = GENOME_COL, name = "Subgenome") +
  labs(title = "C. Per-chromosome fractionation", x = NULL, y = "Mean fractionation rate (%)") +
  theme_pub +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, size = 7.5), legend.position = "right")

fig <- (pA | pB | pC) + plot_layout(widths = c(1, 1.1, 1.3))
fig <- fig + plot_annotation(
  title = "Homoeolog fractionation is elevated in wheat QTL trait hotspots",
  subtitle = "20 Mb sliding-window analysis combining Ensembl Plants homoeolog calls (IWGSC RefSeq v1.0) with WheatQTLdb V3.0 physically-anchored QTL/MetaQTL records",
  theme = theme(plot.title = element_text(size = 14, face = "bold"), plot.subtitle = element_text(size = 9.5, color = "grey30"))
)

out_svg <- file.path(HERE, "figures", "fractionation_hotspot_figure.svg")
out_pdf <- file.path(HERE, "figures", "fractionation_hotspot_figure.pdf")
ggsave(out_svg, fig, width = 13.5, height = 4.8, units = "in")
ggsave(out_pdf, fig, width = 13.5, height = 4.8, units = "in")
message("Saved: ", out_svg, " and ", out_pdf)
