"""
Stage 2: pull every table out of the corpus.

Two independent sources, because QTL results are split between them:
  * JATS <table-wrap> elements in the open-access full text, and
  * supplementary spreadsheets (.xlsx/.xls/.csv), which is where large
    QTL/GWAS result tables usually end up once they outgrow a typeset table.

Writes out/tables.jsonl - one JSON object per table, carrying the provenance
(pmcid, doi, table label, source kind) that every downstream record needs in
order to be checkable against the paper.

Usage:  python3 scripts/mine/02_tables.py [--limit N] [--no-suppl]
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import OUT, full_text_many, supplementary_many  # noqa: E402

csv.field_size_limit(10_000_000)


def cell_text(el) -> str:
    return " ".join("".join(el.itertext()).split())


def expand_row(tr):
    """Flatten a <tr> to a list of strings, honouring colspan.

    Header rows in JATS tables lean on colspan for grouped headings; ignoring
    it misaligns every column to the right of the group and silently corrupts
    the mapping between header and value.
    """
    out = []
    for cell in tr:
        if not isinstance(cell.tag, str) or cell.tag not in ("td", "th"):
            continue
        txt = cell_text(cell)
        try:
            span = int(cell.get("colspan", "1"))
        except ValueError:
            span = 1
        out.append(txt)
        for _ in range(max(0, span - 1)):
            out.append("")
    return out


def tables_from_xml(pmcid: str, xml: str):
    """Yield table dicts from a JATS full-text document."""
    if not xml.strip():
        return
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return

    doi = ""
    for aid in root.findall(".//article-id"):
        if aid.get("pub-id-type") == "doi":
            doi = (aid.text or "").strip()
            break
    title_el = root.find(".//article-title")
    title = cell_text(title_el) if title_el is not None else ""

    for i, tw in enumerate(root.findall(".//table-wrap")):
        label_el = tw.find("label")
        cap_el = tw.find("caption")
        label = cell_text(label_el) if label_el is not None else f"Table {i + 1}"
        caption = cell_text(cap_el) if cap_el is not None else ""
        table = tw.find(".//table")
        if table is None:
            continue
        rows = [expand_row(tr) for tr in table.findall(".//tr")]
        rows = [r for r in rows if any(c.strip() for c in r)]
        if len(rows) < 2:
            continue
        yield {
            "pmcid": pmcid,
            "doi": doi,
            "paper_title": title,
            "source_kind": "fulltext_table",
            "source_name": label,
            "caption": caption,
            "rows": rows,
        }


def tables_from_supplement(pmcid: str, blob: bytes):
    """Yield table dicts from supplementary spreadsheets/CSVs in a zip."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(blob))
    except Exception:
        return

    for name in zf.namelist():
        low = name.lower()
        if low.endswith("/") or "__macosx" in low:
            continue
        try:
            data = zf.read(name)
        except Exception:
            continue

        if low.endswith((".xlsx", ".xlsm")):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
            except Exception:
                continue
            for ws in wb.worksheets:
                rows = []
                for r in ws.iter_rows(values_only=True):
                    vals = ["" if v is None else str(v).strip() for v in r]
                    if any(vals):
                        rows.append(vals)
                    if len(rows) > 20000:
                        break
                if len(rows) >= 2:
                    yield {
                        "pmcid": pmcid, "doi": "", "paper_title": "",
                        "source_kind": "supplement_xlsx",
                        "source_name": f"{os.path.basename(name)}#{ws.title}",
                        "caption": "", "rows": rows,
                    }
            try:
                wb.close()
            except Exception:
                pass

        elif low.endswith(".xls"):
            try:
                import xlrd
                book = xlrd.open_workbook(file_contents=data)
            except Exception:
                continue
            for sh in book.sheets():
                rows = []
                for ri in range(sh.nrows):
                    vals = [str(sh.cell_value(ri, ci)).strip() for ci in range(sh.ncols)]
                    if any(vals):
                        rows.append(vals)
                if len(rows) >= 2:
                    yield {
                        "pmcid": pmcid, "doi": "", "paper_title": "",
                        "source_kind": "supplement_xls",
                        "source_name": f"{os.path.basename(name)}#{sh.name}",
                        "caption": "", "rows": rows,
                    }

        elif low.endswith((".csv", ".tsv", ".txt")):
            try:
                text = data.decode("utf-8", errors="replace")
            except Exception:
                continue
            delim = "\t" if low.endswith((".tsv", ".txt")) else ","
            try:
                rows = [r for r in csv.reader(io.StringIO(text), delimiter=delim) if any(x.strip() for x in r)]
            except Exception:
                continue
            if len(rows) >= 2:
                yield {
                    "pmcid": pmcid, "doi": "", "paper_title": "",
                    "source_kind": "supplement_csv",
                    "source_name": os.path.basename(name),
                    "caption": "", "rows": rows[:20000],
                }


