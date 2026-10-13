#!/usr/bin/env python3
"""
List wheat QTL / GWAS studies in the literature that this database does not
hold yet - a worklist for curation, kept separate from the database itself.

Searches Europe PMC (which indexes PubMed and more) for papers whose TITLE
names wheat or a wheat relative and whose title or abstract reports QTL
mapping, GWAS, meta-QTL or epistatic-QTL work, then removes every paper
already represented here:

  * its DOI is in public/data/publications.csv, or
  * its title matches a reference that this database holds without a DOI.

Papers whose associations are already imported from GWAS Atlas are kept in the
list but flagged, since they have not been curated here.

Nothing is fetched beyond bibliographic metadata, and nothing is added to the
site's data: the output is curation/missing_studies.csv plus a short summary.
Each row is a CANDIDATE - the search reads titles and abstracts, not the
paper, so a curator still has to confirm a paper reports mapped loci.

Usage: python3 scripts/mine/find_missing_studies.py
"""

import csv
import html
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import hit_count, search  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "public", "data")
OUT_DIR = os.path.join(ROOT, "curation")
csv.field_size_limit(10_000_000)

WHEAT = "TITLE:(wheat OR Triticum OR durum OR Aegilops OR emmer OR einkorn OR spelt)"
MAPPING_TERMS = ["QTL", "QTLs", "quantitative trait loci", "quantitative trait locus",
                 "genome-wide association", "GWAS", "marker-trait association",
                 "association mapping", "meta-QTL"]
MAPPING = "(" + " OR ".join(f'TITLE_ABS:"{t}"' for t in MAPPING_TERMS) + ")"
QUERY = f'{WHEAT} AND {MAPPING} NOT PUB_TYPE:"Review"'

STUDY_TYPES = [
    ("Meta-QTL", re.compile(r"meta[- ]?qtl|meta[- ]analysis of qtl|mqtl", re.I)),
    ("Epistatic QTL", re.compile(r"epista", re.I)),
    ("GWAS", re.compile(r"genome[- ]wide association|gwas|association mapping|marker[- ]trait association", re.I)),
    ("QTL mapping", re.compile(r"\bqtls?\b|quantitative trait loc", re.I)),
]

# Rough trait hint from the title only, to help a curator sort the worklist. It
# is deliberately NOT the site's trait classifier: that one assigns records to
# the published trait table and must not be fed free-text paper titles.
TRAIT_HINTS = [
    ("Fungal / disease resistance", r"rust|mildew|fusarium|blight|septoria|blotch|tan spot|bunt|smut|blast|resistan\w* to|disease"),
    ("Insect / nematode / virus", r"aphid|hessian fly|midge|sawfly|insect|nematode|virus"),
    ("Drought", r"drought|water[- ](deficit|stress|limited)|rainfed"),
    ("Heat", r"\bheat\b|high[- ]temperature|terminal heat"),
    ("Salt", r"salt|salin"),
    ("Cold / frost", r"frost|freez|cold|winter[- ]hardiness"),
    ("Pre-harvest sprouting", r"sprouting|dormancy"),
    ("Nutrient use efficiency", r"nitrogen|phosph|potassium|nutrient[- ]use|\bnue\b"),
    ("Biofortification / minerals", r"zinc|iron|selenium|mineral|biofortif|micronutrient|cadmium"),
    ("Quality", r"quality|protein|gluten|starch|dough|flour|bread[- ]making|hardness|pasta|noodle"),
    ("Yield and components", r"yield|grain weight|kernel weight|grain number|spike|tiller|biomass|harvest index"),
    ("Grain size / shape", r"grain (size|shape|length|width)|kernel (size|shape|length|width)"),
    ("Development / phenology", r"heading|flowering|maturity|vernali[sz]|photoperiod|phenolog|earliness"),
    ("Plant architecture", r"plant height|lodging|root|leaf|awn|stem|morpholog|architecture"),
]


def norm_title(t):
    t = re.sub(r"<[^>]+>", "", html.unescape(t or "")).lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def plain(t):
    # unescape first: some titles carry their markup as entities (&lt;i&gt;)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(t or ""))).strip().rstrip(".")


