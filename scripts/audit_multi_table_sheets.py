#!/usr/bin/env python3
"""
Find Excel sheets that hold MORE THAN ONE table.

The converter assumes one table per sheet: it finds the header row, then treats
everything below it as that table's body. A sheet with a second table stacked
underneath therefore gets that table's rows read against the FIRST table's
header - so columns land in the wrong fields, and a second header row is read
as if it were data.

A restart on its own is NOT enough to act on, and that distinction is the
whole point of this script. In Final_data all three sheets it flags turn out to
be one table whose numbering restarts because a v3.0 batch was appended below
the v2.0 rows without renumbering: same columns in the same order, and 6,332
genuinely new records from 113 papers that share almost no references with the
block above. Dropping the lower block to "use just one table" would delete all
of them. So each finding is classified: an appended batch keeps both blocks, a
second TABLE - different column meanings, or its own header row - needs a
decision recorded in the converter.

Three signals, each independently sufficient to look:

  * a row mid-sheet that repeats the header, or is header-like in its own right
    (column-name vocabulary rather than values);
  * a serial-number column that restarts at 1 part-way down;
  * a run of blank rows followed by more data, which is how a second table is
    normally separated from the first.

Reports only; changes nothing. Run it before trusting a count.

Usage: python3 scripts/audit_multi_table_sheets.py [--verbose]
"""

import argparse
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import convert_datasets as C  # noqa: E402

HEADER_VOCAB = re.compile(
    r"^(s[\s._-]?n[o°]?|sr[\s._-]?no|species|trait|parameter|cross|population|"
    r"germplasm|method|qtl|mta|mqtl|chromosome|chrom|position|interval|marker|"
    r"flanking|pve|r2|r²|lod|candidate|gene|reference|link|doi|url|associated|"
    r"study|year|author|environment|treatment)", re.I)


def nonempty(row):
    return [str(c).strip() for c in row if c is not None and str(c).strip()]


