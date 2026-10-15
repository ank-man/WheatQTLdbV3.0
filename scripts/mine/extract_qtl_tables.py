#!/usr/bin/env python3
"""
Extract QTL / MTA result tables from the open-access papers that are not yet
in the database.

Input is curation/missing_studies.csv (find_missing_studies.py). For every
paper with open full text in Europe PMC, each typeset table is read and kept
only if it is recognisably a table of mapped loci:

  * it has a chromosome column, and
  * a locus column (QTL name, marker or SNP), and
  * at least one result column (position, LOD, PVE / R2, p-value or effect),
  * and it does not cite other studies row by row (a "Reference" column marks
    a table that summarises earlier work, whose QTL would be counted twice).

A row is kept only if its chromosome is one of the 21 wheat chromosomes. That
single test removes almost everything that is not a wheat locus - other
species, summary rows, footnotes.

These records are MACHINE-EXTRACTED. Nobody has read the paper to check them:
a column can be misread, a trait can sit in the caption instead of a column,
and a table can list candidate rather than significant loci. They are written
to their own file with the table they came from, so each can be checked
against its source, and they are never mixed into the curated tables.

Writes curation/extracted_qtl.csv and curation/extraction_report.csv.

Usage: python3 scripts/mine/extract_qtl_tables.py [--limit N]
"""

import argparse
import csv
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import full_text_many  # noqa: E402
from harvest_map_tables import tables_from_xml  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "public", "data")
# not part of the website: kept for curators only
OFFSITE = os.path.join(ROOT, "curation")
CURATION = os.path.join(ROOT, "curation")
csv.field_size_limit(10_000_000)


def norm(h):
    return re.sub(r"[^a-z0-9%]+", " ", (h or "").lower()).strip()


# header patterns, tested against the normalised header text
COLS = {
    "chromosome": re.compile(r"^(chr|chrom|chromosome|chr no|chromosome no|linkage group|lg)s?( arm)?$"),
    "qtl": re.compile(r"^(qtl|qtls|qtl name|locus|loci|mta|mtas|qtn|qtns|qtl designation|name of qtl)( name| id)?$"),
    "marker": re.compile(r"(^| )(marker|markers|snp|snps|snp id|snp name|marker name|flanking markers?|marker interval|"
                         r"peak marker|closest marker|nearest marker|left marker|right marker|associated marker)s?( name| id)?$"),
    "position": re.compile(r"(^| )(position|pos|peak position|physical position|genetic position|location|interval|"
                           r"confidence interval|ci|peak|cm|mb|bp|start|end)( cm| mb| bp)?$"),
    "pve": re.compile(r"(^| )(pve|r2|r 2|r²|phenotypic variance|variance explained|phenotypic variation|"
                      r"explained variance|rsq|r square)( %| explained)*$|^pve %$|^r2 %$"),
    "lod": re.compile(r"(^| )(lod|lod score|peak lod|max lod)$"),
    "pvalue": re.compile(r"(^| )(p|p value|pvalue|p val|log10 p|log p|log10p|fdr|q value)( value)?$"),
    "effect": re.compile(r"(^| )(additive effect|add|additive|effect|allelic effect|a effect|add effect)s?$"),
    "trait": re.compile(r"^(trait|traits|phenotype|character|parameter|trait name|disease|pathogen)s?$"),
    "environment": re.compile(r"^(environment|env|year|location|trial|treatment|condition|site)s?$"),
    "cites": re.compile(r"^(reference|references|ref|refs|source|study|citation|author|authors|reported by|"
                        r"previous(ly)? (stud|report).*)$"),
}
CHR = re.compile(r"^(?:chr\.?\s*)?([1-7])\s*([ABD])\s*([SL])?(?:[.\-_ ].{0,4})?$", re.I)
NUMBER = re.compile(r"^[<>~≈]?\s*-?\d+(\.\d+)?(\s*[eE×x]\s*10?\s*[-−^]?\s*\d+)?\s*%?$")


def find_header(rows, scan=4):
    """Index of the header row and {role: column}. Multi-row headers are
    joined, so a grouped heading ("Position" over "cM") still names its column."""
    best = None
    for i in range(min(scan, len(rows))):
        width = max(len(r) for r in rows[i:i + 2])
        joined = []
        for c in range(width):
            a = rows[i][c] if c < len(rows[i]) else ""
            joined.append(a)
        roles = {}
        for c, h in enumerate(joined):
            n = norm(h)
            if not n or len(n) > 45:
                continue
            for role, rx in COLS.items():
                if role not in roles and rx.search(n):
                    roles[role] = c
                    break
        score = len(roles)
        if "chromosome" in roles and (best is None or score > best[2]):
            best = (i, roles, score)
    return (best[0], best[1]) if best else (None, {})


def chromosome(value):
    m = CHR.match((value or "").strip())
    return f"{m.group(1)}{m.group(2).upper()}" if m else ""


def clean(v):
    v = re.sub(r"\s+", " ", (v or "")).strip()
    return "" if v in {"-", "–", "—", "NA", "na", "n/a", "ns", "nd", ".", "/"} else v


