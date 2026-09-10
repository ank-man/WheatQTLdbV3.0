"""
Rigorous window-level metric construction, addressing the concrete
weaknesses identified in the exploratory pass (script 02):

  1. GENE-DENSITY CONFOUND: raw QTL/MetaQTL counts per window mechanically
     correlate with how many genes/markers exist there. Every density metric
     here is expressed per gene in the window, not as a raw count.
  2. ASCERTAINMENT BIAS: a handful of famous loci (Rht, Vrn, Ppd, Fhb1, or
     any single large multi-environment study) are re-mapped by dozens of
     studies, inflating raw QTL counts at those loci for reasons of research
     popularity, not biology. Every metric here is also computed from the
     count of DISTINCT SOURCE STUDIES (normalized DOI/reference) touching a
     window, not raw QTL rows, so one study reporting the same locus across
     50 environments contributes once, not 50 times.
  3. TRAIT DIVERSITY vs. RAW DENSITY: a window can have many QTL rows for a
     single trait (again, one heavily studied locus) without being a genuine
     multi-trait "hotspot." A trait-diversity index (count of distinct trait
     categories represented, Shannon entropy) is computed alongside density.
  4. GC-CONTENT CONFOUND: base composition varies systematically along wheat
     chromosomes (distal vs. proximal/pericentromeric regions) and could in
     principle co-vary with both gene retention and QTL density for reasons
     unrelated to any causal fractionation-hotspot relationship. Mean gene
     GC content (Ensembl Plants BioMart) is carried through as a per-window
     covariate so it can be tested and, if necessary, controlled for.

Inputs:
  evolutionary_analysis/data/gene_retention.csv   (now includes gc_content)
  public/data/qtl.csv, public/data/metaqtl.csv

Output:
  evolutionary_analysis/data/window_metrics_<WINDOW_MB>mb.csv  (one per window size)

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import collections
import math
import os
import re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(HERE)

WINDOW_SIZES_MB = [10, 20, 50]

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

    def safe_float(x):
        try:
            return float(x)
        except ValueError:
            return None

    s = s.replace("−", "-")
    s = re.sub(r"\s+", "", s)
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


def normalize_study_id(doi, reference):
    d = (doi or "").strip()
    if d:
        d = d.strip("() ").strip()
        d = re.sub(r"^doi\s*:\s*", "", d, flags=re.I)
        d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d, flags=re.I)
        d = d.split("#")[0].rstrip("/").lower()
        if d:
            return d
    r = (reference or "").strip().lower()
    return r if r else None


def load_physical_items(path, chr_col, pos_col, trait_col, param_col, doi_col="doi", ref_col="reference"):
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
            study = normalize_study_id(row.get(doi_col, ""), row.get(ref_col, ""))
            items.append({
                "chromosome": chrom,
                "point": min(point, CHR_LENGTHS[chrom]),
                "trait": trait,
                "study": study,
            })
    return items


def shannon_entropy(counter):
    total = sum(counter.values())
    if total == 0:
        return 0.0
    h = 0.0
    for v in counter.values():
        p = v / total
        h -= p * math.log2(p)
    return h


if __name__ == "__main__":
    qtl_items = load_physical_items(os.path.join(REPO_ROOT, "public", "data", "qtl.csv"), "chromosome", "position_interval", "trait", "parameter")
    mqtl_items = load_physical_items(os.path.join(REPO_ROOT, "public", "data", "metaqtl.csv"), "chromosome", "position_interval", "trait", "parameter")
    all_items = qtl_items + mqtl_items

    n_no_study = sum(1 for i in all_items if i["study"] is None)
    print(f"Physically-anchored records: QTL={len(qtl_items)}, MetaQTL={len(mqtl_items)}; {n_no_study} have no DOI/reference and are excluded from the study-count metric.")

    with open(os.path.join(HERE, "data", "gene_retention.csv")) as f:
        genes = list(csv.DictReader(f))
    n_gc_missing = sum(1 for g in genes if not g.get("gc_content"))
    print(f"Genes loaded: {len(genes)} ({n_gc_missing} missing GC content)")

    for window_mb in WINDOW_SIZES_MB:
        window_bp = window_mb * 1_000_000

        def window_key(chrom, pos):
            return (chrom, int(pos // window_bp))

        windows = collections.defaultdict(lambda: {
            "n_genes": 0, "n_singleton": 0, "gc_values": [],
            "records": [],  # (trait, study)
        })

        for g in genes:
            key = window_key(g["chromosome"], int(g["start"]))
            w = windows[key]
            w["n_genes"] += 1
            if g["retention_class"] == "singleton":
                w["n_singleton"] += 1
            if g.get("gc_content"):
                w["gc_values"].append(float(g["gc_content"]))

        for item in all_items:
            key = window_key(item["chromosome"], item["point"])
            windows[key]["records"].append((item["trait"], item["study"]))

        rows_out = []
        for (chrom, widx), w in windows.items():
            if w["n_genes"] < 5:
                continue
            frac_rate = w["n_singleton"] / w["n_genes"]
            traits = collections.Counter(t for t, s in w["records"])
            studies = {s for t, s in w["records"] if s is not None}
            n_records = len(w["records"])
            n_studies = len(studies)
            n_traits = len(traits)
            entropy = shannon_entropy(traits)
            mean_gc = sum(w["gc_values"]) / len(w["gc_values"]) if w["gc_values"] else ""
            rows_out.append({
                "chromosome": chrom,
                "genome": chrom[-1],
                "window_start_bp": widx * window_bp,
                "window_end_bp": (widx + 1) * window_bp,
                "n_genes": w["n_genes"],
                "fractionation_rate": round(frac_rate, 4),
                "mean_gc_content": round(mean_gc, 3) if mean_gc != "" else "",
                "n_records": n_records,
                "n_distinct_studies": n_studies,
                "n_trait_categories": n_traits,
                "trait_shannon_entropy": round(entropy, 4),
                "records_per_gene": round(n_records / w["n_genes"], 5),
                "studies_per_gene": round(n_studies / w["n_genes"], 5),
            })

        rows_out.sort(key=lambda r: (r["chromosome"], r["window_start_bp"]))
        out_path = os.path.join(HERE, "data", f"window_metrics_{window_mb}mb.csv")
        with open(out_path, "w", newline="") as f:
            wtr = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
            wtr.writeheader()
            wtr.writerows(rows_out)
        print(f"[{window_mb} Mb] wrote {len(rows_out)} windows -> {out_path}")
