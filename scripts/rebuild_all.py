#!/usr/bin/env python3
"""
Rebuild every file in public/data, in the one order that is correct.

The order is not cosmetic. convert_datasets.py REWRITES qtl.csv from the
spreadsheets, which discards the reference text that backfill_references() had
written into it - so running the converter on its own silently drops 62,602
citations and leaves the site showing 2.4% reference coverage instead of 71%.
That has now happened once; this script exists so it cannot happen again.

  1. convert_datasets.py        Final_data -> qtl / metaqtl / epistatic
  2. build_publications.py      those tables -> publications.csv (Crossref)
  3. backfill_references()      publications.csv -> back into the tables
  4. build_candidate_genes.py   the tables -> candidate_genes.csv
  5. build_linkage_maps.py      mined maps + GrainGenes -> maps / map_loci
  6. validate_data.py           check the result, and fail loudly if wrong

Steps 2-5 all read what step 1 wrote, so any of them run alone against stale
tables will produce a file that disagrees with the rest.

Not included, because they fetch from the network and take much longer: the
Europe PMC mining under scripts/mine/ and fetch_assemblies.py. Run those
separately when you want new literature; this script rebuilds the site data
from what is already on disk.

Usage: python3 scripts/rebuild_all.py [--skip-crossref]
"""

import argparse
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable


def run(label, args):
    print(f"\n{'=' * 70}\n{label}\n{'=' * 70}", flush=True)
    r = subprocess.run([PY] + args, cwd=ROOT)
    if r.returncode != 0:
        sys.exit(f"\n{label} failed (exit {r.returncode}) - stopping, because every "
                 f"later step reads what this one writes.")


def main():
    ap = argparse.ArgumentParser()
    # Deliberately "keep the existing publications.csv" rather than "build it
    # without enrichment": build_publications.py --no-enrich writes a
    # publications.csv with no titles, and the backfill then has nothing to
    # copy, which quietly zeroes reference coverage instead of preserving it.
    # Crossref lookups are cached on disk anyway, so the normal path is fast.
    ap.add_argument("--skip-crossref", action="store_true",
                    help="keep the existing publications.csv instead of rebuilding it")
    args = ap.parse_args()

    run("1/6  Final_data -> record tables", ["convert_datasets.py"])
    if args.skip_crossref:
        print("\n2/6  skipped: keeping the existing publications.csv")
    else:
        run("2/6  record tables -> publications.csv", ["scripts/build_publications.py"])
    run("3/6  publications.csv -> references in the record tables",
        ["-c", "import sys; sys.path.insert(0, 'scripts');"
               " from build_publications import backfill_references; backfill_references()"])
    run("4/6  record tables -> candidate_genes.csv", ["scripts/build_candidate_genes.py"])
    run("5/6  mined maps + GrainGenes -> maps.csv, map_loci.csv",
        ["scripts/build_linkage_maps.py"])
    run("6/6  validate what was written", ["scripts/validate_data.py"])

    print(f"\n{'=' * 70}\nAll of public/data rebuilt and validated.\n"
          f"For the source-row ledger: python3 scripts/reconcile_final_data.py\n{'=' * 70}")


if __name__ == "__main__":
    main()
