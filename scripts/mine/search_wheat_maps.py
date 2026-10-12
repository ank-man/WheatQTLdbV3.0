"""Find wheat papers that publish a genetic/linkage map.

GrainGenes holds 4,756 maps but its report.cgi sits behind Cloudflare bot
protection, so the map detail pages cannot be fetched programmatically and are
deliberately not scraped here. The open route is the literature itself: marker
order tables are published as supplementary spreadsheets, which Europe PMC
serves under an open-access licence.
"""
import csv, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from epmc import OUT, search, hit_count

MAP_TERMS = ['"linkage map"','"genetic map"','"consensus map"','"genetic linkage map"',
             '"high-density map"','"marker order"','"composite map"','"integrated map"']
WHEAT = ['"Triticum aestivum"','"bread wheat"','"durum wheat"','"Triticum turgidum"',
         '"hexaploid wheat"','"common wheat"','wheat']

def main():
    q = (f'({" OR ".join(MAP_TERMS)}) AND ({" OR ".join(WHEAT)}) '
         f'AND (OPEN_ACCESS:Y) AND (IN_EPMC:Y)')
    print("hits:", hit_count(q))
    rows, seen = [], set()
    for r in search(q, max_results=1200):
        pid = r.get("pmcid")
        if not pid or pid in seen or r.get("inEPMC") != "Y":
            continue
        seen.add(pid)
        rows.append({"pmcid": pid, "doi": r.get("doi",""), "year": r.get("pubYear",""),
                     "title": (r.get("title") or "")[:200],
                     "has_suppl": r.get("hasSuppl",""),
                     "journal": (r.get("journalInfo",{}).get("journal",{}) or {}).get("title","")})
    path = os.path.join(OUT, "wheat_map_papers.csv")
    with open(path,"w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(f"papers: {len(rows)}  with supplements: {sum(1 for r in rows if r['has_suppl']=='Y')}")
    print("wrote ->", path)

if __name__ == "__main__":
    main()
