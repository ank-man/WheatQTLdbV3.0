#!/usr/bin/env python3
"""
Validate public/data against the rules it is supposed to satisfy.

reconcile_final_data.py answers "did every source row arrive". This answers
"is what arrived internally consistent" - the checks that would have caught the
defects found in this audit, so a future regression is caught by running one
command instead of by a reader noticing a wrong number.

Each check prints PASS or FAIL with the evidence. Exit status is non-zero if
any check fails, so it can gate a rebuild.

Usage: python3 scripts/validate_data.py
"""

import csv
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
csv.field_size_limit(10_000_000)

CHR_OK = re.compile(r"^([1-7][ABD]|Un)$")
# Every placeholder spelling the sources use. None may survive into a shipped
# field: these counted as real values and inflated "has a candidate gene" by
# 5,938 records.
PLACEHOLDER = {
    "-", "--", "---", "_", "__", ".", "?", "na", "n/a", "nil", "none", "nan",
    "nd", "nothing", "–", "—", "−", "－", "─", "╌",
}

failures = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  [{detail}]" if detail else ""))
    if not ok:
        failures.append(label)


def load(name):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    qtl = load("qtl.csv")
    mq = load("metaqtl.csv")
    ep = load("epistatic.csv")
    genes = load("candidate_genes.csv")
    maps = load("maps.csv")
    loci = load("map_loci.csv")
    pubs = load("publications.csv")

    print("\nrecord tables")
    for name, rows in (("qtl.csv", qtl), ("metaqtl.csv", mq), ("epistatic.csv", ep)):
        check(f"{name} present and non-empty", bool(rows), f"{len(rows or [])} rows")

    print("\nno placeholder values survived into a shipped field")
    for name, rows in (("qtl.csv", qtl), ("metaqtl.csv", mq)):
        if not rows:
            continue
        for field in ("candidate_gene", "qtl_name", "mqtl_name", "associated_markers",
                      "chromosome", "trait", "pve"):
            if field not in rows[0]:
                continue
            bad = Counter(r[field].strip() for r in rows
                          if r[field].strip().lower() in PLACEHOLDER)
            check(f"{name}:{field}", not bad, dict(bad.most_common(3)) if bad else "clean")

    print("\nevery record identifies a locus")
    if qtl:
        orphan = [r for r in qtl
                  if not r["qtl_name"].strip() and not r["associated_markers"].strip()]
        check("qtl.csv rows with neither a QTL name nor a marker", not orphan,
              f"{len(orphan)} rows")

    print("\nchromosomes are one of the 21 wheat codes or Un")
    for name, rows, fields in (("qtl.csv", qtl, ["chromosome"]),
                               ("metaqtl.csv", mq, ["chromosome"]),
                               ("epistatic.csv", ep, ["chromosome1", "chromosome2"])):
        if not rows:
            continue
        bad = Counter(r[f] for r in rows for f in fields
                      if f in r and r[f] and not CHR_OK.match(r[f]))
        check(f"{name} chromosome codes", not bad, dict(bad.most_common(3)) if bad else "clean")

    print("\nno duplicate record ids")
    for name, rows in (("qtl.csv", qtl), ("metaqtl.csv", mq), ("epistatic.csv", ep),
                       ("candidate_genes.csv", genes), ("maps.csv", maps)):
        if not rows or "id" not in rows[0] and "map_id" not in rows[0]:
            continue
        key = "id" if "id" in rows[0] else "map_id"
        ids = [r[key] for r in rows]
        check(f"{name} unique {key}", len(ids) == len(set(ids)),
              f"{len(ids) - len(set(ids))} duplicates")

    print("\nno byte-identical duplicate records")
    if qtl:
        seen = {tuple(sorted((k, v) for k, v in r.items() if k != "id")) for r in qtl}
        check("qtl.csv distinct records", len(seen) == len(qtl),
              f"{len(qtl) - len(seen)} duplicates")

    print("\ntrait classification partitions the records")
    if qtl:
        # The hierarchy lives in TypeScript, so this checks the invariant it has
        # to satisfy: a record carries exactly one trait string, and no record
        # may be countable under two major classes. Verified here by confirming
        # the trait field is single-valued, which is what makes that possible.
        multi = [r for r in qtl if ";" in r["trait"] or "|" in r["trait"]]
        check("qtl.csv trait field is single-valued", not multi, f"{len(multi)} rows")

    print("\ncandidate genes")
    if genes:
        kinds = Counter(r["gene_type"] for r in genes)
        check("every gene carries an identifier kind",
              all(r["gene_type"] for r in genes), dict(kinds))
        junk = [r for r in genes if r["gene"].strip().lower() in PLACEHOLDER
                or len(r["gene"].strip()) < 2]
        check("no placeholder or single-character genes", not junk, f"{len(junk)} rows")

    print("\nlinkage maps")
    if maps and loci is not None:
        ids = {m["map_id"] for m in maps}
        orphan = {l["map_id"] for l in loci} - ids
        check("every locus belongs to a listed map", not orphan, f"{len(orphan)} unknown ids")
        bad_lg = Counter(l["linkage_group"] for l in loci
                         if not re.match(r"^[1-7][ABD](\.\d+)?$", l["linkage_group"]))
        check("linkage groups are wheat groups", not bad_lg,
              dict(bad_lg.most_common(3)) if bad_lg else "clean")
        bad_cm = [l for l in loci
                  if not (0 <= float(l["position_cm"]) <= 400)]
        check("cM positions within 0-400", not bad_cm, f"{len(bad_cm)} outside")
        # a map claiming loci it does not ship is worse than one claiming none
        counts = Counter(l["map_id"] for l in loci)
        lying = [m["map_id"] for m in maps
                 if m["source"].startswith("Literature") and counts[m["map_id"]] == 0]
        check("every literature map ships its loci", not lying, f"{len(lying)} empty")
        mismatched = [m["map_id"] for m in maps if counts[m["map_id"]]
                      and int(m["n_loci"] or 0) != counts[m["map_id"]]]
        check("viewable map locus counts match", not mismatched,
              f"{len(mismatched)} mismatched")

    print("\nreferences")
    if qtl and pubs:
        have = sum(1 for r in qtl if r["reference"].strip())
        check("qtl.csv reference coverage above 50%", have / len(qtl) > 0.5,
              f"{have}/{len(qtl)} = {have / len(qtl) * 100:.1f}%")
        dois = {p["doi"] for p in pubs if p["doi"]}
        check("publications.csv has no duplicate DOIs", len(dois) == len(
            [p for p in pubs if p["doi"]]), f"{len(pubs)} rows")

        # Years come from the resolved publication. A year outside this range
        # means one was scraped out of a DOI or URL again (the "QTL published
        # in 2077" defect).
        this_year = __import__("datetime").date.today().year
        for name, rows in (("qtl.csv", qtl), ("metaqtl.csv", mq), ("epistatic.csv", ep)):
            if not rows or "year" not in rows[0]:
                check(f"{name} carries a publication year column", False, "column missing")
                continue
            bad = Counter(r["year"] for r in rows
                          if r["year"] and not (r["year"].isdigit() and 1980 <= int(r["year"]) <= this_year))
            check(f"{name} publication years within 1980-{this_year}", not bad,
                  dict(bad.most_common(3)) if bad else "clean")
        dated = sum(1 for r in qtl if r.get("year"))
        check("qtl.csv publication-year coverage above 85%", dated / len(qtl) > 0.85,
              f"{dated}/{len(qtl)} = {dated / len(qtl) * 100:.1f}%")
        # One row per article: a link-only "publication" credited with thousands
        # of records is several papers merged under their publisher's hostname.
        merged = [p for p in pubs if p["title"].startswith("[") and int(p["records"] or 0) > 1500]
        check("no link-only publication stands in for many papers", not merged,
              "; ".join(f"{p['title']} {p['records']}" for p in merged[:3]) or "clean")

    print("\nexcluded sheets stay excluded")
    if qtl:
        control = [r for r in qtl if "control" in r.get("treatment", "").lower()]
        check("no well-watered control records (Drought ... control.xlsx, 'Control' sheet)",
              not control, f"{len(control)} rows")

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} CHECK(S) FAILED:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
