#!/usr/bin/env python3
"""
Build public/data/candidate_genes.csv from the records themselves.

The page previously showed eight hand-written exemplar genes (Vrn-A1, Fhb1 and
so on) while 5,303 records in qtl.csv and metaqtl.csv named a candidate gene
that was never surfaced anywhere. This collects them.

Values in that column are of three different kinds and are not interchangeable:

  * a gene SYMBOL (Vrn-A1, Fhb1, Lr46) - a curated record with a GrainGenes
    page, which is what a "look this up" link should point at;
  * a gene MODEL id (TraesCS5A02G391700, TRITD2Bv1G013040) - an annotation
    feature on a specific assembly, which GrainGenes does not hold but Ensembl
    Plants shows directly;
  * a DOMAIN description pasted from InterPro ("NB-ARC, Leucine-rich repeat
    domain, ...") - not an identifier at all, and linking it anywhere would be
    wrong.

Each row therefore records which kind it is, so the site can offer the right
link instead of one that 404s.

Usage: python3 scripts/build_candidate_genes.py
"""

import csv
import os
import re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
csv.field_size_limit(10_000_000)

# IWGSC gene models. The release is encoded in the middle of the id - 01G is
# RefSeq v1.0, 02G v1.1, 03G v2.1 - so all three have to be accepted; matching
# only 01/02 filed every v2.1 id (TraesCS7B03G1084500) as a gene SYMBOL and
# would have sent it to GrainGenes, which holds no such record. A trailing
# ".1" is a transcript rather than a gene, and LC marks a low-confidence
# model: both are kept but labelled, since a low-confidence call is weaker
# evidence than a high-confidence one.
IWGSC = re.compile(r"^TraesCS(?:U|[1-7][ABD])0[123]G\d{6,7}(LC)?(?:\.\d+)?$", re.I)
DURUM = re.compile(r"^\(?(?:HC|LC)?\)?\s*TRITD[1-7][ABU]v1G\d{6}(?:\.\d+)?$", re.I)
# The earlier TGAC assembly's gene models, still cited by pre-2018 papers.
TGAC = re.compile(r"^TRIAE_CS42_[1-7][ABDU][LS]?_TGACv1_\d+_AA\d+(?:\.\d+)?$", re.I)
# A wheat gene symbol: Vrn-A1, Ppd-D1, Rht-B1, Fhb1, Lr46, Sr2, TaGW2 ...
# The subgenome suffix is written letter-then-copy ("-A1", "-D1"), not
# "-1A": requiring the latter put Vrn-A1 and Ppd-D1 in the unclassified pile.
SYMBOL = re.compile(r"^(Ta[A-Z]|[A-Z][a-z]{1,4})[A-Za-z0-9]*(-[ABD]\d?|-[1-7][ABD]\d?)?\d*$")
# Excel error values and single stray characters are not genes. These reached
# the column because the source cell held a broken formula or a sort artefact.
JUNK = re.compile(r"^(#\w+|Err:\d+|#REF!?|#VALUE!?|#N/?A|[A-Za-z]|\d+|[^\w]+)$", re.I)
# Several genes in one cell, which is normal for a QTL interval.
SPLIT = re.compile(r"\s*[;,/]\s*|\s+and\s+")
# InterPro-style descriptions: prose, with domain/family/protein vocabulary.
DOMAINISH = re.compile(
    r"\b(domain|family|protein|kinase|repeat|transporter|receptor|factor|"
    r"binding|synthase|transferase|oxidase|reductase|hydrolase|unknown|"
    r"NB-ARC|LRR|zinc finger|cytochrome)\b", re.I)


def classify(value: str) -> str:
    if JUNK.match(value):
        return ""
    if TGAC.match(value):
        return "TGACv1 gene model"
    if IWGSC.match(value):
        return "IWGSC gene model (low confidence)" if value.upper().endswith("LC") \
            else "IWGSC gene model"
    if DURUM.match(value):
        return "Durum (Svevo) gene model"
    if DOMAINISH.search(value) or len(value) > 40 or " " in value.strip():
        return "Functional annotation"
    # Every wheat gene symbol carries a number - the homoeologous copy (Vrn-A1,
    # Rht-B1) or the serial designation (Lr34, Fhb1, Sr2). A bare capitalised
    # word with no digit is a protein family pasted from an annotation table
    # ("Defensin", "Chitinase", "Carboxypeptidase"), not a symbol, and must not
    # be offered as a GrainGenes lookup.
    if not re.search(r"\d", value):
        return "Functional annotation"
    if re.match(r"^Traes", value, re.I):
        return "Other gene model"
    if SYMBOL.match(value):
        return "Gene symbol"
    return "Other identifier"


def main():
    agg = defaultdict(lambda: {"records": 0, "traits": set(), "chrom": set(),
                               "qtl": set(), "ref": "", "doi": "", "tables": set()})
    for fname, label in (("qtl.csv", "QTL"), ("metaqtl.csv", "MetaQTL")):
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                raw = (r.get("candidate_gene") or "").strip()
                if not raw:
                    continue
                # A functional annotation is one value even though it contains
                # commas; splitting it would invent dozens of fake "genes".
                parts = [raw] if classify(raw) == "Functional annotation" \
                    else [p.strip() for p in SPLIT.split(raw) if p.strip()]
                for g in parts:
                    if not classify(g):
                        continue
                    a = agg[g]
                    a["records"] += 1
                    a["tables"].add(label)
                    if r.get("trait"):
                        a["traits"].add(r["trait"].strip())
                    if r.get("chromosome"):
                        a["chrom"].add(r["chromosome"].strip())
                    name = (r.get("qtl_name") or r.get("mqtl_name") or "").strip()
                    if name:
                        a["qtl"].add(name)
                    if not a["ref"] and r.get("reference"):
                        a["ref"] = r["reference"]
                    if not a["doi"] and r.get("doi"):
                        a["doi"] = r["doi"]

    rows = []
    for g, a in sorted(agg.items(), key=lambda kv: (-kv[1]["records"], kv[0])):
        kind = classify(g)
        rows.append({
            "id": f"G{len(rows)+1:05d}",
            "gene": g,
            "gene_type": kind,
            "chromosome": "; ".join(sorted(a["chrom"])[:4]),
            "position": "",
            "trait": "; ".join(sorted(a["traits"])[:3]),
            "qtl_name": "; ".join(sorted(a["qtl"])[:3]),
            "records": a["records"],
            "record_types": "; ".join(sorted(a["tables"])),
            "reference": a["ref"],
            "doi": a["doi"],
        })

    path = os.path.join(DATA, "candidate_genes.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    from collections import Counter
    print(f"candidate genes : {len(rows)}")
    for k, n in Counter(r["gene_type"] for r in rows).most_common():
        print(f"  {n:5d}  {k}")
    print(f"record mentions : {sum(r['records'] for r in rows)}")
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()