# Supplementary bundles average ~7 MB, so the queue has to be narrow. An
# earlier version gated on "does the full text mention QTL", which matched
# almost the whole corpus (the corpus was BUILT from a QTL query) and queued
# 1,256 papers - several GB for little extra yield.
#
# The useful queue is papers that actually produced QTL records, since those
# are the ones whose supplements hold the matching marker tables and linkage
# maps. Papers that mention linkage maps explicitly are included too, because
# a marker-order table is exactly what the consensus-map step needs and such a
# paper may not have yielded a typeset QTL table.
MAP_HINT = re.compile(
    r"\b(linkage map|genetic map|consensus map|marker order|map construction|"
    r"recombination map|composite map)\b", re.I)

# Skip anything this large: at that size a bundle is raw sequencing or image
# data, not a table, and downloading it wastes the whole budget.
MAX_BUNDLE_MB = 120


def candidate_pmcids():
    """Not used for the wheat map run: every paper in the queue was already
    selected because it reports a genetic map, so there is nothing further to
    narrow by."""
    return None
    path = os.path.join(OUT, "candidates_validated.csv")
    if not os.path.exists(path):
        return None
    out = set()
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("status") in ("accept", "review"):
                out.add(r["pmcid"])
    return out or None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only process first N papers")
    ap.add_argument("--no-suppl", action="store_true")
    args = ap.parse_args()

    papers_path = os.path.join(OUT, "wheat_map_papers.csv")
    with open(papers_path, encoding="utf-8") as f:
        papers = list(csv.DictReader(f))
    if args.limit:
        papers = papers[: args.limit]

    by_id = {p["pmcid"]: p for p in papers}
    cand_ids = candidate_pmcids()
    if cand_ids:
        print(f"restricting supplementary fetch to {len(cand_ids)} QTL-bearing papers "
              f"(plus any paper that names a linkage/genetic map)")
    pmcids = [p["pmcid"] for p in papers]
    print(f"fetching full text for {len(pmcids)} papers (concurrent, cached)...")

    out_path = os.path.join(OUT, "wheat_map_tables.jsonl")
    n_tables = n_ft = 0
    suppl_queue = []

    with open(out_path, "w", encoding="utf-8") as out:
        for pmcid, xml in full_text_many(pmcids):
            if not xml.strip():
                continue
            n_ft += 1
            got = 0
            for tbl in tables_from_xml(pmcid, xml):
                tbl["species_query"] = "Triticum aestivum"
                tbl["year"] = by_id[pmcid]["year"]
                if not tbl["doi"]:
                    tbl["doi"] = by_id[pmcid]["doi"]
                out.write(json.dumps(tbl, ensure_ascii=False) + "\n")
                n_tables += 1
                got += 1
            if (not args.no_suppl) and by_id[pmcid].get("has_suppl") == "Y":
                wanted = (cand_ids is None) or (pmcid in cand_ids) or \
                    bool(MAP_HINT.search(xml[:400000]))
                if wanted:
                    suppl_queue.append(pmcid)

        print(f"  full text parsed: {n_ft} papers, {n_tables} typeset tables")

        if suppl_queue:
            print(f"fetching supplementary bundles for {len(suppl_queue)} QTL-bearing papers...")
            n_sup = 0
            for pmcid, blob in supplementary_many(suppl_queue):
                if not blob:
                    continue
                for tbl in tables_from_supplement(pmcid, blob):
                    tbl["species_query"] = "Triticum aestivum"
                    tbl["year"] = by_id[pmcid]["year"]
                    tbl["doi"] = by_id[pmcid]["doi"]
                    tbl["paper_title"] = by_id[pmcid]["title"]
                    out.write(json.dumps(tbl, ensure_ascii=False) + "\n")
                    n_tables += 1
                    n_sup += 1
            print(f"  supplementary tables: {n_sup}")

    print(f"\nwrote {n_tables} tables -> {out_path}")


if __name__ == "__main__":
    main()
