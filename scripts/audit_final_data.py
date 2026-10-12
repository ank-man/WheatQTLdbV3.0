#!/usr/bin/env python3
"""
Deep audit of Final_data before anything is ingested from it.

Purpose: find the structural problems that make downstream counts wrong -
empty or unnamed columns, duplicated headers, header rows that are not row 0,
sheets that are notes rather than data, columns whose contents do not match
their name, and rows that carry no locus at all.

Reports only; changes nothing.

Usage: python3 scripts/audit_final_data.py [--verbose]
"""

import argparse
import csv
import os
import re
import sys
from collections import Counter

import openpyxl
import xlrd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Final_data")
csv.field_size_limit(10_000_000)


def sheets_of(path):
    """-> [(sheet_name, [rows])] for xls/xlsx/csv alike."""
    low = path.lower()
    if low.endswith((".xlsx", ".xlsm")):
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        for ws in wb.worksheets:
            rows = [["" if c is None else str(c).strip() for c in r]
                    for r in ws.iter_rows(values_only=True)]
            yield ws.title, rows
        wb.close()
    elif low.endswith(".xls"):
        book = xlrd.open_workbook(path)
        for sh in book.sheets():
            rows = [[str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
                    for r in range(sh.nrows)]
            yield sh.name, rows
    elif low.endswith(".csv"):
        with open(path, encoding="utf-8", errors="replace") as f:
            yield "(csv)", [r for r in csv.reader(f)]


def find_header(rows, scan=8):
    """Header row = first row with >3 non-empty cells (the converter's rule)."""
    for i, r in enumerate(rows[:scan]):
        if sum(1 for c in r if str(c).strip()) > 3:
            return i
    return 0


HEADER_LIKE = re.compile(
    r"species|trait|parameter|cross|population|germplasm|method|qtl|mta|chrom|"
    r"position|interval|marker|pve|r2|candidate|gene|reference|link|doi|lod|"
    r"s_?no|associated", re.I)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    files = []
    for dirpath, _, names in os.walk(SRC):
        for n in sorted(names):
            if n.lower().endswith((".xls", ".xlsx", ".xlsm", ".csv")) and not n.startswith("~"):
                files.append(os.path.join(dirpath, n))

    print(f"auditing {len(files)} files under Final_data\n")
    issues = Counter()
    per_file = []

    for path in sorted(files):
        rel = os.path.relpath(path, SRC)
        try:
            sheets = list(sheets_of(path))
        except Exception as e:
            print(f"!! {rel}: unreadable ({type(e).__name__})")
            issues["unreadable file"] += 1
            continue

        for sname, rows in sheets:
            if not rows:
                issues["empty sheet"] += 1
                continue
            hi = find_header(rows)
            header = rows[hi]
            body = rows[hi + 1:]
            ncol = len(header)

            # --- header hygiene -------------------------------------------
            blank_cols = [j for j, h in enumerate(header) if not str(h).strip()]
            dupes = [h for h, n in Counter(
                [str(h).strip().lower() for h in header if str(h).strip()]).items() if n > 1]
            unnamed_with_data = []
            for j in blank_cols:
                filled = sum(1 for r in body if j < len(r) and str(r[j]).strip())
                if filled > max(5, 0.05 * len(body)):
                    unnamed_with_data.append((j, filled))

            # trailing all-empty columns (Excel padding)
            trailing_empty = 0
            for j in range(ncol - 1, -1, -1):
                filled = sum(1 for r in body if j < len(r) and str(r[j]).strip())
                if filled == 0 and not str(header[j]).strip():
                    trailing_empty += 1
                else:
                    break

            # ragged rows: more cells than the header has columns
            ragged = sum(1 for r in body if len(r) > ncol)
            # rows that are entirely empty
            empties = sum(1 for r in body if not any(str(c).strip() for c in r))
            # does the header look like a header at all?
            looks_header = sum(1 for h in header if HEADER_LIKE.search(str(h)))

            flags = []
            if unnamed_with_data:
                flags.append(f"UNNAMED COLUMNS WITH DATA {unnamed_with_data}")
                issues["unnamed column holding data"] += 1
            if dupes:
                flags.append(f"duplicate headers {dupes}")
                issues["duplicate header names"] += 1
            if trailing_empty > 2:
                flags.append(f"{trailing_empty} trailing empty columns")
                issues["trailing empty columns"] += 1
            if ragged:
                flags.append(f"{ragged} rows wider than header")
                issues["rows wider than header"] += 1
            if empties:
                flags.append(f"{empties} blank rows")
                issues["blank rows"] += 1
            if hi != 0:
                flags.append(f"header on row {hi}")
                issues["header not on first row"] += 1
            if looks_header < 3:
                flags.append(f"header does not look like data columns ({looks_header} known names)")
                issues["sheet is probably not a data table"] += 1

            per_file.append((rel, sname, len(body), ncol, flags))

    print("=" * 100)
    print(f"{'file':52s} {'sheet':18s} {'rows':>6s} {'cols':>5s}  issues")
    print("=" * 100)
    for rel, sname, nrow, ncol, flags in per_file:
        if flags or args.verbose:
            print(f"{rel[:52]:52s} {sname[:18]:18s} {nrow:6d} {ncol:5d}  "
                  f"{'; '.join(flags)[:120] if flags else 'ok'}")

    print("\n" + "=" * 60)
    print("ISSUE SUMMARY")
    print("=" * 60)
    for k, n in issues.most_common():
        print(f"  {n:4d}  {k}")
    if not issues:
        print("  none")


if __name__ == "__main__":
    main()
