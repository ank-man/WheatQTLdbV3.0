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
    r"(/(full|abstract|pdf|html|epdf|meta|citation|references|figures|fulltext)(/.*)?"
    r"|\.pdf|\.full|\.short|\.abstract)$", re.I)


def normalise_doi(raw: str) -> str:
    """-> bare lowercase DOI, or '' when the link carries none."""
    if not raw:
        return ""
    # Springer links arrive percent-encoded ("10.1007%2Fs00122-018-3183-6"), and
    # a few DOIs were pasted with a space after the slash; neither matched the
    # pattern, so those papers were filed as "no DOI".
    text = urllib.parse.unquote(raw)
    text = re.sub(r"(10\.\d{4,9}/)\s+", r"\1", text)
    m = DOI_RE.search(text)
    if not m:
        return ""
    doi = m.group(0)
    doi = doi.split("#")[0].split("?")[0]          # anchors, query strings
    # Applied until stable: "…/s10681-017-2058-2.pdf" kept its ".pdf", which is
    # not part of the DOI, so Crossref could not resolve it.
    while True:
        cut = TRAILING_PATHS.sub("", doi).rstrip(".,;)]}/'\"")
        if cut == doi:
            break
        doi = cut
    return doi.lower()


def source_label(raw: str) -> str:
    """For links with no DOI, keep the publisher host so the row is still usable."""
    if not raw:
        return ""
    m = re.search(r"https?://(?:www\.)?([^/]+)", raw)
    return m.group(1) if m else raw[:60]


def link_key(raw: str) -> str:
    """One key per ARTICLE for a reference that cannot be reduced to a DOI.

    The key used to be the publisher host alone, which merged every DOI-less
    link from one publisher into a single "publication": 126 different MDPI
    papers became one row credited with 7,745 records, 93 ScienceDirect papers
    another with 5,407. The key is now the link itself, minus the parts that
    vary without changing the article (scheme, www, fragment, trailing slash).
    """
    k = raw.strip()
    k = re.sub(r"^https?://(www\.)?", "", k, flags=re.I)
    k = k.split("#")[0].rstrip("/ ")
    return "link:" + k.lower()


# ---------------------------------------------------------------------------
# Recovering a DOI from a link that does not contain one
# ---------------------------------------------------------------------------
# About a third of the reference links are a publisher or index page rather than
# a DOI. Most still identify the article exactly - a PubMed id, an Elsevier PII,
# an MDPI volume/issue/article path - and those identifiers can be exchanged for
# the DOI. Every DOI produced here is then looked up in Crossref like any other,
# and is only kept if Crossref returns a title for it, so a wrong guess cannot
# attach a record to the wrong paper: it simply stays a link-only reference.

