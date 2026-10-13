#!/usr/bin/env python3
"""
Build public/data/gwas_atlas.csv - wheat marker-trait associations curated by
GWAS Atlas (NGDC/CNCB) from publications this database does not already hold.

GWAS Atlas (https://ngdc.cncb.ac.cn/gwas/; Tian et al. 2020, Nucleic Acids
Res. 48:D927, PMID 31566222) publishes its manually curated associations per
species as a download "freely for academic users". Every wheat association in
it carries a physical position on IWGSC RefSeq v1.0, which is exactly what most
of this database's own GWAS records lack.

Two rules keep the import honest:

  * Only publications NOT already in publications.csv are taken. A paper the
    curators here already entered is left alone, so no association is counted
    twice under two curation schemes.
  * The result is its own table, not rows appended to qtl.csv. The curated QTL
    counts are checked against the curators' published trait table on every
    rebuild; a third-party import must not move them.

The source file is cached under scripts/mine/.cache and downloaded if absent.

Usage: python3 scripts/build_gwas_atlas.py
"""

import csv
import gzip
import os
import re
import sys
import urllib.request
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_publications import _ncbi_batch, plain  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
CACHE = os.path.join(ROOT, "scripts", "mine", ".cache")
SRC = os.path.join(CACHE, "gwas_atlas_wheat.txt.gz")
URL = "ftp://download.big.ac.cn/gwas_atlas/gwas_association_result_for_wheat.txt.gz"
csv.field_size_limit(10_000_000)

CHR_OK = re.compile(r"^[1-7][ABD]$")
BLANK = {"", "na", "n/a", "nan", "-", "--", "none", "null"}


def clean(v):
    v = re.sub(r"\s+", " ", (v or "").replace("\xa0", " ")).strip()
    return "" if v.lower() in BLANK else v


def load_source():
    if not os.path.exists(SRC):
        os.makedirs(CACHE, exist_ok=True)
        print(f"downloading {URL}")
        urllib.request.urlretrieve(URL, SRC)
    with gzip.open(SRC, "rt", encoding="utf-8", errors="replace") as f:
        rows = list(csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE))
    header = [clean(h).lstrip("#") for h in rows[0]]
    return header, rows[1:]


def main():
    header, body = load_source()
    col = {h: i for i, h in enumerate(header)}
    # The file's rows are two fields longer than its header from "First author"
    # on, so the bibliographic tail is read by position from the END of the row
    # (the publication date is always last) and the rest by header name.
    need = ["GaP_id", "Chr", "Pos", "Sampling condition", "Species/Population", "Sample size",
            "Tissue", "Trait", "Trait accession", "Genotype technology", "GWAS model",
            "P-value", "R2(%)", "Reported gene(S)", "Gene symbol", "PMID", "Journal", "Title",
            "First author", "Environment"]
    missing = [n for n in need if n not in col]
    if missing:
        sys.exit(f"GWAS Atlas file layout changed - columns not found: {missing}")
    print(f"GWAS Atlas wheat associations : {len(body)}")

    pmids = {clean(r[col["PMID"]]) for r in body if clean(r[col["PMID"]]).isdigit()}
    pm_doi, _, pm_meta = _ncbi_batch(set(pmids), set())

    have = set()
    with open(os.path.join(DATA, "publications.csv"), encoding="utf-8") as f:
        for p in csv.DictReader(f):
            if p["doi"]:
                have.add(p["doi"].lower())
    already = {p for p in pmids if pm_doi.get(p, "") in have}
    print(f"publications                  : {len(pmids)}")
    print(f"  already in this database    : {len(already)}  (skipped)")
    print(f"  new                         : {len(pmids) - len(already)}")

    out, skipped = [], Counter()
    for r in body:
        g = lambda name: clean(r[col[name]]) if col[name] < len(r) else ""
        pmid = g("PMID")
        if pmid in already:
            skipped["publication already curated here"] += 1
            continue
        chrom = g("Chr").upper()
        pos = g("Pos").replace(",", "")
        if not CHR_OK.match(chrom) or not pos.isdigit():
            skipped["no chromosome / position"] += 1
            continue
        meta = pm_meta.get(pmid, {})
        year = meta.get("year") or (re.match(r"(\d{4})", clean(r[-1])) or [""])[0]
        author = g("First author")
        lead = (author.split()[-1] + " et al." if author else "").strip()
        title = plain(g("Title")).rstrip(".")
        trait = g("Trait")
        out.append({
            "species": "Triticum aestivum",
            "trait": trait[:1].upper() + trait[1:],
            "trait_accession": g("Trait accession"),
            "chromosome": chrom,
            "position": pos,
            "p_value": g("P-value"),
            "pve": g("R2(%)"),
            "candidate_gene": g("Reported gene(S)") or g("Gene symbol"),
            "condition": g("Sampling condition"),
            "environment": g("Environment"),
            "population": g("Species/Population"),
            "sample_size": g("Sample size"),
            "tissue": g("Tissue"),
            "genotyping": g("Genotype technology"),
            "method": g("GWAS model"),
            "reference": f"{lead} ({year}) {title}. {g('Journal')}.".strip() if title else "",
            "doi": pm_doi.get(pmid, ""),
            "pmid": pmid,
            "year": year,
            "gwas_atlas_id": g("GaP_id"),
        })

    # the same association is sometimes listed twice under one study
    seen, rows = set(), []
    for r in out:
        key = tuple(v for k, v in r.items() if k != "gwas_atlas_id")
        if key in seen:
            skipped["exact duplicate"] += 1
            continue
        seen.add(key)
        rows.append(r)
    for i, r in enumerate(rows, 1):
        r["id"] = f"G{i:05d}"

    cols = ["id"] + [c for c in rows[0] if c != "id"]
    path = os.path.join(DATA, "gwas_atlas.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    for reason, n in skipped.most_common():
        print(f"  skipped {n:>6}  {reason}")
    print(f"associations written          : {len(rows)} from "
          f"{len({r['pmid'] for r in rows})} publications, {len({r['trait'] for r in rows})} traits")
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()
