"""
Stage 8: harvest genetic linkage maps and build per-species consensus maps.

WHY THIS EXISTS
---------------
The meta-QTL stage can only cluster records that carry a physical (bp)
position, which discards ~1,150 QTLs that report a genetic-map (cM) position
only - largely the older bi-parental linkage studies, which are exactly the
ones a meta-analysis most wants. Recovering them needs two things:

  1. the genetic maps themselves (marker -> linkage group, cM), and
  2. an anchor from cM to bp, so a cM-only QTL can be placed on the same
     physical axis everything else is on.

Both come out of the same marker catalogue, so this stage builds it once and
emits three products:

  wheat_genetic_maps.csv    every (study, species, LG, marker, cM) observation
  wheat_consensus_maps.csv  per species+LG consensus marker order, built by
                      projecting each contributing map onto the densest one
  wheat_cm_bp_anchors.csv   markers with BOTH a cM and a bp position, which is what
                      makes cM->bp lifting possible

A NOTE ON THE CONSENSUS METHOD
------------------------------
This is linear projection onto the densest map per linkage group, using
markers shared between maps as anchors - the projection step of the
BioMercator workflow, not a full LPmerge/MergeMap order reconciliation. Marker
ORDER conflicts between maps are reported rather than silently resolved,
because resolving them properly needs the original genotype data, which
published tables do not carry.

Usage:  python3 scripts/mine/09_genetic_maps.py
"""

import csv
import json
import os
import re
import statistics
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import OUT  # noqa: E402

csv.field_size_limit(10_000_000)

MARKER_H = re.compile(r"^(marker|markers|locus|loci|snp|snp id|ssr|probe|marker name|"
                      r"marker id|marker_id|id)$", re.I)
LG_H = re.compile(r"^(lg|linkage group|linkage_group|chr|chrom|chromosome|group|"
                  r"chromosome lg)$", re.I)
CM_H = re.compile(r"^(position|pos|cm|genetic position|map position|distance|"
                  r"genetic distance|position cm|cm position)$", re.I)
BP_H = re.compile(r"^(physical position|bp|bp position|physical|start|"
                  r"physical location|position bp|coordinate)$", re.I)
# A table with any of these is reporting QTL statistics, not a map.
STAT_H = re.compile(r"^(lod|lod score|pve|r2|r 2|p value|pvalue|p|additive|"
                    r"effect|variance explained|fdr|q value|-log10 p|logp)$", re.I)
# VCF / genotype matrices masquerade as maps: they carry marker, chromosome and
# a POSITION column too, but that position is PHYSICAL (bp), and the table is a
# variant list with genotype calls - not a marker order. Any of these columns
# disqualifies a table outright.
VCF_H = re.compile(r"^(ref|alt|maf|qual|filter|info|format|reference|alternate|"
                   r"allele|ref allele|alt allele|genotype|gt)$", re.I)


def norm(h: str) -> str:
    h = (h or "").strip().lower()
    h = re.sub(r"\(.*?\)|\[.*?\]", " ", h)
    h = h.replace("²", "2")
    h = re.sub(r"[^a-z0-9.\s_-]", " ", h)
    return re.sub(r"\s+", " ", h).strip()


def to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "").replace("−", "-")
    s = re.sub(r"^[<>~=±]\s*", "", s)
    try:
        return float(s)
    except ValueError:
        return None


def find_map_header(rows, max_scan=5):
    """Return (header_index, {field: col}) when the table looks like a map."""
    for i, row in enumerate(rows[:max_scan]):
        H = [norm(c) for c in row]
        cols = {}
        for j, h in enumerate(H):
            if not h:
                continue
            if "marker" not in cols and MARKER_H.match(h):
                cols["marker"] = j
            elif "lg" not in cols and LG_H.match(h):
                cols["lg"] = j
            elif "cm" not in cols and CM_H.match(h):
                cols["cm"] = j
            elif "bp" not in cols and BP_H.match(h):
                cols["bp"] = j
        has_stat = any(STAT_H.match(h) for h in H if h)
        has_vcf = any(VCF_H.match(h) for h in H if h)
        if "marker" in cols and "lg" in cols and ("cm" in cols or "bp" in cols) \
                and not has_stat and not has_vcf:
            return i, cols
    return -1, {}


def looks_like_cm(values, min_frac=0.9):
    """True when a column really holds cM, not base pairs.

    A genetic map position lies within roughly 0-400 cM. A physical position
    is typically six to nine digits. Checking the DISTRIBUTION rather than
    clipping row by row is what separates the two: clipping silently turned
    every bp column into a 'valid' cM column capped at 400.
    """
    vals = [v for v in values if v is not None]
    if len(vals) < 20:
        return False
    in_range = sum(1 for v in vals if 0 <= v <= 400)
    if in_range / len(vals) < min_frac:
        return False
    # a real map is not all-integer and spans a decent fraction of a chromosome
    return max(vals) - min(vals) >= 10


