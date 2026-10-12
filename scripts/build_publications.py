#!/usr/bin/env python3
"""
Build public/data/publications.csv - the source literature behind every record.

The curated tables already carry a reference link per row, but those links are
pasted from publisher pages and arrive in every shape imaginable:

    10.1111/nph.19942?af=R                      (tracking parameter)
    10.3389/fpls.2021.735192/full               (page suffix)
    10.3389/fpls.2023.1166439/full#h12          (anchor)
    https://www.mdpi.com/2223-7747/11/16/2173/  (no DOI at all)

so the same paper appears under several spellings and cannot be counted. This
normalises them to a bare DOI, then enriches each with real bibliographic
metadata from Crossref (title, authors, journal, year, type) so the site can
show a proper publication list rather than a column of URLs.

Crossref's API is public and free; it asks only that automated users identify
themselves, which the User-Agent below does ("polite pool").

Usage:  python3 scripts/build_publications.py [--limit N] [--no-enrich]
"""

import argparse
import csv
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "public", "data")
CACHE = os.path.join(HERE, ".crossref_cache")
os.makedirs(CACHE, exist_ok=True)
csv.field_size_limit(10_000_000)

MAILTO = "mr.ank2999@gmail.com"
UA = f"WheatQTLdb/3.0 (https://wheatqtldbv3.org; mailto:{MAILTO})"

# Crossref asks for considerate use rather than a hard limit; this stays well
# inside the polite pool.
REQS_PER_SEC = 8.0
WORKERS = 6
_lock = threading.Lock()
_next = [0.0]


def throttle():
    with _lock:
        now = time.time()
        slot = max(now, _next[0])
        _next[0] = slot + 1.0 / REQS_PER_SEC
    d = slot - time.time()
    if d > 0:
        time.sleep(d)


# A DOI is 10.<registrant>/<suffix>; the suffix legitimately contains most
# punctuation, so trailing junk is stripped by rule rather than by regex greed.
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"'<>]+", re.I)
TRAILING_PATHS = re.compile(
    r"/(full|abstract|pdf|html|epdf|meta|citation|references|figures)(/.*)?$", re.I)


def normalise_doi(raw: str) -> str:
    """-> bare lowercase DOI, or '' when the link carries none."""
    if not raw:
        return ""
    m = DOI_RE.search(raw)
    if not m:
        return ""
    doi = m.group(0)
    doi = doi.split("#")[0].split("?")[0]          # anchors, query strings
    doi = TRAILING_PATHS.sub("", doi)              # /full, /abstract, ...
    doi = doi.rstrip(".,;)]}/'\"")
    return doi.lower()


def source_label(raw: str) -> str:
    """For links with no DOI, keep the publisher host so the row is still usable."""
    if not raw:
        return ""
    m = re.search(r"https?://(?:www\.)?([^/]+)", raw)
    return m.group(1) if m else raw[:60]


def collect():
    """doi -> {'records': n, 'tables': set, 'raw': example, 'species': Counter}"""
    agg = defaultdict(lambda: {"records": 0, "tables": set(), "raw": "",
                               "species": Counter(), "traits": Counter(),
                               "no_doi_source": ""})
    files = [("qtl.csv", "QTL"), ("metaqtl.csv", "MetaQTL"),
             ("epistatic.csv", "Epistatic"), ("candidate_genes.csv", "Candidate gene")]
    for fname, label in files:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                raw = (r.get("doi") or "").strip()
                doi = normalise_doi(raw)
                key = doi or f"nodoi:{source_label(raw)}" if raw else ""
                if not key:
                    continue
                a = agg[key]
                a["records"] += 1
                a["tables"].add(label)
                if not a["raw"]:
                    a["raw"] = raw
                if not doi:
                    a["no_doi_source"] = source_label(raw)
                sp = (r.get("species") or "").strip()
                if sp:
                    a["species"][sp] += 1
                tr = (r.get("trait") or "").strip()
                if tr:
                    a["traits"][tr[:60]] += 1
    return agg


