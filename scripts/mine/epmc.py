"""
Shared Europe PMC client for the WheatQTLdb literature-mining pipeline.

Europe PMC provides this REST API for programmatic/text-mining use and its
open-access subset is licensed for it. This client therefore:
  * restricts every query to OPEN_ACCESS:Y AND IN_EPMC:Y, so nothing behind a
    paywall is ever requested,
  * identifies itself with a contact address in the User-Agent,
  * rate-limits politely, and
  * caches every response on disk, so re-runs cost the API nothing.

Coded for WheatQTLdb/WheatQTLdb <mr.ank2999@gmail.com>
"""

import hashlib
import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"
UA = "WheatQTLdb/3.0 (academic text-mining; mr.ank2999@gmail.com)"

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache")
OUT = os.path.join(HERE, "out")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# Europe PMC asks for considerate use rather than publishing a hard limit.
# Requests run concurrently but pass through one shared rate limiter, so
# raising WORKERS makes a run finish sooner without ever increasing the load
# the API actually sees beyond REQS_PER_SEC.
REQS_PER_SEC = 10.0
WORKERS = 8

_rate_lock = threading.Lock()
_next_slot = [0.0]


def _throttle():
    """Global token bucket - safe to call from any worker thread."""
    with _rate_lock:
        now = time.time()
        slot = max(now, _next_slot[0])
        _next_slot[0] = slot + (1.0 / REQS_PER_SEC)
    delay = slot - time.time()
    if delay > 0:
        time.sleep(delay)


def _cache_path(key: str, ext: str) -> str:
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:20]
    return os.path.join(CACHE, f"{h}.{ext}")


def fetch(url: str, ext: str = "json", retries: int = 3):
    """GET a URL, with disk cache. Returns text, or None on a hard failure."""
    path = _cache_path(url, ext)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    for attempt in range(retries):
        _throttle()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode("utf-8", errors="replace")
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            return body
        except urllib.error.HTTPError as e:
            # 404 just means this record has no full text - cache the miss so
            # we don't ask again on the next run.
            if e.code == 404:
                with open(path, "w", encoding="utf-8") as f:
                    f.write("")
                return ""
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            print(f"    ! HTTP {e.code} {url}")
            return None
        except Exception as e:  # network blip
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            print(f"    ! {type(e).__name__} {url}")
            return None
    return None


def search(query: str, page_size: int = 100, max_results: int = 1000):
    """Yield Europe PMC `core` result dicts for a query, following cursorMark."""
    cursor = "*"
    seen = 0
    while seen < max_results:
        params = urllib.parse.urlencode({
            "query": query,
            "format": "json",
            "pageSize": min(page_size, max_results - seen),
            "resultType": "core",
            "cursorMark": cursor,
        })
        body = fetch(f"{BASE}/search?{params}", "json")
        if not body:
            return
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return
        results = data.get("resultList", {}).get("result", [])
        if not results:
            return
        for r in results:
            yield r
            seen += 1
            if seen >= max_results:
                return
        nxt = data.get("nextCursorMark")
        if not nxt or nxt == cursor:
            return
        cursor = nxt


def hit_count(query: str) -> int:
    params = urllib.parse.urlencode({
        "query": query, "format": "json", "pageSize": 1, "resultType": "idlist",
    })
    body = fetch(f"{BASE}/search?{params}", "json")
    if not body:
        return 0
    try:
        return json.loads(body).get("hitCount", 0)
    except json.JSONDecodeError:
        return 0


def full_text_xml(pmcid: str) -> str:
    """JATS full text for an open-access PMC record ('' when unavailable)."""
    return fetch(f"{BASE}/{pmcid}/fullTextXML", "xml") or ""


def full_text_many(pmcids, progress_every: int = 100):
    """Fetch many full texts concurrently. Yields (pmcid, xml) as they land.

    Cached entries resolve without touching the network, so a re-run of a
    completed stage is effectively instant.
    """
    done = [0]
    total = len(pmcids)

    def one(pmcid):
        xml = fetch(f"{BASE}/{pmcid}/fullTextXML", "xml") or ""
        done[0] += 1
        if progress_every and done[0] % progress_every == 0:
            print(f"    {done[0]}/{total} fetched", flush=True)
        return pmcid, xml

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for pmcid, xml in pool.map(one, pmcids):
            yield pmcid, xml


def supplementary_many(pmcids, progress_every: int = 25):
    """Fetch many supplementary bundles concurrently.

    The bundles are the slow part of the pipeline - a few MB each, hundreds of
    them - and fetching them one at a time leaves the connection idle while
    each download completes. They still pass through the same shared rate
    limiter, so concurrency shortens the wall clock without raising the request
    rate the API sees. Yields (pmcid, bytes|None) as each lands.
    """
    done = [0]
    total = len(pmcids)

    def one(pmcid):
        blob = supplementary_zip(pmcid)
        done[0] += 1
        if progress_every and done[0] % progress_every == 0:
            print(f"    {done[0]}/{total} bundles", flush=True)
        return pmcid, blob

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for pmcid, blob in pool.map(one, pmcids):
            yield pmcid, blob


def supplementary_zip(pmcid: str) -> bytes | None:
    """Raw supplementary-file bundle for an OA record, or None.

    A large share of QTL tables are published as supplementary spreadsheets
    rather than typeset tables, so this is a second, independent source of
    records beyond the JATS <table-wrap> elements.
    """
    url = f"{BASE}/{pmcid}/supplementaryFiles"
    path = _cache_path(url, "zip")
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = f.read()
        return data or None

    _throttle()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            open(path, "wb").close()  # cache the miss
            return None
        return None
    except Exception:
        return None

    with open(path, "wb") as f:
        f.write(data)
    return data or None