def _get_json(url: str, cache_name: str):
    path = os.path.join(CACHE, "res_" + re.sub(r"[^A-Za-z0-9]", "_", cache_name)[:140] + ".json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    throttle()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            data = json.load(r)
    except Exception as e:                       # network failure: do not cache
        print(f"    lookup failed ({type(e).__name__}): {url[:90]}", flush=True)
        return {}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


_mdpi_abbr = {}


def _mdpi_doi(issn, vol, issue, art):
    """MDPI DOIs are 10.3390/<journal><vol><issue:2><article:4>; the journal
    abbreviation is read off any one Crossref DOI for that ISSN."""
    if issn not in _mdpi_abbr:
        msg = _get_json(f"https://api.crossref.org/works?filter=issn:{issn},prefix:10.3390"
                        f"&rows=1&select=DOI&mailto={MAILTO}", f"issn_{issn}").get("message", {})
        doi = (msg.get("items") or [{}])[0].get("DOI", "")
        m = re.match(r"10\.3390/([a-z]+)\d", doi)
        _mdpi_abbr[issn] = m.group(1) if m else ""
    abbr = _mdpi_abbr[issn]
    return f"10.3390/{abbr}{int(vol)}{int(issue):02d}{int(art):04d}" if abbr else ""


def _pii_doi(pii):
    msg = _get_json(f"https://api.crossref.org/works?filter=alternative-id:{pii}"
                    f"&rows=1&select=DOI&mailto={MAILTO}", f"pii_{pii}").get("message", {})
    return (msg.get("items") or [{}])[0].get("DOI", "").lower()


def _norm_title(t):
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def _title_doi(text):
    """A reference pasted as a page title ("<title> | <journal>")."""
    title = re.sub(r"^\s*Frontiers\s*\|\s*", "", text)
    title = re.split(r"\s+\|\s+|\s+-\s+ScienceDirect", title)[0].strip()
    if len(title) < 30:
        return ""
    q = urllib.parse.quote(title)
    msg = _get_json(f"https://api.crossref.org/works?query.bibliographic={q}"
                    f"&rows=3&select=DOI,title&mailto={MAILTO}", f"title_{title}").get("message", {})
    want = _norm_title(title)
    for it in msg.get("items") or []:
        got = _norm_title((it.get("title") or [""])[0])
        # Exact match after normalising punctuation, or one a prefix of the
        # other (the curated cell is sometimes cut short). Nothing fuzzier:
        # a near-miss title is a different paper.
        if got and (got == want or (len(want) > 60 and (got.startswith(want) or want.startswith(got)))):
            return it.get("DOI", "").lower()
    return ""


PMID_RE = re.compile(r"(?:pubmed\.ncbi\.nlm\.nih\.gov/|ncbi\.nlm\.nih\.gov/pubmed/|europepmc\.org/article/med/)(\d+)", re.I)
PMC_RE = re.compile(r"(PMC\d+)", re.I)


def _ncbi_batch(pmids, pmcids):
    """-> ({pmid: doi}, {pmcid: doi}, {pmid: metadata}) from NCBI, in batches."""
    pm_doi, pmc_doi, pm_meta = {}, {}, {}
    pmcids = sorted(pmcids)
    for i in range(0, len(pmcids), 100):
        chunk = pmcids[i:i + 100]
        d = _get_json("https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?format=json"
                      f"&tool=wheatqtldb&email={MAILTO}&ids=" + ",".join(chunk),
                      "pmc_" + "_".join(chunk)[:100] + f"_{len(chunk)}")
        for rec in d.get("records", []):
            if rec.get("doi"):
                pmc_doi[rec["pmcid"].upper()] = rec["doi"].lower()
            elif rec.get("pmid"):
                pmids.add(str(rec["pmid"]))
                pmc_doi[rec["pmcid"].upper()] = f"pmid:{rec['pmid']}"
    pmids = sorted(pmids)
    for i in range(0, len(pmids), 100):
        chunk = pmids[i:i + 100]
        d = _get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed"
                      f"&retmode=json&tool=wheatqtldb&email={MAILTO}&id=" + ",".join(chunk),
                      "pmid_" + "_".join(chunk)[:100] + f"_{len(chunk)}").get("result", {})
        for pid in chunk:
            rec = d.get(pid) or {}
            if not rec.get("title"):
                continue
            doi = next((a["value"] for a in rec.get("articleids", [])
                        if a.get("idtype") == "doi"), "")
            if doi:
                pm_doi[pid] = doi.lower()
            ym = re.match(r"(\d{4})", rec.get("pubdate", ""))
            pm_meta[pid] = {
                "title": rec["title"].rstrip("."),
                "authors": "; ".join(a["name"] for a in rec.get("authors", [])[:12]),
                "journal": rec.get("fulljournalname") or rec.get("source", ""),
                "year": ym.group(1) if ym else "",
                "type": "journal-article", "publisher": "", "citations": "",
            }
    return pm_doi, pmc_doi, pm_meta