def main():
    have_doi, have_title = set(), set()
    with open(os.path.join(DATA, "publications.csv"), encoding="utf-8") as f:
        for p in csv.DictReader(f):
            if p["doi"]:
                have_doi.add(p["doi"].lower())
            if p["title"] and not p["title"].startswith("["):
                have_title.add(norm_title(p["title"]))
            elif p["url"] and not p["url"].startswith("http"):
                # a reference held only as pasted title text
                have_title.add(norm_title(re.split(r"\s+\|\s+", p["url"])[0]))
    atlas_doi, atlas_pmid = set(), set()
    atlas_path = os.path.join(DATA, "gwas_atlas.csv")
    if os.path.exists(atlas_path):
        with open(atlas_path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                atlas_doi.add(r["doi"].lower())
                atlas_pmid.add(r["pmid"])
    atlas_doi.discard("")

    total = hit_count(QUERY)
    print(f"Europe PMC candidates : {total}")
    rows, seen, skipped = [], set(), Counter()
    for r in search(QUERY, max_results=total + 100):
        key = (r.get("doi") or "").lower() or f"{r.get('source')}:{r.get('id')}"
        if key in seen:
            continue
        seen.add(key)
        title = plain(r.get("title"))
        doi = (r.get("doi") or "").lower()
        if doi and doi in have_doi:
            skipped["already in the database (DOI)"] += 1
            continue
        if norm_title(title) in have_title:
            skipped["already in the database (title)"] += 1
            continue
        if re.search(r"\b(correction|erratum|corrigendum|retract)", title, re.I):
            skipped["correction / retraction notice"] += 1
            continue
        text = f"{title} {r.get('abstractText') or ''}"
        kind = next((name for name, rx in STUDY_TYPES if rx.search(text)), "")
        hints = [name for name, pat in TRAIT_HINTS if re.search(pat, title, re.I)]
        journal = ((r.get("journalInfo") or {}).get("journal") or {}).get("title", "")
        pmid = r.get("pmid", "")
        rows.append({
            "year": r.get("pubYear", ""),
            "title": title,
            "authors": plain(r.get("authorString"))[:200],
            "journal": journal or plain(r.get("bookOrReportDetails", {}).get("publisher", "")),
            "study_type": kind,
            # "title" = the title itself reports mapping work (most likely a
            # primary study); "abstract" = only the abstract mentions it, which
            # is where most of the false candidates are.
            "mapping_in": "title" if any(rx.search(title) for _, rx in STUDY_TYPES) else "abstract",
            "trait_hint": "; ".join(hints[:3]),
            "doi": doi,
            "pmid": pmid,
            "pmcid": r.get("pmcid", ""),
            "open_access": "yes" if r.get("isOpenAccess") == "Y" else "no",
            "has_supplement": "yes" if r.get("hasSuppl") == "Y" else "",
            "cited_by": r.get("citedByCount", ""),
            "in_gwas_atlas": "yes" if (doi and doi in atlas_doi) or (pmid and pmid in atlas_pmid) else "",
            "preprint": "yes" if r.get("source") == "PPR" else "",
            "url": f"https://doi.org/{doi}" if doi else f"https://europepmc.org/article/{r.get('source')}/{r.get('id')}",
        })

    # A preprint whose published version is also listed is the same study.
    published = {norm_title(r["title"]) for r in rows if not r["preprint"]}
    before = len(rows)
    rows = [r for r in rows if not (r["preprint"] and norm_title(r["title"]) in published)]
    skipped["preprint of a listed paper"] = before - len(rows)

    rows.sort(key=lambda r: (-(int(r["year"]) if r["year"].isdigit() else 0), r["title"].lower()))
    for i, r in enumerate(rows, 1):
        r["n"] = i
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "missing_studies.csv")
    cols = ["n"] + [c for c in rows[0] if c != "n"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    for reason, n in skipped.most_common():
        print(f"  skipped {n:>5}  {reason}")
    print(f"candidate studies not in the database : {len(rows)}")
    by_year = Counter(r["year"] for r in rows)
    by_type = Counter(r["study_type"] or "unclear" for r in rows)
    by_trait = Counter(h for r in rows for h in (r["trait_hint"].split("; ") if r["trait_hint"] else ["(no hint)"]))

    lines = [
        "# Wheat QTL / GWAS studies not yet in WheatQTLdb",
        "",
        "A curation worklist generated by `scripts/mine/find_missing_studies.py` from a Europe PMC",
        "search. It is kept apart from the database: nothing here is on the site or in its counts.",
        "",
        f"- Europe PMC papers matching the search: **{total:,}**",
        f"- Already in the database: **{skipped['already in the database (DOI)'] + skipped['already in the database (title)']:,}**",
        f"- Candidates listed in `missing_studies.csv`: **{len(rows):,}**",
        f"  - mapping work named in the title (strongest candidates): {sum(1 for r in rows if r['mapping_in'] == 'title'):,}",
        f"  - open access: {sum(1 for r in rows if r['open_access'] == 'yes'):,}",
        f"  - with supplementary files on Europe PMC: {sum(1 for r in rows if r['has_supplement']):,}",
        f"  - already imported from GWAS Atlas (not curated here): {sum(1 for r in rows if r['in_gwas_atlas']):,}",
        f"  - preprints with no published version found: {sum(1 for r in rows if r['preprint']):,}",
        "",
        "Every row is a candidate. The search reads the title and abstract only, so a paper is",
        "listed when it *mentions* QTL or GWAS work in wheat; a curator has to confirm that it",
        "reports mapped loci before any record is entered. Papers this database holds only as a",
        "publisher link with no DOI cannot be matched and may appear here although they are in it.",
        "",
        "## By study type", "", "| Study type | Papers |", "|---|---|",
        *[f"| {k} | {v:,} |" for k, v in by_type.most_common()],
        "", "## By trait (hint from the title; a paper can have several)", "", "| Trait | Papers |", "|---|---|",
        *[f"| {k} | {v:,} |" for k, v in by_trait.most_common()],
        "", "## By year", "", "| Year | Papers |", "|---|---|",
        *[f"| {y} | {by_year[y]:,} |" for y in sorted(by_year, reverse=True)],
        "",
        "Search used:", "", f"    {QUERY}", "",
    ]
    with open(os.path.join(OUT_DIR, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()
