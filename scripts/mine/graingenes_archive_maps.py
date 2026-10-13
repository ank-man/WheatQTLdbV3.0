#!/usr/bin/env python3
"""
Import the classic wheat linkage maps that GrainGenes serves as plain files.

GrainGenes' map database (report.cgi, CMap) answers automated requests with a
browser challenge, and this project does not work around that. Its archive
directory https://graingenes.org/ggpages/maps/Triticum/ is different: an
ordinary open file listing of the original 1990s map files, each a text table
of chromosome, locus and cM position with its reference. Those are read here.

Only the "... map" files are taken (the "... mapping data" files are raw
segregation scores, not positions). A file is kept when it yields at least ten
positioned loci on recognisable wheat chromosomes.

Writes out/graingenes_archive_maps.csv, which build_linkage_maps.py turns into
viewable maps.

Usage: python3 scripts/mine/graingenes_archive_maps.py
"""

import csv
import html
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import OUT, fetch  # noqa: E402  (disk-cached, rate-limited GET)

BASE = "https://graingenes.org/ggpages/maps/Triticum/"

# A locus line: chromosome (optionally with the "m" of T. monococcum, or an
# arm), locus name, numeric position. Lines with "-" for the position are loci
# placed only to an interval and carry no position to plot.
LOCUS = re.compile(r"^\s*([1-7])([ABD])(?:m|\^m\^)?[SL]?\s+(\S+)\s+(-?\d+(?:\.\d+)?)(?=\s|$)")
SPECIES = [
    (re.compile(r"tauschii", re.I), "Aegilops tauschii"),
    (re.compile(r"monococcum", re.I), "Triticum monococcum"),
    (re.compile(r"durum|dicoccoides", re.I), "Triticum turgidum"),
]


def text_of(page):
    t = re.sub(r"<br\s*/?>", "\n", page, flags=re.I)
    return html.unescape(re.sub(r"<[^>]+>", "", t))


def main():
    index = fetch(BASE, "html")
    if not index:
        sys.exit(f"could not read {BASE}")
    names = sorted({urllib.parse.unquote(h) for h in re.findall(r'href="([^"?/][^"]*\.html)"', index)})
    names = [n for n in names if re.search(r"\bmap\.html$", n)]
    rows, kept = [], 0
    for name in names:
        url = BASE + urllib.parse.quote(name)
        page = fetch(url, "html")
        if not page:
            continue
        text = text_of(page)
        lines = text.splitlines()
        title = next((l.strip() for l in lines[1:6] if l.strip()), name[:-5])
        year = ""
        # the first reference's year, e.g. "... 1998.  A microsatellite map"
        m = re.search(r"\b(19[89]\d|200\d)\b\.", text)
        if m:
            year = m.group(1)
        ref = ""
        m = re.search(r"References?:\s*(.+?)(?:\n\s*\n|\n\s*[=*-]{5,})", text, re.S)
        if m:
            ref = re.sub(r"\s+", " ", m.group(1)).strip()[:400]
        loci = []
        for line in lines:
            m = LOCUS.match(line)
            if m:
                loci.append((m.group(1) + m.group(2), m.group(3).rstrip("*"), float(m.group(4))))
        if len(loci) < 10:
            print(f"  skipped ({len(loci)} positioned loci): {name}")
            continue
        species = next((s for rx, s in SPECIES if rx.search(name)), "Triticum aestivum")
        map_name = name[:-5]
        for lg, marker, cm in loci:
            rows.append({"map_name": map_name, "title": title, "species": species, "year": year,
                         "reference": ref, "url": url, "linkage_group": lg, "marker": marker, "cm": cm})
        kept += 1
        print(f"  {len(loci):>5} loci  {map_name}")

    path = os.path.join(OUT, "graingenes_archive_maps.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["map_name", "title", "species", "year", "reference",
                                          "url", "linkage_group", "marker", "cm"])
        w.writeheader()
        w.writerows(rows)
    print(f"maps: {kept}   loci: {len(rows)}\nwrote -> {path}")


if __name__ == "__main__":
    main()
