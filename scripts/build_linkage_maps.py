#!/usr/bin/env python3
"""
Build public/data/maps.csv and public/data/map_loci.csv for the linkage map view.

Input is scripts/mine/out/wheat_genetic_maps.csv, which the mining stage writes
as one row per locus (species, study DOI, linkage group, marker, cM, bp). This
groups those loci into one map per study and derives the summary a reader needs
to judge a map before opening it - how many linkage groups, how many loci, total
cM, and which marker technologies it was built from.

Marker type is inferred from the marker name because published maps almost never
state it per locus, yet it is the single most useful thing to know about a map:
an SSR map with 300 loci and a 90K SNP map with 300 loci are not comparable.

Bibliographic text comes from publications.csv, already resolved against
Crossref, so maps carry a real citation rather than a DOI string.

Usage: python3 scripts/build_linkage_maps.py
"""

import csv
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_publications import fetch_crossref, meta_from  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "mine", "out", "wheat_genetic_maps.csv")
GG = os.path.join(ROOT, "scripts", "mine", "out", "graingenes_maps.csv")
# Wang et al. 2014 Table S13, CC BY; line endings normalized after download.
# Source: https://pmc-oa-opendata.s3.amazonaws.com/PMC4265271.1/pbi0012-0787-SD23.csv
# Original MD5: c2b6a62f1445ac9da151a9b75725e9f9
GG_90K = os.path.join(ROOT, "scripts", "mine", "out", "wheat_2014_90k_s13.csv")
DATA = os.path.join(ROOT, "public", "data")
csv.field_size_limit(10_000_000)

# Marker nomenclature in wheat is stable enough to classify by name. Order
# matters: the 90K/820K Illumina arrays (IWA/IWB/Kukri/BS) and the Axiom arrays
# (AX-) are all SNPs, so they are matched before the generic SNP pattern.
MARKER_CLASSES = [
    ("DArT",     re.compile(r"^(wPt|rPt|tPt|DArT)", re.I)),
    ("SNP array", re.compile(r"^(IWA|IWB|AX[-_]|Affx|Kukri_|Excalibur_|Tdurum_|BS0000|RAC875|BobWhite|CAP\d|Ra_c|D_)", re.I)),
    ("SSR",      re.compile(r"^(X?gwm|X?wmc|X?barc|X?cfa|X?cfd|X?gdm|X?wms|X?taglgap|SSR)", re.I)),
    ("KASP",     re.compile(r"KASP", re.I)),
    ("GBS/SNP",  re.compile(r"^(S\d+_\d+|TA\d+|snp\d*|chr\d[ABD]_\d+)", re.I)),
    ("AFLP",     re.compile(r"^(E\d+M\d+|AFLP)", re.I)),
    ("RFLP",     re.compile(r"^(Xpsr|Xbcd|Xcdo|Xwg|RFLP)", re.I)),
    ("STS/SCAR", re.compile(r"^(STS|SCAR|CAPS)", re.I)),
    ("Gene/trait", re.compile(r"^(Vrn|Ppd|Rht|Lr\d|Yr\d|Sr\d|Pm\d|Fhb\d|Glu|Gli)", re.I)),
]


def marker_class(name: str) -> str:
    for label, rx in MARKER_CLASSES:
        if rx.search(name):
            return label
    return "other"


# A wheat linkage group is 1-7 followed by the subgenome A, B or D; durum maps
# carry only A and B. DArT maps routinely break a group into "1A.1"/"1A.2"
# where the data do not support joining the segments, so a segment suffix is
# kept verbatim rather than merged.
#
# The subgenome letter is also the cheapest species check there is. A map
# labelled 1A/1C/1D ... 7A/7C/7D is oat (AACCDD), not wheat - and one such map
# was in this corpus, pulled in because its abstract mentions wheat. The letter
# set is therefore deliberately narrow: a C, H or R group means the table is
# not a wheat map and should not be rescued by widening this.
LG_RE = re.compile(r"^([1-7])\s*([ABD])(\.\d+)?[LS]?$", re.I)

