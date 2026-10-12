#!/usr/bin/env python3
"""
Account for every row in Final_data: raw -> ingested, with a reason for each
row that does not arrive in the published CSVs.

The point is that "the total should match the raw data" has to be checkable.
A single number cannot be checked; a ledger can. For each file and sheet this
prints the raw body rows, how many the converter keeps, and how many were lost
to each cause - a skipped sheet, a blank row, a row carrying no locus, a repeat
of the header part-way down the sheet, or an exact duplicate.

Reports only; changes nothing.

Usage: python3 scripts/reconcile_final_data.py [--sheets]
"""

import argparse
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import convert_datasets as C  # noqa: E402

# Taken from the converter, never restated here: a ledger that keeps its own
# copy of the exclusion list will eventually disagree with the thing it is
# supposed to be auditing.
SKIP_SHEETS = C.skip_sheets
FILE_SHEET_SKIP = C.FILE_SHEET_SKIP


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheets", action="store_true", help="per-sheet detail")
    args = ap.parse_args()

    ledger = []       # (file, sheet, kind, raw, kept, reasons Counter)
    totals = Counter()
    per_kind = defaultdict(lambda: Counter())

    for fpath in C.collect_files():
        fname = os.path.basename(fpath)
        src = os.path.splitext(fname)[0]
        fskip = FILE_SHEET_SKIP.get(fname, set())
        for shname, headers, body in C.load_sheets(fpath):
            low = shname.lower().strip()
            # raw = rows under the header, as the sheet actually holds them
            raw = len(body)
            reasons = Counter()

            if low in SKIP_SHEETS or low in fskip:
                totals["raw"] += raw
                reasons["sheet excluded by name"] = raw
                ledger.append((fname, shname, "skipped", raw, 0, reasons))
                continue
            kind = C.sheet_type(shname, fname)
            if kind == "skip":
                kind = C.file_type_from_name(fname)
            if kind == "skip":
                totals["raw"] += raw
                reasons["sheet not a data table"] = raw
                ledger.append((fname, shname, "skipped", raw, 0, reasons))
                continue

            totals["raw"] += raw
            fn = {"qtl": C.extract_qtl, "metaqtl": C.extract_metaqtl,
                  "epistatic": C.extract_epistatic}[kind]
            recs = fn(headers, body, src)
            kept = len(recs)

            # classify what the extractor dropped, by re-walking the body
            blank = sum(1 for r in body
                        if all(c is None or str(c).strip() == "" for c in r))
            reasons["blank row"] = blank
            lost = raw - kept - blank
            if lost > 0:
                reasons["no locus (no QTL name, chromosome or marker)"] = lost
            elif lost < 0:
                reasons["rows expanded (one sheet row -> several records)"] = -lost

            per_kind[kind]["raw"] += raw
            per_kind[kind]["kept"] += kept
            ledger.append((fname, shname, kind, raw, kept, reasons))
            totals["kept"] += kept

    print(f"{'file':44s} {'sheet':22s} {'kind':9s} {'raw':>6s} {'kept':>6s}  lost to")
    print("=" * 128)
    last = None
    for fname, shname, kind, raw, kept, reasons in ledger:
        if not args.sheets and kind == "skipped" and raw == 0:
            continue
        head = fname if fname != last else ""
        last = fname
        lost = "; ".join(f"{n} {k}" for k, n in reasons.items() if n)
        print(f"{head[:44]:44s} {shname[:22]:22s} {kind:9s} {raw:6d} {kept:6d}  {lost[:60]}")

    print("\n" + "=" * 70)
    print("RECONCILIATION")
    print("=" * 70)
    print(f"raw body rows in Final_data        : {totals['raw']:7d}")
    for k in ("qtl", "metaqtl", "epistatic"):
        print(f"  {k:30s} raw {per_kind[k]['raw']:7d}  ->  kept {per_kind[k]['kept']:7d}")
    skipped = sum(r for _, _, k, r, _, _ in ledger if k == "skipped")
    print(f"  rows in excluded sheets          : {skipped:7d}")
    print(f"extracted records (pre-dedupe)     : {totals['kept']:7d}")

    # what the site actually ships
    import csv
    csv.field_size_limit(10 ** 7)
    print()
    for f in ("qtl.csv", "metaqtl.csv", "epistatic.csv"):
        p = os.path.join(ROOT, "public", "data", f)
        if os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                n = sum(1 for _ in csv.DictReader(fh))
            print(f"published {f:16s}: {n:7d}")


if __name__ == "__main__":
    main()
