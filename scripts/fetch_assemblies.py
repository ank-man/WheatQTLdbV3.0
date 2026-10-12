#!/usr/bin/env python3
"""Build src/lib/assemblies.ts - the wheat reference assemblies registry.

QTL coordinates in the literature are reported against whichever assembly was
current, and those assemblies differ materially: RefSeq v2.1 is 159 Mb longer
than v1.0 overall, chromosome 6D by 4.6% and 3B by 21 Mb. A position is
therefore meaningless without the assembly it refers to, and comparing two
positions from different assemblies is an error the app should be able to warn
about.

Chromosome lengths come from each assembly's NCBI sequence report.
Usage: python3 scripts/fetch_assemblies.py
"""
import json, os, urllib.request

BASE = "https://api.ncbi.nlm.nih.gov/datasets/v2alpha/genome"
UA = "WheatQTLdb/3.0 (academic; mr.ank2999@gmail.com)"

# The assemblies QTL in this literature are actually reported against, plus the
# main 10+ Wheat Genomes cultivars that newer studies use.
ASSEMBLIES = [
    ("GCA_900519105.1", "IWGSC RefSeq v1.0", "Chinese Spring", 2018, True),
    ("GCA_018294505.1", "IWGSC RefSeq v2.1", "Chinese Spring", 2021, True),
    ("GCA_910594105.1", "Kariega v1",        "Kariega",        2021, False),
    ("GCA_937894285.1", "Renan v2.1",        "Renan",          2022, False),
    ("GCA_949126075.2", "Paragon v1",        "Paragon",        2025, False),
]

def chroms(acc):
    url = f"{BASE}/accession/{acc}/sequence_reports?page_size=1000"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    out = {}
    for s in d.get("reports", []):
        if s.get("role") == "assembled-molecule" and \
           s.get("assigned_molecule_location_type") == "Chromosome":
            name = s.get("chr_name")
            if name and name.upper() != "UN":
                out[name] = s.get("length")
    return out

def main():
    recs = []
    for acc, name, cultivar, year, primary in ASSEMBLIES:
        print("fetching", name, flush=True)
        try:
            c = chroms(acc)
        except Exception as e:
            print(f"  ! {type(e).__name__}: skipped")
            continue
        if c:
            recs.append((acc, name, cultivar, year, primary, c))

    out = ['''// GENERATED - regenerate with `python3 scripts/fetch_assemblies.py`.
//
// Wheat QTL are reported against whichever reference assembly was current when
// the study ran, and those assemblies are NOT interchangeable: RefSeq v2.1 is
// 159 Mb longer than v1.0 overall, chromosome 6D differs by 4.6% and 3B by
// 21 Mb. A base-pair position is therefore only meaningful together with its
// assembly, and comparing positions across assemblies without conversion is an
// error - which `sameAssembly()` below exists to catch.

export interface Assembly {
  accession: string
  name: string
  cultivar: string
  year: number
  /** Chinese Spring reference assemblies most QTL are reported against. */
  primary: boolean
  lengths: Record<string, number>
}

export const ASSEMBLIES: Record<string, Assembly> = {''']
    for acc, name, cultivar, year, primary, c in recs:
        out.append(f"  '{name}': {{")
        out.append(f"    accession: '{acc}',")
        out.append(f"    name: '{name}',")
        out.append(f"    cultivar: '{cultivar}',")
        out.append(f"    year: {year},")
        out.append(f"    primary: {'true' if primary else 'false'},")
        out.append("    lengths: {")
        for k in sorted(c, key=lambda x: (x[0], x[1:])):
            out.append(f"      '{k}': {c[k]},")
        out.append("    },")
        out.append("  },")
    out.append("}")
    out.append('''
/** The assembly assumed when a record does not state one. Most of the curated
 *  corpus predates v2.1, so v1.0 is the safer default - but it IS an
 *  assumption, surfaced in the UI rather than hidden. */
export const DEFAULT_ASSEMBLY = 'IWGSC RefSeq v1.0'

export function assemblyFor(name?: string | null): Assembly | null {
  if (!name) return ASSEMBLIES[DEFAULT_ASSEMBLY] ?? null
  return ASSEMBLIES[name] ?? null
}

/** How much two assemblies differ on one chromosome, as a fraction. Used to
 *  tell a user how wrong an uncorrected cross-assembly comparison would be. */
export function lengthDelta(a: string, b: string, chromosome: string): number | null {
  const A = ASSEMBLIES[a]?.lengths[chromosome]
  const B = ASSEMBLIES[b]?.lengths[chromosome]
  if (!A || !B) return null
  return (B - A) / A
}

export function sameAssembly(a?: string | null, b?: string | null): boolean {
  return (a || DEFAULT_ASSEMBLY) === (b || DEFAULT_ASSEMBLY)
}
''')
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "src", "lib", "assemblies.ts")
    open(path, "w").write("\n".join(out) + "\n")
    print(f"\nwrote {len(recs)} assemblies -> {path}")

if __name__ == "__main__":
    main()