# Fewest loci per group for a table to be a map rather than a list of peak
# markers: a "map" with one marker on each of 15 groups is a QTL summary.
MIN_LOCI_PER_LG = 3


def normalise_lg(raw: str) -> str:
    s = re.sub(r"^(chr|chromosome|lg)[\s._-]*", "", str(raw).strip(), flags=re.I)
    s = s.replace(" ", "")
    m = LG_RE.match(s)
    if not m:
        return ""
    return f"{m.group(1)}{(m.group(2) or '').upper()}{m.group(3) or ''}"


# Europe PMC was searched for wheat maps, but a hit only means the paper
# mentions wheat somewhere - a comparative or review context pulls in maps of
# other cereals. Species is therefore taken from the paper's own title, and a
# map that is not a wheat map is excluded rather than relabelled.
SPECIES_FROM_TITLE = [
    ("Triticum turgidum subsp. durum", re.compile(r"\bdurum\b|T\.?\s*turgidum", re.I)),
    ("Triticum aestivum", re.compile(r"bread wheat|common wheat|T\.?\s*aestivum|hexaploid wheat", re.I)),
    ("Triticum monococcum", re.compile(r"einkorn|T\.?\s*monococcum", re.I)),
    ("Triticum dicoccoides", re.compile(r"emmer|dicocc", re.I)),
    ("Triticum spelta", re.compile(r"\bspelta\b|\bspelt\b", re.I)),
    ("Triticum aestivum", re.compile(r"\bwheat\b", re.I)),   # fallback
]
NOT_WHEAT = re.compile(r"\b(oat|Avena|barley|Hordeum|rice|Oryza|maize|rye|Secale|"
                       r"triticale|sorghum|soybean|chickpea|cotton)\b", re.I)


def species_from_title(title: str) -> str:
    """-> species name, or '' when the paper is not about a wheat."""
    if not title:
        return ""
    for name, rx in SPECIES_FROM_TITLE:
        if rx.search(title):
            # A title naming another crop first is that crop's paper: "oat
            # crown rust ... compared with wheat" is an oat map.
            other = NOT_WHEAT.search(title)
            wheat = re.search(r"\bwheat\b|Triticum|durum|einkorn|emmer", title, re.I)
            if other and (not wheat or other.start() < wheat.start()):
                return ""
            return name
    return ""


def load_publications():
    """DOI -> bibliographic record, from publications.csv where the paper is
    already part of the database, otherwise from Crossref.

    The mined maps come from papers that are mostly not in the curated tables,
    so publications.csv alone leaves them titleless - and a map listed as
    "- . 1A-7D . 5124 loci" tells a reader nothing about whose map it is."""
    path = os.path.join(DATA, "publications.csv")
    pubs = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for p in csv.DictReader(f):
                if p["doi"]:
                    pubs[p["doi"].lower()] = p
    return pubs


def citation(p) -> str:
    if not p or not p.get("title"):
        return ""
    authors = [a for a in p["authors"].split("; ") if a]
    lead = authors[0] if authors else ""
    etal = " et al." if len(authors) > 1 else ""
    year = f" ({p['year']})" if p["year"] else ""
    journal = f" {p['journal']}." if p["journal"] else ""
    return f"{lead}{etal}{year} {p['title']}.{journal}".strip()