def resolve_links(raws):
    """raw reference string -> (key, metadata-or-None) for every distinct string.

    key is a bare DOI where one is present or recoverable, "pmid:<n>" for a
    PubMed record with no DOI, otherwise "link:<url>".
    """
    out, candidate = {}, {}
    pmids, pmcids = set(), set()
    for raw in raws:
        doi = normalise_doi(raw)
        if doi:
            out[raw] = doi
            continue
        m = PMID_RE.search(raw)
        if m:
            pmids.add(m.group(1))
            continue
        m = PMC_RE.search(raw)
        if m and "ncbi" in raw.lower():
            pmcids.add(m.group(1).upper())
    pm_doi, pmc_doi, pm_meta = _ncbi_batch(pmids, pmcids)

    for raw in raws:
        if raw in out:
            continue
        guess = ""
        if (m := PMID_RE.search(raw)):
            guess = pm_doi.get(m.group(1)) or (f"pmid:{m.group(1)}" if m.group(1) in pm_meta else "")
        elif (m := PMC_RE.search(raw)) and "ncbi" in raw.lower():
            guess = pmc_doi.get(m.group(1).upper(), "")
        elif (m := re.search(r"nature\.com/articles/([a-z0-9-]+)", raw, re.I)):
            guess = f"10.1038/{m.group(1).lower()}"
        elif (m := re.search(r"peerj\.com/articles/(\d+)", raw, re.I)):
            guess = f"10.7717/peerj.{m.group(1)}"
        elif (m := re.search(r"researchsquare\.com/article/(rs-\d+)/(v\d+)", raw, re.I)):
            guess = f"10.21203/rs.3.{m.group(1)}/{m.group(2)}"
        elif (m := re.search(r"publish\.csiro\.au/\w+/([A-Za-z]{2}\d{5})", raw)):
            guess = f"10.1071/{m.group(1).lower()}"
        elif (m := re.search(r"mdpi\.com/(\d{4}-\d{3}[\dxX])/(\d+)/(\d+)/(\d+)", raw, re.I)):
            guess = _mdpi_doi(m.group(1), m.group(2), m.group(3), m.group(4))
        elif (m := re.search(r"(?:/pii/|csbj\.org/article/)(S[0-9X()\-]+)", raw, re.I)):
            guess = _pii_doi(re.sub(r"[^0-9A-Za-z]", "", m.group(1)))
        elif not re.match(r"(https?://|www\.)", raw, re.I):
            guess = _title_doi(raw)
        if guess.startswith("pmid:"):
            out[raw] = guess
        elif guess:
            candidate[raw] = guess
        else:
            out[raw] = link_key(raw)

    # A derived DOI counts only if Crossref knows it.
    def verify(item):
        raw, doi = item
        return raw, doi, bool(meta_from(fetch_crossref(doi)).get("title"))

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for raw, doi, ok in pool.map(verify, candidate.items()):
            out[raw] = doi if ok else link_key(raw)
    pmid_meta = {f"pmid:{k}": v for k, v in pm_meta.items()}
    return out, pmid_meta


RECORD_TABLES = [("qtl.csv", "QTL"), ("metaqtl.csv", "MetaQTL"),
                 ("epistatic.csv", "Epistatic"), ("candidate_genes.csv", "Candidate gene")]


def distinct_references():
    raws = set()
    for fname, _ in RECORD_TABLES:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                raw = (r.get("doi") or "").strip()
                if raw:
                    raws.add(raw)
    return sorted(raws)


def collect(keys):
    """key -> {'records': n, 'tables': set, 'raw': example, 'species': Counter}"""
    agg = defaultdict(lambda: {"records": 0, "tables": set(), "raw": "",
                               "species": Counter(), "traits": Counter(),
                               "no_doi_source": ""})
    for fname, label in RECORD_TABLES:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                raw = (r.get("doi") or "").strip()
                if not raw:
                    continue
                key = keys[raw]
                a = agg[key]
                a["records"] += 1
                a["tables"].add(label)
                if not a["raw"]:
                    a["raw"] = raw
                if key.startswith("link:"):
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


