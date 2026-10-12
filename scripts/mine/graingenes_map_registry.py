#!/usr/bin/env python3
"""
Harvest the GrainGenes map catalogue (https://graingenes.org/GG3/node/876).

GrainGenes is the curatorial home of Triticeae maps and lists 428 of them with
the metadata that matters for choosing one: both parents, the number of mapped
markers, the marker technology, the year, and which chromosomes it covers.

What this does NOT do is download the marker-level data. Every data endpoint on
graingenes.org - report.cgi, browse.cgi and the whole CMap installation under
/cgi-bin/ - sits behind a Cloudflare challenge and returns 403 to a program.
That is the site telling automated clients not to pull its data, and this script
respects it: it reads the one page GrainGenes serves openly, and records the
link so a reader reaches the full map record in a browser, where the challenge
resolves normally. Marker positions in this database come from the open-access
literature instead (see extract_wheat_maps.py).

Writes out/graingenes_maps.csv

Usage: python3 scripts/mine/graingenes_map_registry.py
"""

import csv
import html
import os
import re
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

INDEX = "https://graingenes.org/GG3/node/876"
UA = "WheatQTLdb/3.0 (https://wheatqtldbv3.org; mailto:mr.ank2999@gmail.com)"
BASE = "https://graingenes.org/cgi-bin/GG3/report.cgi?class=mapdata;name="

# Species is read from the map name, which GrainGenes writes as a prefix
# ("Wheat-2019-...", "Barley, AxK", "Ae. umbellulata, A x C") or, for the older
# single-chromosome maps, as a parent abbreviation ("1AS, T.m. G1777 x G2528").
# \b does not fire between "Wheat" and "_", so GrainGenes' underscore-style
# names (Wheat_2014_90KSNP, Wheat_AB, Wheat_Consensus_2014_Ug99_Rust) have to
# be matched explicitly - without this, 38 wheat maps were filed as unknown
# species and dropped.
_SEP = r"(?=$|[^a-z])"
SPECIES = [
    # Tetraploid durum first: "Wheat_AB" means the A and B genomes, i.e. durum,
    # and would otherwise be caught by the bread-wheat rule below.
    ("Triticum turgidum",   re.compile(r"\bdurum\b|wheat[_\s-]?AB\b|T\.?\s?turgidum|"
                                       r"dicoccoides|\bemmer\b|\bLangdon|\bSvevo\b|\bKofa\b", re.I)),
    ("Triticum aestivum",   re.compile(r"^wheat" + _SEP + r"|\bbread wheat\b|"
                                       r"^(ITMI|NAM)" + _SEP + r"|^Triticeae|^Triticum" + _SEP + r"|"
                                       r"^T1[BA]L[.-]1RS", re.I)),
    ("Triticum monococcum", re.compile(r"T\.m\.|monococcum|einkorn", re.I)),
    ("Aegilops tauschii",   re.compile(r"tauschii", re.I)),
    ("Aegilops spp.",       re.compile(r"^Ae\.|Aegilops|umbellulata|longissima|speltoides", re.I)),
    ("Hordeum vulgare",     re.compile(r"^barley\b|^barley[-,]|\bHv\b", re.I)),
    ("Avena sativa",        re.compile(r"^oat\b|^avena", re.I)),
    ("Secale cereale",      re.compile(r"^rye\b|secale", re.I)),
    ("Triticale",           re.compile(r"triticale", re.I)),
]
# A map named only by a wheat chromosome ("5AL, CS x CS-TDIC DS5A") is a wheat
# map: 1A-7D is the hexaploid/tetraploid nomenclature. Barley (H) and rye (R)
# groups are excluded by requiring A, B or D.
WHEAT_CHR = re.compile(r"^[1-7][ABD][LS]?\b")
IS_WHEAT = ("Triticum aestivum", "Triticum turgidum", "Triticum monococcum",
            "Aegilops tauschii", "Aegilops spp.")


def species_of(name: str) -> str:
    if WHEAT_CHR.match(name.strip()):
        return "Triticum aestivum"
    for label, rx in SPECIES:
        if rx.search(name):
            return label
    return ""


def strip_tags(s: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split())


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8", "replace")


def main():
    page = fetch(INDEX)
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S)
    out, skipped = [], 0
    for tr in rows:
        cells_raw = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)
        cells = [strip_tags(c) for c in cells_raw]
        if len(cells) < 8 or cells[1].lower() == "map name":
            continue
        _, name, date, p1, p2, markers, mtype, lgs = cells[:8]
        if not name:
            continue
        sp = species_of(name)
        if sp not in IS_WHEAT:
            skipped += 1
            continue
        # the record link as GrainGenes writes it, so a reader lands on the map
        href = re.search(r'href="([^"]*report\.cgi[^"]*)"', cells_raw[0])
        url = (BASE + urllib.parse.quote(name)) if not href else \
            "https://graingenes.org" + re.sub(r"^/+", "/", href.group(1)).replace("///", "/")
        out.append({
            "map_name": name, "species": sp, "year": date,
            "parent1": p1, "parent2": p2,
            "n_markers": re.sub(r"[^\d]", "", markers) or "",
            "map_type": mtype, "linkage_groups": lgs,
            "url": url,
        })

    path = os.path.join(OUT, "graingenes_maps.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)

    from collections import Counter
    print(f"catalogue rows parsed : {len(rows)}")
    print(f"wheat / wheat-relative: {len(out)}")
    print(f"other species skipped : {skipped}")
    print("by species:")
    for s, n in Counter(r["species"] for r in out).most_common():
        print(f"  {n:4d}  {s}")
    tot = sum(int(r["n_markers"]) for r in out if r["n_markers"])
    print(f"markers across catalogue: {tot}")
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()
