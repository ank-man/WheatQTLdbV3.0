"""
Two checks requested to close remaining gaps in rigor:

  1. LITERATURE COVERAGE: what fraction of ALL curated MetaQTL (and QTL)
     records/studies actually enter the genomic-window analysis? Only
     physically-anchored (bp) records are used (per the project's established
     scientific-integrity rule against fabricating cM->bp positions), so this
     reports, transparently, how many records/distinct studies are excluded
     as cM-only / no-position / no-chromosome, for both QTL and MetaQTL.
  2. SENSITIVITY TO METAQTL: MetaQTL contributes only 311 of the 34,350
     physically-anchored records (~0.9%). This re-runs the SAME circular
     block permutation pipeline as script 05 using QTL-only records (no
     MetaQTL) at all three window sizes, to confirm the ascertainment-
     corrected signal is not an artefact of the small MetaQTL contribution.

Inputs:
  public/data/qtl.csv, public/data/metaqtl.csv
  evolutionary_analysis/data/gene_retention.csv

Outputs:
  evolutionary_analysis/data/literature_coverage.csv
  evolutionary_analysis/data/qtl_only_statistics.csv
  evolutionary_analysis/data/qtl_only_statistics.txt

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import collections
import importlib.util
import math
import os
import random

import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(HERE)

spec = importlib.util.spec_from_file_location("m04", os.path.join(HERE, "scripts", "04_rigorous_window_metrics.py"))
m04 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m04)

QTL_PATH = os.path.join(REPO_ROOT, "public", "data", "qtl.csv")
MQTL_PATH = os.path.join(REPO_ROOT, "public", "data", "metaqtl.csv")

# ---------- 1. Literature coverage breakdown ----------
def coverage_breakdown(path, chr_col="chromosome", pos_col="position_interval", doi_col="doi", ref_col="reference"):
    total = no_chrom = no_pos = cm_only = physical = 0
    studies_all = set()
    studies_physical = set()
    with open(path) as f:
        for row in csv.DictReader(f):
            total += 1
            study = m04.normalize_study_id(row.get(doi_col, ""), row.get(ref_col, ""))
            if study:
                studies_all.add(study)
            chrom = m04.normalize_chromosome(row.get(chr_col, ""))
            if not chrom:
                no_chrom += 1
                continue
            point, start, end = m04.parse_position(row.get(pos_col, ""))
            if point is None:
                no_pos += 1
                continue
            if m04.is_physical(point, start, end):
                physical += 1
                if study:
                    studies_physical.add(study)
            else:
                cm_only += 1
    return {
        "total_records": total, "no_chromosome": no_chrom, "no_position": no_pos,
        "cm_only": cm_only, "physically_anchored": physical,
        "distinct_studies_all_records": len(studies_all),
        "distinct_studies_physically_anchored": len(studies_physical),
    }

qtl_cov = coverage_breakdown(QTL_PATH)
mqtl_cov = coverage_breakdown(MQTL_PATH)

cov_path = os.path.join(HERE, "data", "literature_coverage.csv")
with open(cov_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["dataset"] + list(qtl_cov.keys()))
    w.writeheader()
    w.writerow({"dataset": "QTL", **qtl_cov})
    w.writerow({"dataset": "MetaQTL", **mqtl_cov})

print("Literature coverage (all curated records, before any physical-position filtering):\n")
for name, cov in [("QTL", qtl_cov), ("MetaQTL", mqtl_cov)]:
    pct_phys = cov["physically_anchored"] / cov["total_records"] * 100
    pct_study = (cov["distinct_studies_physically_anchored"] / cov["distinct_studies_all_records"] * 100
                 if cov["distinct_studies_all_records"] else float("nan"))
    print(f"  {name}: {cov['total_records']} total records | "
          f"{cov['no_chromosome']} no-chromosome, {cov['no_position']} no-position, "
          f"{cov['cm_only']} cM-only (genetic-map-only, correctly excluded), "
          f"{cov['physically_anchored']} physically-anchored ({pct_phys:.1f}%)")
    print(f"          distinct studies: {cov['distinct_studies_all_records']} in full literature set, "
          f"{cov['distinct_studies_physically_anchored']} represented in the physically-anchored subset "
          f"({pct_study:.1f}% of studies still represented)")
print(f"\nWrote {cov_path}")

# ---------- 2. QTL-only sensitivity re-analysis (drop MetaQTL) ----------
WINDOW_SIZES_MB = [10, 20, 50]
N_PERM = 9999
random.seed(42)
np.random.seed(42)


def pearson(x, y):
    if np.std(x) == 0 or np.std(y) == 0:
        return float("nan")
    return float(np.corrcoef(x, y)[0, 1])


def partial_corr(x, y, z):
    rxy, rxz, ryz = pearson(x, y), pearson(x, z), pearson(y, z)
    denom = math.sqrt(max((1 - rxz ** 2) * (1 - ryz ** 2), 1e-12))
    return (rxy - rxz * ryz) / denom


def build_chrom_blocks(chrom_ids):
    return {c: np.array([i for i, cc in enumerate(chrom_ids) if cc == c]) for c in sorted(set(chrom_ids))}


def circular_shift(values, chrom_blocks):
    out = values.copy()
    for idx in chrom_blocks.values():
        n = len(idx)
        if n < 2:
            continue
        out[idx] = np.roll(values[idx], random.randint(1, n - 1))
    return out


def perm_pvalue(observed, null_dist):
    null_dist = np.asarray(null_dist)
    return float((np.sum(np.abs(null_dist) >= abs(observed)) + 1) / (len(null_dist) + 1))


qtl_items = m04.load_physical_items(QTL_PATH, "chromosome", "position_interval", "trait", "parameter")
print(f"\nQTL-only sensitivity re-analysis: {len(qtl_items)} physically-anchored QTL records (MetaQTL excluded)")

with open(os.path.join(HERE, "data", "gene_retention.csv")) as f:
    genes = list(csv.DictReader(f))

out_lines = [f"QTL-only sensitivity re-analysis (MetaQTL excluded, n={len(qtl_items)} records)",
             f"Circular block permutation test (per-chromosome, N_PERM={N_PERM}, seed=42)"]
stats_rows = []

for window_mb in WINDOW_SIZES_MB:
    window_bp = window_mb * 1_000_000

    def window_key(chrom, pos):
        return (chrom, int(pos // window_bp))

    windows = collections.defaultdict(lambda: {"n_genes": 0, "n_singleton": 0, "gc_values": [], "records": []})
    for g in genes:
        key = window_key(g["chromosome"], int(g["start"]))
        w = windows[key]
        w["n_genes"] += 1
        if g["retention_class"] == "singleton":
            w["n_singleton"] += 1
        if g.get("gc_content"):
            w["gc_values"].append(float(g["gc_content"]))
    for item in qtl_items:
        key = window_key(item["chromosome"], item["point"])
        windows[key]["records"].append((item["trait"], item["study"]))

    rows = []
    for (chrom, widx), w in windows.items():
        if w["n_genes"] < 5:
            continue
        studies = {s for t, s in w["records"] if s is not None}
        rows.append({
            "chromosome": chrom,
            "fractionation_rate": w["n_singleton"] / w["n_genes"],
            "mean_gc_content": sum(w["gc_values"]) / len(w["gc_values"]) if w["gc_values"] else None,
            "studies_per_gene": len(studies) / w["n_genes"],
        })
    rows = [r for r in rows if r["mean_gc_content"] is not None]

    chrom_ids = [r["chromosome"] for r in rows]
    y = np.array([r["fractionation_rate"] for r in rows])
    gc = np.array([r["mean_gc_content"] for r in rows])
    x = np.array([r["studies_per_gene"] for r in rows])
    n = len(rows)
    chrom_blocks = build_chrom_blocks(chrom_ids)

    r_obs = pearson(x, y)
    pr_obs = partial_corr(x, y, gc)
    thresh = np.quantile(x, 0.9)
    hotspot = x >= max(thresh, 1e-12)
    n_hot = int(np.sum(hotspot))
    diff_obs = float(np.mean(y[hotspot]) - np.mean(y))

    null_r, null_pr, null_diff = [], [], []
    for _ in range(N_PERM):
        y_perm = circular_shift(y, chrom_blocks)
        null_r.append(pearson(x, y_perm))
        null_pr.append(partial_corr(x, y_perm, gc))
        null_diff.append(float(np.mean(y_perm[hotspot]) - np.mean(y_perm)))

    p_r = perm_pvalue(r_obs, null_r)
    p_pr = perm_pvalue(pr_obs, null_pr)
    p_diff = perm_pvalue(diff_obs, null_diff)

    out_lines.append(f"\n[{window_mb} Mb] n={n} windows, hotspot n={n_hot}")
    out_lines.append(f"  QTL-only genome-wide r = {r_obs:+.3f}, permutation p = {p_r:.4f}")
    out_lines.append(f"  QTL-only partial r (GC-controlled) = {pr_obs:+.3f}, permutation p = {p_pr:.4f}")
    out_lines.append(f"  QTL-only hotspot vs. background diff = {diff_obs * 100:+.2f} pp, permutation p = {p_diff:.4f}")

    stats_rows.append({
        "window_mb": window_mb, "n_windows": n, "n_hotspot": n_hot,
        "r_obs": round(r_obs, 4), "p_r_perm": round(p_r, 4),
        "r_partial_gc": round(pr_obs, 4), "p_r_partial_perm": round(p_pr, 4),
        "hotspot_diff_pp": round(diff_obs * 100, 3), "p_hotspot_diff_perm": round(p_diff, 4),
    })

report = "\n".join(out_lines)
print("\n" + report)
with open(os.path.join(HERE, "data", "qtl_only_statistics.txt"), "w") as f:
    f.write(report + "\n")
with open(os.path.join(HERE, "data", "qtl_only_statistics.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(stats_rows[0].keys()))
    w.writeheader()
    w.writerows(stats_rows)
print(f"\nWrote data/qtl_only_statistics.{{txt,csv}}")