def fetch_crossref(doi: str):
    path = os.path.join(CACHE, re.sub(r"[^a-z0-9]", "_", doi)[:120] + ".json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    throttle()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi)}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r).get("message", {})
    except urllib.error.HTTPError as e:
        data = {"_error": e.code}
    except Exception as e:
        data = {"_error": type(e).__name__}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


def meta_from(msg):
    if not msg or msg.get("_error"):
        return {}
    title = (msg.get("title") or [""])[0]
    authors = []
    for a in (msg.get("author") or [])[:12]:
        fam = a.get("family") or ""
        given = (a.get("given") or "").strip()
        initials = "".join(p[0] for p in re.split(r"[\s.-]+", given) if p)
        authors.append(f"{fam} {initials}".strip())
    date = (msg.get("issued", {}).get("date-parts") or [[None]])[0]
    return {
        "title": re.sub(r"\s+", " ", title).strip(),
        "authors": "; ".join(authors),
        "journal": (msg.get("container-title") or [""])[0],
        "year": str(date[0]) if date and date[0] else "",
        "type": msg.get("type", ""),
        "publisher": msg.get("publisher", ""),
        "is_oa": "yes" if msg.get("is-referenced-by-count") is not None and
                 any(l.get("content-version") == "vor" and l.get("URL")
                     for l in (msg.get("link") or [])) else "",
        "citations": str(msg.get("is-referenced-by-count", "")),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--no-enrich", action="store_true")
    args = ap.parse_args()

    agg = collect()
    dois = [k for k in agg if not k.startswith("nodoi:")]
    nodoi = [k for k in agg if k.startswith("nodoi:")]
    print(f"distinct references : {len(agg)}")
    print(f"  with a parseable DOI : {len(dois)}")
    print(f"  link only, no DOI    : {len(nodoi)}")

    meta = {}
    if not args.no_enrich:
        targets = dois[: args.limit] if args.limit else dois
        print(f"\nenriching {len(targets)} DOIs from Crossref (cached)...")
        done = [0]

        def one(d):
            m = meta_from(fetch_crossref(d))
            done[0] += 1
            if done[0] % 100 == 0:
                print(f"    {done[0]}/{len(targets)}", flush=True)
            return d, m

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for d, m in pool.map(one, targets):
                meta[d] = m
        found = sum(1 for m in meta.values() if m.get("title"))
        print(f"  resolved with metadata: {found}/{len(targets)}")

    cols = ["id", "doi", "title", "authors", "journal", "year", "type", "publisher",
            "citations", "records", "record_types", "species", "top_trait", "url"]
    rows = []
    for key, a in sorted(agg.items(), key=lambda kv: -kv[1]["records"]):
        is_doi = not key.startswith("nodoi:")
        m = meta.get(key, {}) if is_doi else {}
        rows.append({
            "id": f"P{len(rows)+1:05d}",
            "doi": key if is_doi else "",
            "title": m.get("title", "") or (f"[{a['no_doi_source']}]" if not is_doi else ""),
            "authors": m.get("authors", ""),
            "journal": m.get("journal", "") or (a["no_doi_source"] if not is_doi else ""),
            "year": m.get("year", ""),
            "type": m.get("type", ""),
            "publisher": m.get("publisher", ""),
            "citations": m.get("citations", ""),
            "records": a["records"],
            "record_types": "; ".join(sorted(a["tables"])),
            "species": "; ".join(f"{s} ({n})" for s, n in a["species"].most_common(3)),
            "top_trait": a["traits"].most_common(1)[0][0] if a["traits"] else "",
            "url": f"https://doi.org/{key}" if is_doi else a["raw"],
        })

    path = os.path.join(DATA, "publications.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    resolved = sum(1 for r in rows if r["title"] and not r["title"].startswith("["))
    print(f"\npublications written : {len(rows)}  ({resolved} with full metadata)")
    yrs = Counter(r["year"] for r in rows if r["year"])
    if yrs:
        span = sorted(yrs)
        print(f"year range           : {span[0]}-{span[-1]}")
    print(f"records attributed   : {sum(r['records'] for r in rows)}")
    print(f"wrote -> {path}")


if __name__ == "__main__":
    main()


def backfill_references(limit_cols=("qtl.csv", "metaqtl.csv", "epistatic.csv")):
    """Write resolved citations back into the record tables.

    The source spreadsheets record a reference for only ~2.7% of rows - most
    carry a link and nothing else, and in some files the citation column was
    dropped when the fuller sheet replaced an older one. Since publications.csv
    already resolves each DOI to real bibliographic metadata, that text can be
    filled in wherever a record has a DOI, which covers 97% of rows instead.

    The record's own reference text is never overwritten: a curator-entered
    citation stays as the authority.
    """
    pub_path = os.path.join(DATA, "publications.csv")
    if not os.path.exists(pub_path):
        print("publications.csv missing - run the main build first")
        return
    cite = {}
    with open(pub_path, encoding="utf-8") as f:
        for p in csv.DictReader(f):
            if not p["doi"] or not p["title"]:
                continue
            authors = p["authors"].split("; ")
            lead = authors[0] if authors and authors[0] else ""
            etal = " et al." if len(authors) > 1 else ""
            year = f" ({p['year']})" if p["year"] else ""
            journal = f" {p['journal']}." if p["journal"] else ""
            cite[p["doi"]] = f"{lead}{etal}{year} {p['title']}.{journal}".strip()

    for fname in limit_cols:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
            cols = rows[0].keys() if rows else []
        if not rows or "reference" not in cols:
            continue
        filled = 0
        for r in rows:
            if r.get("reference", "").strip():
                continue
            doi = normalise_doi(r.get("doi", ""))
            if doi and doi in cite:
                r["reference"] = cite[doi]
                filled += 1
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(cols))
            w.writeheader()
            w.writerows(rows)
        have = sum(1 for r in rows if r.get("reference", "").strip())
        print(f"{fname:16s} filled {filled:6d} references; now {have}/{len(rows)} "
              f"({have/len(rows)*100:.1f}%) have one")
