"""
Bin the wheat genome into 20 Mb physical windows and, for each window,
compute (a) the homoeolog-fractionation rate from Ensembl Plants gene calls
and (b) the density and trait-category diversity of physically-anchored QTL/
MetaQTL records from WheatQTLdb V3.0, then test whether trait hotspots are
enriched or depleted for fractionation relative to the genome-wide baseline.

Inputs:
  evolutionary_analysis/data/gene_retention.csv   (from script 01)
  public/data/qtl.csv, public/data/metaqtl.csv    (WheatQTLdb V3.0)

Output:
  evolutionary_analysis/data/window_fractionation_qtl.csv
  evolutionary_analysis/data/summary_stats.txt

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import collections
import math
import os
import re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(HERE)
WINDOW_BP = 20_000_000

CHR_LENGTHS = {
    "1A": 594102056, "1B": 689851870, "1D": 495453186,
    "2A": 780798557, "2B": 801256715, "2D": 651852609,
    "3A": 750843639, "3B": 830829764, "3D": 615552423,
    "4A": 744588157, "4B": 673617499, "4D": 509857067,
    "5A": 709773743, "5B": 713149757, "5D": 566080677,
    "6A": 618079260, "6B": 720988478, "6D": 473592718,
    "7A": 736706236, "7B": 750620385, "7D": 638686055,
}


def normalize_trait(t, p):
    t = (t or "").lower().strip()
    p = (p or "").lower().strip()
    c = f"{t} {p}"
    if "yield" in t or "yield" in p or "grain weight" in p or "tgw" in p:
        return "Yield"
    if any(k in c for k in ["fungal", "fhb", "rust", "mildew", "blight", "smut", "bunt", "powdery", "septoria", "tan spot"]):
        return "Fungal resistance"
    if any(k in c for k in ["quality", "protein", "gluten", "hardness", "sediment", "dough", "test weight"]):
        return "Quality traits"
    if "sprouting" in c or "dormancy" in c:
        return "Pre-harvest sprouting"
    if any(k in c for k in ["salt", "drought", "heat", "cold", "abiotic", "osmotic", "water-log", "water log", "waterlog", "alumin", "frost", "toxic"]):
        return "Abiotic stress"
    if any(k in c for k in ["use efficiency", "n-use", "n use", "nue", "nitrogen"]):
        return "N-use efficiency"
    if any(k in c for k in ["zinc", "iron", "selenium", "biofort", "mineral", "cadmium", "calcium", "sulph", "sulfur", "manganese", "copper", "nickel", "molybden", "phosphor", "potassium", "cobalt", "rubidium", "lead", "strontium", "arsenic", "sodium", "boron", "lithium", "barium", "platinum", "co ", "mo ", "grain fe", "grain zn"]):
        return "Biofortification"
    if any(k in c for k in ["bacterial", "leaf streak", "bls"]):
        return "Bacterial resistance"
    if "virus" in c or "viral" in c:
        return "Viral resistance"
    if any(k in c for k in ["nematode", "cereal cyst"]):
        return "Nematode resistance"
    if "insect" in c:
        return "Insect resistance"
    if "disease" in c:
        return "Fungal resistance"
    if "herbicide" in c:
        return "Herbicide tolerance"
    if any(k in c for k in ["development", "heading", "vernal", "photoperiod", "earliness", "flowering", "maturity"]):
        return "Developmental"
    if "morpholog" in c or any(k in c for k in ["plant height", "tiller", "awn", "spike length"]):
        return "Morphological"
    if "physiological" in c:
        return "Physiological traits"
    return "Other"


def normalize_chromosome(raw):
    s = (raw or "").strip()
    if not s:
        return None
    s = re.sub(r"^chr[_\-\s]?", "", s, flags=re.I)
    if re.match(r"^[1-7][ABD]$", s, re.I):
        return s.upper()
    return None


def parse_position(interval):
    s = (interval or "").strip()
    if not s or s == "-":
        return None, None, None
    s = s.replace("−", "-")
    s = re.sub(r"\s+", "", s)
    def safe_float(x):
        try:
            return float(x)
        except ValueError:
            return None

    m = re.match(r"^([0-9.]+)\(?([0-9.]*)[-–]([0-9.]*)\)?$", s)
    if m:
        point = safe_float(m.group(1))
        if point is None:
            return None, None, None
        start = safe_float(m.group(2)) if m.group(2) else point
        end = safe_float(m.group(3)) if m.group(3) else point
        start = start if start is not None else point
        end = end if end is not None else point
        return point, min(start, end), max(start, end)
    v = safe_float(s)
    if v is not None:
        return v, v, v
    return None, None, None


def is_physical(point, start, end):
    return any(v is not None and v >= 1000 for v in (point, start, end))


# ---------- Load gene retention (fractionation) table ----------
retention_path = os.path.join(HERE, "data", "gene_retention.csv")
genes = []
with open(retention_path) as f:
    for row in csv.DictReader(f):
        genes.append(row)

# ---------- Load physically-anchored QTL / MetaQTL (same rule as the web app) ----------
def load_physical_items(path, chr_col, pos_col, trait_col, param_col):
    items = []
    with open(path) as f:
        for row in csv.DictReader(f):
            chrom = normalize_chromosome(row.get(chr_col, ""))
            if not chrom:
                continue
            point, start, end = parse_position(row.get(pos_col, ""))
            if point is None or not is_physical(point, start, end):
                continue
            trait = normalize_trait(row.get(trait_col, ""), row.get(param_col, ""))
            items.append({"chromosome": chrom, "point": min(point, CHR_LENGTHS[chrom]), "trait": trait})
    return items


qtl_items = load_physical_items(os.path.join(REPO_ROOT, "public", "data", "qtl.csv"), "chromosome", "position_interval", "trait", "parameter")
mqtl_items = load_physical_items(os.path.join(REPO_ROOT, "public", "data", "metaqtl.csv"), "chromosome", "position_interval", "trait", "parameter")

print(f"Physically-anchored QTL: {len(qtl_items)}   MetaQTL: {len(mqtl_items)}")

# ---------- Bin into windows ----------
def window_key(chrom, pos):
    return (chrom, int(pos // WINDOW_BP))


windows = collections.defaultdict(lambda: {
    "n_genes": 0, "n_singleton": 0, "n_triad": 0,
    "n_qtl": 0, "n_mqtl": 0, "traits": collections.Counter(),
})

for g in genes:
    key = window_key(g["chromosome"], int(g["start"]))
    w = windows[key]
    w["n_genes"] += 1
    if g["retention_class"] == "singleton":
        w["n_singleton"] += 1
    elif g["retention_class"] == "triad":
        w["n_triad"] += 1

for item in qtl_items:
    key = window_key(item["chromosome"], item["point"])
    windows[key]["n_qtl"] += 1
    windows[key]["traits"][item["trait"]] += 1

for item in mqtl_items:
    key = window_key(item["chromosome"], item["point"])
    windows[key]["n_mqtl"] += 1
    windows[key]["traits"][item["trait"]] += 1

# ---------- Write per-window table ----------
out_path = os.path.join(HERE, "data", "window_fractionation_qtl.csv")
rows_out = []
for (chrom, widx), w in windows.items():
    if w["n_genes"] < 5:
        continue  # too few genes in window for a stable fractionation rate
    frac_rate = w["n_singleton"] / w["n_genes"]
    n_traits = len(w["traits"])
    total_hits = w["n_qtl"] + w["n_mqtl"]
    dominant_trait = w["traits"].most_common(1)[0][0] if w["traits"] else ""
    rows_out.append({
        "chromosome": chrom,
        "genome": chrom[-1],
        "window_start_bp": widx * WINDOW_BP,
        "window_end_bp": (widx + 1) * WINDOW_BP,
        "n_genes": w["n_genes"],
        "fractionation_rate": round(frac_rate, 4),
        "n_qtl": w["n_qtl"],
        "n_metaqtl": w["n_mqtl"],
        "n_trait_categories": n_traits,
        "dominant_trait": dominant_trait,
        "total_qtl_metaqtl": total_hits,
    })

rows_out.sort(key=lambda r: (r["chromosome"], r["window_start_bp"]))
with open(out_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
    w.writeheader()
    w.writerows(rows_out)

print(f"Wrote {len(rows_out)} windows -> {out_path}")

# ---------- Hotspot enrichment test ----------
# Define "trait hotspot" windows as those in the top decile of total QTL+MetaQTL
# density, and "coldspot" windows as those with zero QTL/MetaQTL evidence.
totals = sorted(r["total_qtl_metaqtl"] for r in rows_out)
if totals:
    p90 = totals[int(len(totals) * 0.9)]
else:
    p90 = 0

hotspots = [r for r in rows_out if r["total_qtl_metaqtl"] >= max(p90, 1) and r["total_qtl_metaqtl"] > 0]
coldspots = [r for r in rows_out if r["total_qtl_metaqtl"] == 0]
background = rows_out


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def summary(label, subset):
    rates = [r["fractionation_rate"] for r in subset]
    return f"{label}: n={len(subset)} windows, mean fractionation rate = {mean(rates)*100:.2f}%"


lines = []
lines.append(f"Genome-wide window count: {len(rows_out)} (20 Mb windows, >=5 genes each)")
lines.append(f"Hotspot threshold (90th percentile of QTL+MetaQTL per window): {p90} records")
lines.append(summary("All windows (genome background)", background))
lines.append(summary("Trait hotspot windows (top 10% QTL+MetaQTL density)", hotspots))
lines.append(summary("Coldspot windows (zero QTL/MetaQTL evidence)", coldspots))

# Simple two-sample comparison (mean difference + pooled t-like statistic, no scipy dependency)
def ttest(a, b):
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return float("nan"), float("nan")
    ma, mb = mean(a), mean(b)
    va = sum((x - ma) ** 2 for x in a) / (na - 1)
    vb = sum((x - mb) ** 2 for x in b) / (nb - 1)
    se = math.sqrt(va / na + vb / nb)
    if se == 0:
        return float("nan"), float("nan")
    t = (ma - mb) / se
    return ma - mb, t


def norm_p_two_sided(z):
    """Two-sided p-value from a z/t statistic via the normal approximation
    (adequate here given the window counts involved; avoids a scipy dependency)."""
    return math.erfc(abs(z) / math.sqrt(2))


diff, t = ttest([r["fractionation_rate"] for r in hotspots], [r["fractionation_rate"] for r in background])
p = norm_p_two_sided(t)
lines.append(f"\nHotspot vs. genome-wide background: mean fractionation-rate difference = {diff*100:+.2f} percentage points (Welch t = {t:.2f}, two-sided p = {p:.2e})")

diff2, t2 = ttest([r["fractionation_rate"] for r in hotspots], [r["fractionation_rate"] for r in coldspots])
p2 = norm_p_two_sided(t2)
lines.append(f"Hotspot vs. coldspot: mean fractionation-rate difference = {diff2*100:+.2f} percentage points (Welch t = {t2:.2f}, two-sided p = {p2:.2e}; caution: only n={len(coldspots)} coldspot windows)")


def pearson(xs, ys):
    n = len(xs)
    mx, my = mean(xs), mean(ys)
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if sx == 0 or sy == 0:
        return float("nan")
    r = cov / (sx * sy)
    return r


xs = [r["total_qtl_metaqtl"] for r in background]
ys = [r["fractionation_rate"] for r in background]
r = pearson(xs, ys)
n = len(xs)
t_r = r * math.sqrt((n - 2) / max(1 - r ** 2, 1e-12))
p_r = norm_p_two_sided(t_r)
lines.append(f"\nGenome-wide correlation (all {n} windows): Pearson r = {r:.3f} between QTL+MetaQTL density and fractionation rate (t = {t_r:.2f}, two-sided p = {p_r:.2e})")

# Per-subgenome breakdown, since A/B/D differ in baseline fractionation rate
lines.append("\nPer-subgenome mean fractionation rate (all windows):")
for genome in "ABD":
    sub = [r["fractionation_rate"] for r in background if r["genome"] == genome]
    lines.append(f"  {genome} genome: {mean(sub)*100:.2f}% (n={len(sub)} windows)")

summary_path = os.path.join(HERE, "data", "summary_stats.txt")
with open(summary_path, "w") as f:
    f.write("\n".join(lines) + "\n")

print("\n".join(lines))
print(f"\nSaved summary -> {summary_path}")