def header_like(row, header_tokens):
    """Is this body row actually a header rather than data?"""
    cells = nonempty(row)
    if len(cells) < 3:
        return False
    # an exact repeat of the sheet's own header
    if {c.lower() for c in cells} & header_tokens and \
            len({c.lower() for c in cells} & header_tokens) >= max(3, len(cells) // 2):
        return True
    # or header vocabulary in most cells, with no numeric values
    named = sum(1 for c in cells if HEADER_VOCAB.match(c))
    numeric = sum(1 for c in cells if re.fullmatch(r"[\d.,%-]+", c))
    return named >= 3 and named >= len(cells) * 0.5 and numeric == 0


def serial_restarts(body, col=0):
    """Indices where a serial-number column goes back to 1 (or below previous)."""
    out, prev = [], None
    for i, row in enumerate(body):
        if col >= len(row):
            continue
        v = str(row[col]).strip()
        try:
            n = int(float(v))
        except (ValueError, TypeError):
            continue
        if prev is not None and n == 1 and prev > 5:
            out.append(i)
        prev = n
    return out


def blank_gaps(body, min_run=2):
    """(start, end) of blank runs that have real data after them."""
    gaps, run = [], None
    for i, row in enumerate(body):
        blank = not nonempty(row)
        if blank and run is None:
            run = i
        elif not blank and run is not None:
            if i - run >= min_run:
                gaps.append((run, i))
            run = None
    return gaps


def same_schema(headers, top, bottom, kind, extract):
    """Do two blocks populate the same FIELDS?

    Compared on the records the converter actually extracts, not on the raw
    cell text. Comparing text shape does not work: a position column holds
    "43(37-52)" in one block and "90" in the other, and a PVE column holds
    "6.2" and "0.06" - different formats, identical meaning - so a shape test
    reports a schema change where there is none.

    What does indicate a real change is a field that one block fills and the
    other does not fill at all. If a column means something different below
    than above, the converter will have read it into a different field, and
    the fill rate for that field collapses.
    """
    FIELDS = ("species", "trait", "parameter", "cross", "population", "method",
              "qtl_name", "mqtl_name", "chromosome", "position_interval",
              "associated_markers", "pve", "candidate_gene", "doi")
    a, b = extract(headers, top, "t"), extract(headers, bottom, "b")
    if not a or not b:
        return True, []
    conflicts = []
    for f in FIELDS:
        if f not in a[0]:
            continue
        ra = sum(1 for r in a if str(r.get(f, "")).strip()) / len(a)
        rb = sum(1 for r in b if str(r.get(f, "")).strip()) / len(b)
        # One block fills the field for most of its rows and the other almost
        # never does. A newer batch simply recording more detail (empty above,
        # filled below) is normal curation and is not a schema change, so only
        # the loss direction counts - a field the sheet demonstrably carries
        # going missing is what breaks a column mapping.
        if ra > 0.5 and rb < 0.05:
            conflicts.append(f"{f}: {ra:.0%} above, {rb:.0%} below")
    return (not conflicts), conflicts


def classify_split(headers, body, kind, inner, restarts, gaps):
    """-> (verdict, detail) for one flagged sheet."""
    if inner:
        return ("SECOND TABLE", "a header row appears inside the body")
    split = restarts[0] if restarts else (gaps[0][1] if gaps else None)
    if split is None:
        return ("unclear", "")
    top, bottom = body[:split], body[split:]
    fn = {"qtl": C.extract_qtl, "metaqtl": C.extract_metaqtl,
          "epistatic": C.extract_epistatic}[kind]
    ok, conflicts = same_schema(headers, top, bottom, kind, fn)
    if not ok:
        return ("SECOND TABLE", f"a field the sheet carries goes missing - {conflicts[:2]}")
    t, b = fn(headers, top, "t"), fn(headers, bottom, "b")
    key = (lambda r: (r.get("qtl_name") or r.get("mqtl_name", ""), r.get("parameter", ""),
                      r.get("pve", ""), r.get("population", ""), r.get("doi", "")))
    kt = set(map(key, t))
    dup = sum(1 for r in b if key(r) in kt)
    refs_t = {r.get("doi") for r in t if r.get("doi")}
    refs_b = {r.get("doi") for r in b if r.get("doi")}
    shared = len(refs_t & refs_b)
    if dup > 0.5 * len(b):
        return ("REDUNDANT BLOCK", f"{dup}/{len(b)} lower rows repeat the upper block")
    return ("appended batch - keep both",
            f"{len(b)} new records, {len(refs_b) - shared}/{len(refs_b)} new references, "
            f"{dup} duplicate row(s)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    findings, clean = [], 0
    for fpath in C.collect_files():
        fname = os.path.basename(fpath)
        fskip = C.FILE_SHEET_SKIP.get(fname, set())
        for shname, headers, body in C.load_sheets(fpath):
            low = shname.lower().strip()
            if low in C.skip_sheets or low in fskip or not body:
                continue
            kind = C.sheet_type(shname, fname)
            if kind == "skip":
                kind = C.file_type_from_name(fname)
            if kind == "skip":
                continue

            htok = {str(h).strip().lower() for h in headers if str(h).strip()}
            inner = [i for i, r in enumerate(body) if header_like(r, htok)]
            restarts = serial_restarts(body)
            gaps = [(a, b) for a, b in blank_gaps(body)
                    if any(nonempty(r) for r in body[b:])]

            if inner or restarts or gaps:
                verdict, detail = classify_split(headers, body, kind,
                                                 inner, restarts, gaps)
                findings.append((fname, shname, kind, len(body), inner,
                                 restarts, gaps, verdict, detail))
            else:
                clean += 1

    print(f"{'file':38s} {'sheet':18s} {'rows':>6s}  split at  verdict")
    print("=" * 120)
    for fname, shname, kind, n, inner, restarts, gaps, verdict, detail in findings:
        where = (f"row {inner[0]}" if inner else
                 f"row {restarts[0]}" if restarts else f"row {gaps[0][1]}")
        print(f"{fname[:38]:38s} {shname[:18]:18s} {n:6d}  {where:9s} {verdict}")
        if detail:
            print(f"{'':38s} {'':18s} {'':6s}            {detail}")

    needs = [f for f in findings if f[7] in ("SECOND TABLE", "REDUNDANT BLOCK", "unclear")]
    print(f"\n{len(findings)} sheet(s) have a split; {clean} are a single continuous table.")
    print(f"  {len(findings) - len(needs)} are an appended batch sharing the schema - both "
          f"blocks are real data and are kept.")
    print(f"  {len(needs)} need a decision recorded in convert_datasets.py.")
    if needs:
        print("\nFor each of those, decide which table is the real one and record it in\n"
              "convert_datasets.py (FILE_SHEET_SKIP, a header override, or a row limit)\n"
              "rather than leaving the converter to guess:")
        for f in needs:
            print(f"  - {f[0]} / {f[1]}: {f[8]}")


if __name__ == "__main__":
    main()
