"""
Benjamini-Hochberg FDR correction across the pre-specified hypothesis family:
the 9 tests (3 window sizes x {genome-wide r, partial r controlling GC,
hotspot-vs-background difference}) run on the PRIMARY, ascertainment-corrected
density metric (studies_per_gene). records_per_gene and the GC-vs-fractionation
tests are reported separately as sensitivity/ancillary checks, not folded into
this family, because they were not part of the confirmatory hypothesis being
tested (naive density was expected, and confirmed, to be null; GC content was
a covariate check, not the headline hypothesis).

Reporting only nominal permutation p-values without this correction would
itself be an artefact of multiple comparisons -- exactly the kind of
non-rigorous result this analysis is designed to avoid.

Input:  evolutionary_analysis/data/rigorous_statistics.csv
Output: evolutionary_analysis/data/rigorous_statistics_fdr.csv

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

rows = list(csv.DictReader(open(os.path.join(HERE, "data", "rigorous_statistics.csv"))))
family = []
for r in rows:
    if r["metric"] != "studies_per_gene":
        continue
    family.append({"window_mb": r["window_mb"], "test": "genome_wide_r", "p": float(r["p_r_perm"])})
    family.append({"window_mb": r["window_mb"], "test": "partial_r_gc_controlled", "p": float(r["p_r_partial_perm"])})
    family.append({"window_mb": r["window_mb"], "test": "hotspot_vs_background_diff", "p": float(r["p_hotspot_diff_perm"])})

family.sort(key=lambda x: x["p"])
m = len(family)

for entry in family:
    entry["bh_q"] = None  # filled below

# standard BH step-up q-value (monotone-adjusted)
running_min = 1.0
for i in range(m, 0, -1):
    entry = family[i - 1]
    q = entry["p"] * m / i
    running_min = min(running_min, q)
    entry["bh_q"] = round(min(running_min, 1.0), 4)

out_path = os.path.join(HERE, "data", "rigorous_statistics_fdr.csv")
with open(out_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["window_mb", "test", "p", "bh_q"])
    w.writeheader()
    for entry in family:
        w.writerow(entry)

print(f"Pre-specified hypothesis family (studies_per_gene metric, m={m} tests):\n")
print(f"{'window_mb':>10} {'test':<28} {'p':>8} {'BH q':>8}")
for entry in family:
    print(f"{entry['window_mb']:>10} {entry['test']:<28} {entry['p']:>8.4f} {entry['bh_q']:>8.4f}")

surv_05 = [e for e in family if e["bh_q"] < 0.05]
surv_10 = [e for e in family if e["bh_q"] < 0.10]
print(f"\nSurvives FDR<0.05 (q<0.05): {[(e['window_mb'], e['test']) for e in surv_05]}")
print(f"Survives FDR<0.10 (q<0.10): {[(e['window_mb'], e['test']) for e in surv_10]}")
print(f"\nWrote {out_path}")