def trait_from_caption(caption):
    """'QTL for grain yield detected in ...' -> 'grain yield'. Empty if the
    caption does not name one trait plainly."""
    m = re.search(r"\b(?:QTLs?|MTAs?|loci|markers?|SNPs?)\s+(?:detected |identified |associated |significantly associated )?"
                  r"(?:for|with|controlling|affecting|underlying)\s+([A-Za-z][A-Za-z \-/]{3,60}?)"
                  r"(?:\s+(?:in|under|detected|identified|using|across|from|by|at|on)\b|[.,;(]|$)", caption or "", re.I)
    return m.group(1).strip() if m else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    with open(os.path.join(CURATION, "missing_studies.csv"), encoding="utf-8") as f:
        studies = {r["pmcid"]: r for r in csv.DictReader(f) if r["pmcid"]}
    pmcids = sorted(studies)
    if args.limit:
        pmcids = pmcids[:args.limit]
    print(f"papers with open full text : {len(pmcids)}")

    records, report, why = [], [], Counter()
    for pmcid, xml in full_text_many(pmcids):
        s = studies[pmcid]
        if not xml.strip():
            why["no full text returned"] += 1
            continue
        species = "Triticum durum" if re.search(r"\bdurum\b", s["title"], re.I) else "Triticum aestivum"
        method = {"GWAS": "GWAS", "QTL mapping": "QTL mapping", "Meta-QTL": "Meta-analysis",
                  "Epistatic QTL": "QTL mapping"}.get(s["study_type"], "")
        got = 0
        for t in tables_from_xml(pmcid, xml):
            rows = t["rows"]
            h, roles = find_header(rows)
            if h is None:
                why["table: no chromosome column"] += 1
                continue
            if "cites" in roles:
                why["table: cites other studies"] += 1
                continue
            if "qtl" not in roles and "marker" not in roles:
                why["table: no locus column"] += 1
                continue
            if not ({"position", "pve", "lod", "pvalue", "effect"} & set(roles)):
                why["table: no result column"] += 1
                continue
            cap_trait = trait_from_caption(t["caption"])
            kept = []
            last_trait = ""
            for r in rows[h + 1:]:
                cell = lambda role: clean(r[roles[role]]) if role in roles and roles[role] < len(r) else ""
                chrom = chromosome(cell("chromosome"))
                trait = cell("trait")
                if trait:
                    last_trait = trait            # trait cells are often filled once per block
                if not chrom:
                    continue
                name, marker = cell("qtl"), cell("marker")
                if not name and not marker:
                    continue
                pve = cell("pve").rstrip("%").strip()
                kept.append({
                    "species": species,
                    "trait": trait or last_trait or cap_trait,
                    "qtl_name": name,
                    "chromosome": chrom,
                    "position_interval": cell("position"),
                    "associated_markers": marker,
                    "pve": pve if NUMBER.match(pve or "x") or re.match(r"^\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?$", pve) else "",
                    "lod": cell("lod"),
                    "p_value": cell("pvalue"),
                    "environment": cell("environment"),
                    "method": method,
                    "reference": f"{s['authors'].split(',')[0].strip()} et al. ({s['year']}) {s['title']}. {s['journal']}.",
                    "doi": s["doi"], "pmcid": pmcid, "year": s["year"],
                    "source_table": t["source_name"],
                })
            # a table of loci has several of them; one or two rows on wheat
            # chromosomes is usually an example or a summary line
            if len(kept) < 3:
                why["table: fewer than 3 wheat loci"] += 1
                continue
            if sum(1 for k in kept if k["trait"]) < len(kept) * 0.5:
                why["table: trait not identifiable"] += 1
                continue
            records.extend(kept)
            got += len(kept)
            report.append({"pmcid": pmcid, "doi": s["doi"], "year": s["year"], "table": t["source_name"],
                           "records": len(kept), "columns": "; ".join(sorted(roles)),
                           "caption": t["caption"][:160], "title": s["title"][:120]})
        if not got:
            why["paper: no QTL table recognised"] += 1

    # identical rows within a paper (a table repeated in the text)
    seen, uniq = set(), []
    for r in records:
        key = tuple(v for k, v in r.items() if k != "source_table")
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)
    for i, r in enumerate(uniq, 1):
        r["id"] = f"X{i:05d}"

    cols = ["id", "species", "trait", "qtl_name", "chromosome", "position_interval", "associated_markers",
            "pve", "lod", "p_value", "environment", "method", "reference", "doi", "pmcid", "year", "source_table"]
    with open(os.path.join(OFFSITE, "extracted_qtl.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(uniq)
    with open(os.path.join(CURATION, "extraction_report.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["pmcid", "doi", "year", "table", "records", "columns", "caption", "title"])
        w.writeheader()
        w.writerows(sorted(report, key=lambda r: -r["records"]))

    papers = len({r["pmcid"] for r in uniq})
    print(f"records extracted          : {len(uniq)} from {len(report)} tables in {papers} papers")
    for reason, n in why.most_common():
        print(f"  {n:>6}  {reason}")
    with open(os.path.join(OFFSITE, "extracted_qtl_summary.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["records", "publications", "tables"])
        w.writerow([len(uniq), papers, len(report)])


if __name__ == "__main__":
    main()