def main():
    tables_path = os.path.join(OUT, "wheat_map_tables.jsonl")
    obs = []          # (species, study, lg, marker, cm, bp)
    n_map_tables = 0
    n_tables = 0

    with open(tables_path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            t = json.loads(line)
            n_tables += 1
            rows = t["rows"]
            if len(rows) < 25:        # a real map has many markers
                continue
            hi, cols = find_map_header(rows)
            if hi < 0:
                continue

            study = t.get("doi") or t.get("pmcid")
            species = t.get("species_query", "")

            # Validate the cM column against the whole column, not per row.
            if "cm" in cols:
                col_vals = [to_float(r[cols["cm"]]) if cols["cm"] < len(r) else None
                            for r in rows[hi + 1:]]
                if not looks_like_cm(col_vals):
                    cols.pop("cm")
            if "cm" not in cols and "bp" not in cols:
                continue
            got = 0
            for r in rows[hi + 1:]:
                def cell(k):
                    j = cols.get(k)
                    return r[j].strip() if j is not None and j < len(r) else ""
                marker = cell("marker")
                lg = cell("lg")
                cm = to_float(cell("cm"))
                bp = to_float(cell("bp"))
                if not marker or not lg:
                    continue
                if cm is None and bp is None:
                    continue
                # cM positions beyond ~400 are not plausible for a single
                # linkage group; such a column is physical distance mislabelled.
                if cm is not None and not (0 <= cm <= 400):
                    cm = None
                if bp is not None and bp < 1000:
                    bp = None
                if cm is None and bp is None:
                    continue
                obs.append((species, study, lg, marker, cm, bp))
                got += 1
            if got >= 25:
                n_map_tables += 1

    print(f"tables scanned        : {n_tables}")
    print(f"linkage-map tables    : {n_map_tables}")
    print(f"marker observations   : {len(obs)}")
    if not obs:
        print("\nNo genetic maps found. Marker-order tables are usually published as\n"
              "supplementary spreadsheets - run 02_tables.py WITHOUT --no-suppl first.")
        return

    # ---- raw observations -------------------------------------------------
    path = os.path.join(OUT, "wheat_genetic_maps.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["species", "study", "linkage_group", "marker", "cm", "bp"])
        for o in obs:
            w.writerow(["" if x is None else x for x in o])
    print(f"wrote -> {path}")

    by_species = defaultdict(int)
    for o in obs:
        by_species[o[0]] += 1
    print("\nobservations by species:")
    for s, n in sorted(by_species.items(), key=lambda kv: -kv[1]):
        print(f"  {s:24s} {n:7d}")

    # ---- consensus per species + linkage group ----------------------------
    # group observations into maps: one map = one (study, species, LG)
    maps = defaultdict(dict)     # (species, lg, study) -> {marker: cm}
    for species, study, lg, marker, cm, bp in obs:
        if cm is None:
            continue
        maps[(species, lg, study)][marker] = cm

    consensus_rows = []
    conflicts = 0
    for (species, lg) in sorted({(s, l) for (s, l, _) in maps}):
        members = {st: m for (s, l, st), m in maps.items() if s == species and l == lg}
        if not members:
            continue
        # densest map is the projection reference
        ref_study, ref = max(members.items(), key=lambda kv: len(kv[1]))
        if len(ref) < 10:
            continue
        positions = defaultdict(list)
        for marker, cm in ref.items():
            positions[marker].append(cm)

        for study, m in members.items():
            if study == ref_study:
                continue
            shared = [k for k in m if k in ref]
            if len(shared) < 3:
                continue
            # linear fit of this map's cM onto the reference's, through the
            # shared markers: handles maps built at different total lengths
            xs = [m[k] for k in shared]
            ys = [ref[k] for k in shared]
            mx, my = statistics.fmean(xs), statistics.fmean(ys)
            denom = sum((x - mx) ** 2 for x in xs)
            if denom == 0:
                continue
            slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denom
            intercept = my - slope * mx
            if slope <= 0:
                conflicts += 1      # inverted order relative to reference
                continue
            for marker, cm in m.items():
                positions[marker].append(slope * cm + intercept)

        for marker, vals in positions.items():
            consensus_rows.append({
                "species": species,
                "linkage_group": lg,
                "marker": marker,
                "consensus_cm": round(statistics.fmean(vals), 3),
                "n_maps": len(vals),
                "sd_cm": round(statistics.pstdev(vals), 3) if len(vals) > 1 else "",
            })

    path = os.path.join(OUT, "wheat_consensus_maps.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["species", "linkage_group", "marker",
                                          "consensus_cm", "n_maps", "sd_cm"])
        w.writeheader()
        w.writerows(sorted(consensus_rows,
                           key=lambda r: (r["species"], r["linkage_group"], r["consensus_cm"])))
    multi = sum(1 for r in consensus_rows if r["n_maps"] > 1)
    print(f"\nconsensus markers     : {len(consensus_rows)} ({multi} supported by >1 map)")
    print(f"order conflicts skipped: {conflicts}")
    print(f"wrote -> {path}")

    # ---- cM <-> bp anchors ------------------------------------------------
    anchor = defaultdict(lambda: {"cm": [], "bp": [], "species": "", "lg": ""})
    for species, study, lg, marker, cm, bp in obs:
        k = (species, marker)
        a = anchor[k]
        a["species"], a["lg"] = species, lg
        if cm is not None:
            a["cm"].append(cm)
        if bp is not None:
            a["bp"].append(bp)
    rows = [{
        "species": v["species"], "marker": k[1], "linkage_group": v["lg"],
        "cm": round(statistics.fmean(v["cm"]), 3),
        "bp": int(statistics.fmean(v["bp"])),
        "n_obs": max(len(v["cm"]), len(v["bp"])),
    } for k, v in anchor.items() if v["cm"] and v["bp"]]

    path = os.path.join(OUT, "wheat_cm_bp_anchors.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["species", "marker", "linkage_group", "cm", "bp", "n_obs"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["species"], r["linkage_group"], r["cm"])))
    print(f"\ncM<->bp anchor markers: {len(rows)}")
    by_sp = defaultdict(int)
    for r in rows:
        by_sp[r["species"]] += 1
    for s, n in sorted(by_sp.items(), key=lambda kv: -kv[1]):
        print(f"  {s:24s} {n:6d}")
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()
