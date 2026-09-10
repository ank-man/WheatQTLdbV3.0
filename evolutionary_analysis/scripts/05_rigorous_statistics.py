"""
Rigorous statistical testing of the fractionation-hotspot hypothesis.

Fixes three remaining weaknesses of the exploratory pass (script 02) that
naive parametric tests (Welch t-test, Pearson-test p-value) do not address:

  1. SPATIAL AUTOCORRELATION: adjacent genomic windows are not independent
     observations -- both gene density/retention and QTL mapping effort vary
     smoothly along a chromosome (e.g. distal vs. pericentromeric regions).
     A naive t-test/Pearson-test p-value assumes iid windows and is invalid
     here. This script instead uses a CIRCULAR BLOCK PERMUTATION test: for
     each of N_PERM iterations, the fractionation-rate track of every
     chromosome is independently circularly shifted by a random offset
     (window density/order untouched), which destroys any true alignment
     between density and fractionation while EXACTLY preserving each
     chromosome's own serial autocorrelation structure. The observed
     statistic is then compared to this null distribution.
  2. ASCERTAINMENT BIAS: the PRIMARY density metric is studies_per_gene
     (distinct source studies per gene, ascertainment-corrected), not raw
     QTL/MetaQTL row counts. records_per_gene is reported alongside as a
     sensitivity check, not as the headline result.
  3. GC-CONTENT CONFOUND: mean_gc_content is tested against both density and
     fractionation rate, and a partial correlation (density vs. fractionation
     controlling for GC) is reported so a GC-driven artefact can be ruled in
     or out explicitly, not assumed away.

Run across all three window sizes (10/20/50 Mb) for robustness.

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import math
import os
import random

import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOW_SIZES_MB = [10, 20, 50]
N_PERM = 9999
SEED = 42

random.seed(SEED)
np.random.seed(SEED)


def pearson(x, y):
    if np.std(x) == 0 or np.std(y) == 0:
        return float("nan")
    return float(np.corrcoef(x, y)[0, 1])


def partial_corr(x, y, z):
    rxy, rxz, ryz = pearson(x, y), pearson(x, z), pearson(y, z)
    denom = math.sqrt(max((1 - rxz ** 2) * (1 - ryz ** 2), 1e-12))
    return (rxy - rxz * ryz) / denom


def build_chrom_blocks(chrom_ids):
    blocks = {}
    for c in sorted(set(chrom_ids)):
        blocks[c] = np.array([i for i, cc in enumerate(chrom_ids) if cc == c])
    return blocks


def circular_shift(values, chrom_blocks):
    out = values.copy()
    for idx in chrom_blocks.values():
        n = len(idx)
        if n < 2:
            continue
        shift = random.randint(1, n - 1)
        out[idx] = np.roll(values[idx], shift)
    return out


def perm_pvalue(observed, null_dist):
    null_dist = np.asarray(null_dist)
    return float((np.sum(np.abs(null_dist) >= abs(observed)) + 1) / (len(null_dist) + 1))


def run_window_size(window_mb, out_lines, stats_rows):
    path = os.path.join(HERE, "data", f"window_metrics_{window_mb}mb.csv")
    with open(path) as f:
        rows = list(csv.DictReader(f))

    chrom_ids = [r["chromosome"] for r in rows]
    y = np.array([float(r["fractionation_rate"]) for r in rows])
    gc = np.array([float(r["mean_gc_content"]) for r in rows])
    n = len(rows)
    chrom_blocks = build_chrom_blocks(chrom_ids)

    out_lines.append(f"\n{'=' * 70}\nWINDOW SIZE: {window_mb} Mb  (n={n} windows, >=5 genes each)\n{'=' * 70}")

    # ---- GC content as a candidate confound, tested directly ----
    r_gc_frac = pearson(gc, y)
    null_gc_frac = [pearson(gc, circular_shift(y, chrom_blocks)) for _ in range(N_PERM)]
    p_gc_frac = perm_pvalue(r_gc_frac, null_gc_frac)
    out_lines.append(f"\nGC content vs. fractionation rate: r = {r_gc_frac:+.3f}, permutation p = {p_gc_frac:.4f}")

    metrics = [("studies_per_gene", "PRIMARY (ascertainment-corrected: distinct studies/gene)"),
               ("records_per_gene", "SECONDARY (sensitivity check: raw QTL+MetaQTL rows/gene)")]

    for metric, label in metrics:
        x = np.array([float(r[metric]) for r in rows])
        r_gc_metric = pearson(gc, x)

        r_obs = pearson(x, y)
        pr_obs = partial_corr(x, y, gc)

        thresh = np.quantile(x, 0.9)
        hotspot = x >= max(thresh, 1e-12) if thresh > 0 else x >= np.quantile(x[x > 0], 1.0) if np.any(x > 0) else np.zeros(n, dtype=bool)
        n_hot = int(np.sum(hotspot))
        diff_obs = float(np.mean(y[hotspot]) - np.mean(y)) if n_hot > 0 else float("nan")

        null_r, null_pr, null_diff = [], [], []
        for _ in range(N_PERM):
            y_perm = circular_shift(y, chrom_blocks)
            null_r.append(pearson(x, y_perm))
            null_pr.append(partial_corr(x, y_perm, gc))
            null_diff.append(float(np.mean(y_perm[hotspot]) - np.mean(y_perm)) if n_hot > 0 else float("nan"))

        p_r = perm_pvalue(r_obs, null_r)
        p_pr = perm_pvalue(pr_obs, null_pr)
        p_diff = perm_pvalue(diff_obs, null_diff)

        out_lines.append(f"\n--- {metric} -- {label} ---")
        out_lines.append(f"  GC content vs. {metric}: r = {r_gc_metric:+.3f}")
        out_lines.append(f"  Genome-wide correlation (density vs. fractionation rate): r = {r_obs:+.3f}, circular-block permutation p = {p_r:.4f} (n_perm={N_PERM})")
        out_lines.append(f"  Partial correlation controlling for GC content: r_partial = {pr_obs:+.3f}, permutation p = {p_pr:.4f}")
        out_lines.append(f"  Hotspot (top 10% by {metric}, n={n_hot}) vs. genome background (n={n}): "
                          f"mean fractionation-rate difference = {diff_obs * 100:+.2f} pp, circular-block permutation p = {p_diff:.4f}")

        stats_rows.append({
            "window_mb": window_mb, "metric": metric, "n_windows": n, "n_hotspot": n_hot,
            "r_obs": round(r_obs, 4), "p_r_perm": round(p_r, 4),
            "r_partial_gc": round(pr_obs, 4), "p_r_partial_perm": round(p_pr, 4),
            "hotspot_diff_pp": round(diff_obs * 100, 3), "p_hotspot_diff_perm": round(p_diff, 4),
            "r_gc_vs_metric": round(r_gc_metric, 4),
        })

    stats_rows.append({
        "window_mb": window_mb, "metric": "GC_vs_fractionation", "n_windows": n, "n_hotspot": "",
        "r_obs": round(r_gc_frac, 4), "p_r_perm": round(p_gc_frac, 4),
        "r_partial_gc": "", "p_r_partial_perm": "",
        "hotspot_diff_pp": "", "p_hotspot_diff_perm": "",
        "r_gc_vs_metric": "",
    })


if __name__ == "__main__":
    out_lines = [
        "Rigorous, ascertainment- and GC-corrected statistical testing",
        "Circular block permutation test (per-chromosome, N_PERM=%d, seed=%d)" % (N_PERM, SEED),
    ]
    stats_rows = []
    for window_mb in WINDOW_SIZES_MB:
        run_window_size(window_mb, out_lines, stats_rows)

    report = "\n".join(out_lines)
    print(report)

    out_path = os.path.join(HERE, "data", "rigorous_statistics.txt")
    with open(out_path, "w") as f:
        f.write(report + "\n")

    csv_path = os.path.join(HERE, "data", "rigorous_statistics.csv")
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(stats_rows[0].keys()))
        w.writeheader()
        w.writerows(stats_rows)

    print(f"\nWrote {out_path}\nWrote {csv_path}")