def graingenes_90k_loci(map_id: str):
    """Import Wang et al. 2014 Table S13, the source of GrainGenes' 90K map.

    The source has two cM columns. Its rescaled distance is the published
    consensus map distance; the unscaled values exceed 700 cM on some groups.
    GrainGenes calls the chromosome 2D group `2Dx`; the viewer uses `2D`.
    """
    if not os.path.exists(GG_90K):
        raise FileNotFoundError(f"missing GrainGenes 90K source table: {GG_90K}")
    rows = []
    with open(GG_90K, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # Table S13 caption
        header = next(reader)
        if header[1:5] != ["SNP id", "SNP Name", "Chr.", "cM"] or \
                header[7].strip() != "Rescaled distance, cM":
            raise ValueError(f"unexpected 90K map columns: {header}")
        for row in reader:
            if len(row) != 8:
                raise ValueError(f"invalid 90K map row: {row}")
            lg = "2D" if row[3] == "2Dx" else normalise_lg(row[3])
            if not lg or not row[1].strip():
                raise ValueError(f"invalid 90K map locus: {row}")
            cm = float(row[7])
            if cm < 0 or cm > 400:
                raise ValueError(f"invalid 90K map position: {row}")
            rows.append({"map_id": map_id, "marker": row[1].strip(),
                         "linkage_group": lg, "position_cm": f"{cm:.4f}",
                         "marker_type": "SNP array", "bp": ""})
    if len(rows) != 40267 or len({r["marker"] for r in rows}) != len(rows):
        raise ValueError(f"90K map should have 40,267 unique marker IDs; found {len(rows)}")
    by_lg = defaultdict(list)
    for row in rows:
        by_lg[row["linkage_group"]].append(float(row["position_cm"]))
    if len(by_lg) != 21:
        raise ValueError(f"90K map should cover 21 linkage groups; found {len(by_lg)}")
    span = sum(max(pos) - min(pos) for pos in by_lg.values())
    return rows, f"{span:.1f}"


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"missing {SRC} - run scripts/mine/extract_wheat_maps.py first")

    pubs = load_publications()
    by_study = defaultdict(list)
    dropped_lg = 0
    with open(SRC, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            lg = normalise_lg(r.get("linkage_group", ""))
            marker = (r.get("marker") or "").strip()
            try:
                cm = float(r.get("cm") or "")
            except ValueError:
                continue
            if not lg:
                dropped_lg += 1
                continue
            if not marker:
                continue
            by_study[(r.get("species", "").strip(), r.get("study", "").strip())].append(
                {"lg": lg, "marker": marker, "cm": cm, "bp": (r.get("bp") or "").strip()})

    maps, loci_rows, skipped_species = [], [], []
    for i, ((species, study), loci) in enumerate(
            sorted(by_study.items(), key=lambda kv: -len(kv[1])), start=1):
        # One marker can be listed twice in a paper (two sheets, or a table
        # repeated per trait); keep the first position for each marker/LG pair
        # so loci counts are not inflated by duplicates.
        seen, uniq = set(), []
        for l in loci:
            key = (l["lg"], l["marker"])
            if key in seen:
                continue
            seen.add(key)
            uniq.append(l)
        lgs = sorted({l["lg"] for l in uniq})
        if len(uniq) < 10 or len(uniq) / max(len(lgs), 1) < MIN_LOCI_PER_LG:
            continue
        span = sum(
            max(x["cm"] for x in uniq if x["lg"] == g) - min(x["cm"] for x in uniq if x["lg"] == g)
            for g in lgs)
        types = Counter(marker_class(l["marker"]) for l in uniq)
        named = [f"{t}" for t, _ in types.most_common(3) if t != "other"]
        pub = pubs.get(study.lower())
        if not (pub or {}).get("title") and study:
            m = meta_from(fetch_crossref(study.lower()))
            if m.get("title"):
                pub = {**m, "doi": study}

        title = (pub or {}).get("title", "")
        resolved = species_from_title(title)
        if title and not resolved:
            skipped_species.append((study, title[:70]))
            continue
        species = resolved or species or "Triticum aestivum"
        map_id = f"M{len(maps)+1:04d}"

        maps.append({
            "map_id": map_id,
            "name": f"{(pub or {}).get('year', '') or '—'} · {lgs[0]}–{lgs[-1]} · {len(uniq)} loci"
                    if not (pub or {}).get("title") else
                    (pub["title"][:90] + ("…" if len(pub["title"]) > 90 else "")),
            "source": "Literature (Europe PMC)",
            "species": species,
            "population": "",
            "n_linkage_groups": len(lgs),
            "n_loci": len(uniq),
            "length_cm": f"{span:.1f}",
            "marker_types": "; ".join(named) or "other",
            "year": (pub or {}).get("year", ""),
            "reference": citation(pub),
            "doi": study,
        })
        for l in sorted(uniq, key=lambda x: (x["lg"], x["cm"])):
            loci_rows.append({"map_id": map_id, "marker": l["marker"],
                              "linkage_group": l["lg"], "position_cm": f"{l['cm']:.2f}",
                              "marker_type": marker_class(l["marker"]), "bp": l["bp"]})

    # GrainGenes' catalogue includes maps whose own data endpoints require a
    # browser challenge. The 2014 90K map is also published as Wang et al.
    # Table S13, which gives us marker order and positions for that record.
    gg_count = 0
    if os.path.exists(GG):
        with open(GG, encoding="utf-8") as f:
            for g in csv.DictReader(f):
                gg_count += 1
                lgs = [x.strip() for x in g["linkage_groups"].split(",") if x.strip()]
                parents = " x ".join([p for p in (g["parent1"], g["parent2"]) if p])
                maps.append({
                    "map_id": f"GG{gg_count:04d}",
                    "name": g["map_name"],
                    "source": "GrainGenes",
                    "species": g["species"],
                    "population": parents,
                    "n_linkage_groups": len(lgs),
                    "n_loci": g["n_markers"],
                    "length_cm": "",
                    "marker_types": g["map_type"],
                    "year": g["year"],
                    "reference": "",
                    "doi": "",
                    "url": g["url"],
                })
                if g["map_name"] == "Wheat_2014_90KSNP":
                    gg_loci, gg_span = graingenes_90k_loci(maps[-1]["map_id"])
                    if gg_loci:
                        loci_rows.extend(gg_loci)
                        maps[-1]["n_loci"] = len(gg_loci)
                        maps[-1]["n_linkage_groups"] = 21
                        maps[-1]["length_cm"] = gg_span
                        maps[-1]["reference"] = (
                            "Wang S et al. (2014) Characterization of polyploid wheat "
                            "genomic diversity using a high-density 90 000 single "
                            "nucleotide polymorphism array. Plant Biotechnology Journal "
                            "12:787–796. Table S13. DOI: 10.1111/pbi.12183."
                        )

    for m in maps:
        m.setdefault("url", f"https://doi.org/{m['doi']}" if m.get("doi") else "")

    with open(os.path.join(DATA, "maps.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(maps[0].keys()) if maps else
                           ["map_id", "name", "source", "species", "population",
                            "n_linkage_groups", "n_loci", "length_cm", "marker_types",
                            "year", "reference", "doi", "url"])
        w.writeheader()
        w.writerows(maps)
    with open(os.path.join(DATA, "map_loci.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["map_id", "marker", "linkage_group",
                                          "position_cm", "marker_type", "bp"])
        w.writeheader()
        w.writerows(loci_rows)

    viewable = len({r["map_id"] for r in loci_rows})
    print(f"maps      : {len(maps)}  "
          f"({viewable} with marker positions, {gg_count} GrainGenes registry)")
    print(f"loci      : {len(loci_rows)}")
    print(f"dropped   : {dropped_lg} loci with a non-wheat linkage group")
    for doi, t in skipped_species:
        print(f"  skipped (not a wheat map): {doi}  {t}")
    if maps:
        print(f"marker mix: {Counter(r['marker_type'] for r in loci_rows).most_common()}")
        print(f"largest   : {maps[0]['n_loci']} loci over {maps[0]['n_linkage_groups']} LGs")


if __name__ == "__main__":
    main()