def plain(text: str) -> str:
    """Crossref returns titles with JATS/HTML markup and entities in them
    ("<i>Triticum aestivum</i>", "Plant, Cell &amp; Environment",
    "&lt;i&gt;Heterodera&lt;/i&gt;"). The site prints these as text, so the
    markup showed up literally. A few records are also double-encoded
    ("R\u00c3\u00b6der" for "R\u00f6der"), which is undone when it round-trips cleanly."""
    import html
    t = html.unescape(html.unescape(text or ""))
    t = re.sub(r"</?[A-Za-z][^<>]{0,40}>", "", t)
    if re.search("[\u00c3\u00c2\u00e2]", t):
        try:
            t = t.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    t = t.replace("R\ufffdder", "Röder")
    return re.sub(r"\s+", " ", t).strip()


def meta_from(msg):
    if not msg or msg.get("_error"):
        return {}
    title = plain((msg.get("title") or [""])[0])
    authors = []
    for a in (msg.get("author") or [])[:12]:
        fam = plain(a.get("family") or "")
        given = (a.get("given") or "").strip()
        initials = "".join(p[0] for p in re.split(r"[\s.-]+", given) if p)
        authors.append(f"{fam} {initials}".strip())
    date = (msg.get("issued", {}).get("date-parts") or [[None]])[0]
    return {
        "title": re.sub(r"\s+", " ", title).strip(),
        "authors": "; ".join(authors),
        "journal": plain((msg.get("container-title") or [""])[0]),
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

    raws = distinct_references()
    direct = sum(1 for r in raws if normalise_doi(r))
    if args.no_enrich:
        keys = {r: normalise_doi(r) or link_key(r) for r in raws}
        pmid_meta = {}
    else:
        print(f"resolving {len(raws) - direct} links that carry no DOI...")
        keys, pmid_meta = resolve_links(raws)
    agg = collect(keys)
    is_doi_key = lambda k: not k.startswith(("link:", "pmid:"))
    dois = [k for k in agg if is_doi_key(k)]
    print(f"distinct reference strings : {len(raws)}")
    print(f"distinct publications      : {len(agg)}")
    print(f"  DOI in the link            : {len({keys[r] for r in raws if normalise_doi(r)})}")
    print(f"  DOI recovered from the link: {len(dois) - len({keys[r] for r in raws if normalise_doi(r)})}")
    print(f"  PubMed record, no DOI      : {sum(1 for k in agg if k.startswith('pmid:'))}")
    print(f"  link only                  : {sum(1 for k in agg if k.startswith('link:'))}")

    meta = dict(pmid_meta)
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
        found = sum(1 for d in targets if meta.get(d, {}).get("title"))
        print(f"  resolved with metadata: {found}/{len(targets)}")

    cols = ["id", "doi", "title", "authors", "journal", "year", "type", "publisher",
            "citations", "records", "record_types", "species", "top_trait", "url"]
    rows = []
    for key, a in sorted(agg.items(), key=lambda kv: -kv[1]["records"]):
        is_doi = is_doi_key(key)
        is_link = key.startswith("link:")
        m = meta.get(key, {})
        rows.append({
            "id": f"P{len(rows)+1:05d}",
            "doi": key if is_doi else "",
            "title": m.get("title", "") or (f"[{a['no_doi_source']}]" if is_link else ""),
            "authors": m.get("authors", ""),
            "journal": m.get("journal", "") or (a["no_doi_source"] if is_link else ""),
            "year": m.get("year", ""),
            "type": m.get("type", ""),
            "publisher": m.get("publisher", ""),
            "citations": m.get("citations", ""),
            "records": a["records"],
            "record_types": "; ".join(sorted(a["tables"])),
            "species": "; ".join(f"{s} ({n})" for s, n in a["species"].most_common(3)),
            "top_trait": a["traits"].most_common(1)[0][0] if a["traits"] else "",
            "url": f"https://doi.org/{key}" if is_doi else a["raw"],
            "_key": key,
        })

    # Which publication each distinct reference string belongs to. The record
    # tables are joined to publications.csv through this file, so the year a
    # record is charted under is the year of its publication and nothing else.
    by_key = {r["_key"]: r for r in rows}
    with open(os.path.join(DATA, "reference_index.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["reference", "publication_id", "year"])
        for raw in raws:
            p = by_key[keys[raw]]
            w.writerow([raw, p["id"], p["year"]])
    for r in rows:
        del r["_key"]

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


# A year is only ever read from citation text a curator typed, never from a
# link: DOIs and publisher URLs are full of four-digit runs that are not years
# ("s10681-017-2058-2", "mdpi.com/2077-0472/..."), and reading those is what put
# QTL in 2058, 2073 and 2077 on the publication-year chart.
CITED_YEAR = re.compile(r"(?<![\d/.-])(19[89]\d|20[0-2]\d)(?![\d/-])")


def cited_year(reference: str) -> str:
    if not reference or re.search(r"https?://|www\.|10\.\d{4,9}/", reference):
        return ""
    years = [y for y in CITED_YEAR.findall(reference) if int(y) <= time.gmtime().tm_year]
    return years[-1] if years else ""


def backfill_references(limit_cols=("qtl.csv", "metaqtl.csv", "epistatic.csv")):
    """Write resolved citations and publication years back into the record tables.

    The source spreadsheets record a reference for only ~2.7% of rows - most
    carry a link and nothing else, and in some files the citation column was
    dropped when the fuller sheet replaced an older one. Since publications.csv
    already resolves each link to real bibliographic metadata, that text can be
    filled in wherever a record's link was resolved.

    The record's own reference text is never overwritten: a curator-entered
    citation stays as the authority.

    Each record also gets a `year` column: the publication's year, or failing
    that the year in the curator's own citation. It is left empty when neither
    is known rather than guessed.
    """
    pub_path = os.path.join(DATA, "publications.csv")
    idx_path = os.path.join(DATA, "reference_index.csv")
    if not os.path.exists(pub_path) or not os.path.exists(idx_path):
        print("publications.csv / reference_index.csv missing - run the main build first")
        return
    cite, year_of = {}, {}
    with open(pub_path, encoding="utf-8") as f:
        for p in csv.DictReader(f):
            year_of[p["id"]] = p["year"]
            if not p["title"] or p["title"].startswith("["):
                continue
            authors = p["authors"].split("; ")
            lead = authors[0] if authors and authors[0] else ""
            etal = " et al." if len(authors) > 1 else ""
            year = f" ({p['year']})" if p["year"] else ""
            journal = f" {p['journal']}." if p["journal"] else ""
            cite[p["id"]] = f"{lead}{etal}{year} {p['title']}.{journal}".strip()
    with open(idx_path, encoding="utf-8") as f:
        pub_of = {r["reference"]: r["publication_id"] for r in csv.DictReader(f)}

    for fname in limit_cols:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
            cols = list(rows[0].keys()) if rows else []
        if not rows or "reference" not in cols:
            continue
        if "year" not in cols:
            cols.insert(cols.index("doi") + 1, "year")
        filled = dated = 0
        for r in rows:
            pid = pub_of.get((r.get("doi") or "").strip(), "")
            curated = r.get("reference", "").strip()
            r["year"] = year_of.get(pid, "") or cited_year(curated)
            dated += bool(r["year"])
            if not curated and pid in cite:
                r["reference"] = cite[pid]
                filled += 1
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
        have = sum(1 for r in rows if r.get("reference", "").strip())
        print(f"  {fname:<16} filled {filled:>6}   references {have}/{len(rows)}"
              f"   with a year {dated}/{len(rows)} ({100 * dated / len(rows):.1f}%)")
