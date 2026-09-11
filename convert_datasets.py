"""
Converts updated dataset files (.xlsx, .xls, .csv) into the 3 CSV tables:
  - public/data/qtl.csv
  - public/data/metaqtl.csv
  - public/data/epistatic.csv

Sources exclusively from Final_data/ (extracted from Final_data.rar), the
single authoritative data drop. Earlier source folders (new_data/, the old
"Updated data (2.0+3.0)/") were archived under archive/pre_final_data/ and
are no longer read by this pipeline.

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""

import os, re, csv, glob
import openpyxl
import xlrd

OUT = os.path.join(os.path.dirname(__file__), "public", "data")

SOURCES = [
    "Final_data/Updated data (2.0+3.0)/Data with v2.0",
    "Final_data/Updated data (2.0+3.0)/multitrait qtl",
    "Final_data/Updated data (2.0+3.0)/Epistatic QTLs_v3.0.xlsx",
]

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    s = re.sub(r"\s+", " ", s)
    return s if s not in ("-", "NA", "N/A", "na", "n/a", "nil", "Nil", "--") else ""

# ---------------------------------------------------------------------------
# chromosome / species normalization
#
# Raw source spreadsheets write the chromosome and species columns very
# inconsistently (arm suffixes, duplicate-QTL indices, stray "chr" prefixes,
# outright typos, and - especially for older GWAS studies - a missing
# chromosome column altogether). Downstream code (the circos figure, the
# ideogram/chromosome map, statistics) needs a small, closed set of
# categories to plot against, so every record is normalized here, once, to
# exactly one of the 21 real wheat chromosomes (1A-7D) or the catch-all "Un"
# (unknown / unanchored / not reported) - 22 categories total.
# ---------------------------------------------------------------------------

_CHR_UNKNOWN_TOKENS = re.compile(r"^(un|unm|unknown|unk|na|n/?a|nd|np|uad|_+|-+|\.+|0+)$", re.I)
_CHR_CANON = re.compile(r"^[1-7][ABD]$", re.I)
_CHR_PREFIX = re.compile(r"^chr[_\-\s]?", re.I)
# A bounded chromosome code, optionally followed by an arm letter (L/S) and/or
# a short duplicate-QTL suffix (".1", "-a", "1" ...). Bounded on both sides so
# it doesn't fire on unrelated digit/letter runs.
_CHR_CODE = re.compile(r"(?<![0-9A-Za-z])([1-7][ABD])(?:[LS])?(?:[._-]?[0-9A-Za-z]{0,3})?(?![0-9A-Za-z])", re.I)

def normalize_chromosome(raw):
    """Map any raw chromosome value to one of 1A-7D or 'Un'."""
    s = "" if raw is None else str(raw).strip()
    if not s:
        return "Un"
    s = _CHR_PREFIX.sub("", s)
    if _CHR_CANON.match(s):
        return s.upper()
    if _CHR_UNKNOWN_TOKENS.match(s):
        return "Un"
    codes = {m.group(1).upper() for m in _CHR_CODE.finditer(s)}
    # A value listing more than one distinct chromosome (e.g. "1A/1D/3A/5B")
    # can't be represented as a single category without misplacing the
    # record, so it goes to "Un" rather than arbitrarily picking one.
    if len(codes) == 1:
        return next(iter(codes))
    return "Un"

def extract_chr_from_text(text):
    """Recover a chromosome code embedded in a QTL/MQTL/marker identifier,
    e.g. "Qhd.tamu.5B", "MQTL_5A", "chr3B_559428575", "QCcnr.ccsu-1D.4".
    Returns None if nothing bounded and unambiguous is found."""
    s = "" if text is None else str(text).strip()
    if not s:
        return None
    m = re.search(r"chr[_]?([1-7][ABD])", s, re.I)
    if m:
        return m.group(1).upper()
    m = re.search(r"[-_. ]([1-7][ABD])(?=[-_. ]|$)", s, re.I)
    if m:
        return m.group(1).upper()
    m = re.search(r"[-_]([1-7][ABD])", s, re.I)
    if m:
        return m.group(1).upper()
    return None

def resolve_chromosome(raw, *name_fallbacks):
    """Normalize `raw`; if it lands on 'Un', try to recover a real chromosome
    from the given fallback identifiers (qtl name, marker string, ...)."""
    chrom = normalize_chromosome(raw)
    if chrom != "Un":
        return chrom
    for fb in name_fallbacks:
        recovered = extract_chr_from_text(fb)
        if recovered:
            return recovered
    return "Un"

# Species names are copy-pasted from dozens of source papers with wildly
# inconsistent formatting (author abbreviations, trailing "L.", stray
# parentheses, ploidy notes...). The dataset only contains a small, fully
# enumerated set of raw spellings, so map them explicitly to a canonical
# binomial rather than guessing with a generic parser. Anything not covered
# here is left as-is and reported at the end of the run so it can be added.
SPECIES_MAP = {
    "triticum aestivum": "Triticum aestivum",
    "triticum aestivum l.": "Triticum aestivum",
    "triticum aestivum l": "Triticum aestivum",
    "t. aestivum": "Triticum aestivum",
    "triticum aestivum.l": "Triticum aestivum",
    "triticum aestivum.l (hexaploid)": "Triticum aestivum",
    "triticum aestivum(tetraploid)": "Triticum aestivum",
    "triticum durum": "Triticum durum",
    "triticum durum/triticum durum": "Triticum durum",
    "durum wheat": "Triticum durum",
    "triticum turgidum ssp. durum": "Triticum durum",
    "triticum turgidum ssp. durum)": "Triticum durum",
    "(triticum turgidum l. var. durum": "Triticum durum",
    "triticum turgidum l. var. durum": "Triticum durum",
    "triticum turgidum l. var. durum desf.": "Triticum durum",
    "triticum turgidum l. ssp. durum": "Triticum durum",
    "triticumturgidum spp. durum": "Triticum durum",
    "triticum turgidum": "Triticum turgidum",
    "triticum turgidum l.": "Triticum turgidum",
    "tetraploid wheat": "Triticum turgidum",
    "triticum turgidum ssp. dicoccoides": "Triticum turgidum subsp. dicoccoides",
    "triticum turgidum ssp. dicoccoides)": "Triticum turgidum subsp. dicoccoides",
    "triticum dicoccoides": "Triticum turgidum subsp. dicoccoides",
    "t. turgidum ssp. dicoccum": "Triticum turgidum subsp. dicoccum",
    "triticum turgidum ssp. dicoccum": "Triticum turgidum subsp. dicoccum",
    "triticum turgidum ssp.dicoccum": "Triticum turgidum subsp. dicoccum",
    "t. turgidum subsp. dicoccum": "Triticum turgidum subsp. dicoccum",
    "triticum dicoccum": "Triticum turgidum subsp. dicoccum",
    "triticum monococcum": "Triticum monococcum",
    "triticum monococcum l.": "Triticum monococcum",
    "aegilops tauschii": "Aegilops tauschii",
    "triticum aestivum/triticum turgidum": "Triticum aestivum; Triticum turgidum",
    "aegilops tauschii, triticum durum": "Aegilops tauschii; Triticum durum",
    "t. dicoccon, t. durum, t. spelta":
        "Triticum turgidum subsp. dicoccum; Triticum durum; Triticum spelta",
    "ae. tauschii, ae. cylindrica, t. aestivum, ae. crassa":
        "Aegilops tauschii; Aegilops cylindrica; Triticum aestivum; Aegilops crassa",
    "t. turgidum ssp. durum (desf.) husn. and aegilops tauschii":
        "Triticum durum; Aegilops tauschii",
    "triticum boeoticum": "Triticum boeoticum",
    "triticum turgidum; triticum aestivum": "Triticum turgidum; Triticum aestivum",
    "triticum durum/t. dicoccoides": "Triticum durum; Triticum turgidum subsp. dicoccoides",
}
_unmapped_species = set()

def normalize_species(raw):
    s = "" if raw is None else str(raw).strip()
    if not s:
        return ""
    key = re.sub(r"\s+", " ", s).lower()
    canon = SPECIES_MAP.get(key)
    if canon is None:
        _unmapped_species.add(s)
        return s
    return canon

def normalize_topic(name):
    """Return a comparable topic key from a filename, ignoring extensions and common suffixes."""
    n = os.path.splitext(name)[0].lower()
    for suffix in ("_revised", "_combined", "_final", "_checked", "_v3.0", "_v2.0",
                   "_qtl", "_qtls", "_mqtl", "_metaqtl", "_meta-qtl", "_mta",
                   "_data", "_database", " data", " database"):
        n = n.replace(suffix, "")
    n = re.sub(r"[^a-z0-9]", "", n)
    return n

def collect_files():
    """Walk SOURCES in priority order; prefer earlier sources when topic keys collide."""
    chosen = {}
    base_dir = os.path.dirname(__file__)
    for priority, src in enumerate(SOURCES):
        src_path = os.path.join(base_dir, src)
        if os.path.isfile(src_path) and src_path.lower().endswith((".xlsx", ".xls", ".csv")):
            files = [src_path]
        elif os.path.isdir(src_path):
            files = sorted(glob.glob(os.path.join(src_path, "*.xlsx")) +
                            glob.glob(os.path.join(src_path, "*.xls")) +
                            glob.glob(os.path.join(src_path, "*.csv")))
        else:
            continue
        for fpath in files:
            key = normalize_topic(os.path.basename(fpath))
            if not key:
                continue
            existing = chosen.get(key)
            if existing is None or priority < existing[0]:
                chosen[key] = (priority, fpath)
    return sorted(fpath for _, fpath in chosen.values())

def file_type_from_name(fname):
    """Classify a CSV/Excel file based on its filename."""
    n = fname.lower()
    if any(k in n for k in ("eqtl", "epistatic", "epistasi")):
        return "epistatic"
    if any(k in n for k in ("metaqtl", "meta-qtl", "mqtl")):
        return "metaqtl"
    return "qtl"

# Some source spreadsheets have a header row that is missing one column
# label, which silently shifts every SUBSEQUENT header one position away
# from the data it actually describes (e.g. a header that reads
# [..., "Trait", "Parameter", "Cross", ...] over data that is actually
# [..., species, trait, parameter, ...] - every label from that point on
# names the WRONG column, not just one). col_idx()'s token matching can't
# detect this on its own since each individual header token still looks
# like a plausible, real column name. Corrected in full here, per file,
# once confirmed by inspecting the actual data columns by hand.
HEADER_OVERRIDE = {
    # Zn content.xls: header omits a "Species" label entirely, so
    # "Trait" through the final blank column each name the column to
    # their own LEFT. Confirmed against the real data (e.g. row 1:
    # [1, "Triticum aestivum", "Zinc content", "Shoot zinc content", ...]).
    "Zn content.xls": ["", "Species", "Trait", "Parameter", "Cross", "Population/Germplasm",
                        "Method", "QTL/MTA name", "Chromosome", "Position/Interval in cM/bp",
                        "Associated markers", "PVE/R2", "Candidate gene", "Link to reference"],
    # Nematode_Resistance.xlsx Sheet1: the header row lists "Cross",
    # "Population/Germplasm", "Method" BEFORE "Trait"/"Parameter", but the
    # actual data columns are in the standard order (Trait, Parameter, then
    # Cross, Population, Method) - the header cells were reordered without
    # reordering the data. Confirmed against real data (row 1: Species=
    # "Triticum aestivum", then "Nematode resistance", "Heterodera avenae",
    # "Trident x Molineux", "DH (182)", "CIM", QTL name "Cre8", ...), which
    # is why the trait dropdown was showing population sizes ("DH (182)")
    # instead of "Nematode resistance".
    "Nematode_Resistance.xlsx": ["S_No", "Species", "Trait", "Parameter", "Cross",
                                  "Population/Germplasm", "Method", "QTL name", "Chromosome",
                                  "Position/Interval in cM/bp", "Associated Markers", "PVE/R2",
                                  "Candidate genes", "Link to reference"],
}

# Per-(file, sheet) overrides, for workbooks where different sheets have
# different (and differently broken) header layouts.
SHEET_HEADER_OVERRIDE = {
    # Epistatic QTLs_v3.0.xlsx :: Epistatic_yield "QTgw.cerz"-pattern rows
    # only (see EPISTATIC_YIELD_QTL_PATTERN / split_epistatic_yield below) -
    # for THESE rows, "Cross"/"Population/Germplasm"/"Method"/"epistatic"
    # never hold cross/population/method data at all; those 4 columns plus
    # "Chromosome"/"Position/Interval (cM)"/"Physical interval (Mb)"/
    # "Associated markers" hold QTL1's and QTL2's name, chromosome, position
    # and markers back to back. Confirmed against row 1: ('Triticum durum',
    # 'Yield','Thousand grain weight','QTgw.cerz-1AS.1','1A','0.0-5.5',
    # 'Bla-wmc95','QTgw.cerz-1BS','1B','31.7-38.1','gwm273-wmc626', ...) -
    # two complete QTL loci (1A and 1B), the epistatic pair itself.
    ("Epistatic QTLs_v3.0.xlsx", "Epistatic_yield [named-QTL rows]"): [
        "S.No.", "Species", "Trait", "Parameter",
        "QTL 1", "Chromosome 1", "Position/Interval QTL1", "Associated Markers QTL1",
        "QTL 2", "Chromosome 2", "Position/Interval QTL2", "Associated Markers QTL2",
        "PVE", "Link to reference",
    ],
    # Epistatic QTLs_v3.0.xlsx :: Zn Epistatic QTL: same pattern as
    # Epistatic_yield (Cross/Population/Method inserted before the QTL1/QTL2
    # data), confirmed against row 1: Species/Trait/Parameter are correct,
    # then Cross='Xiaoyan 54 x Jing 411', Population='F11 RIL 184',
    # Method='CIM', QTL1 name='EQZn-2A1', Chromosome1='2A', Position1='0',
    # Markers1='Xgwm501-Xgwm156.2'; QTL2 is not populated in this sheet.
    ("Epistatic QTLs_v3.0.xlsx", "Zn Epistatic QTL"): [
        "Species", "Trait", "Parameter", "Cross", "Population/Germplasm", "Method",
        "QTL 1", "Chromosome 1", "Position/Interval QTL1", "Associated Markers QTL1",
        "QTL 2", "Chromosome 2", "Link to reference", "Reference",
    ],
    # Epistatic QTLs_v3.0.xlsx :: Epistatic_nematode resistance: header
    # LABELS are all individually correct (Cross/Population/Method/Trait/
    # Parameter genuinely hold that data, just in a non-standard column
    # order), but the QTL2-side headers ("Chromosome of QTL2", "Position/
    # Interval in cM/bp", "Associated Markers to QTL 2") don't match
    # extract_epistatic's ch2i/ps2i/am2i candidate wording, so those 3
    # fields were silently coming back empty. Renamed to the exact wording
    # those candidates look for; every other column is left as-is (already
    # correct).
    ("Epistatic QTLs_v3.0.xlsx", "Epistatic_nematode resistance"): [
        "S_No", "Species", "Cross", "Population/Germplasm", "Method", "Trait", "Parameter",
        "QTL 1", "Chromosome 1", "Position/Interval QTL1", "Associated Markers QTL1",
        "QTL 2", "Chromosome 2", "Position/Interval QTL2", "Associated Markers QTL2",
        "PVE/R2", "Candidate genes", "Link to reference", "Full Reference",
    ],
}


def apply_header_override(fname, shname, headers):
    override = SHEET_HEADER_OVERRIDE.get((fname, shname)) or HEADER_OVERRIDE.get(fname)
    if override is None:
        return headers
    # Preserve the original length (trailing/extra blank columns, if any)
    # rather than assuming the override list's length is exactly right.
    fixed = list(override)
    if len(fixed) < len(headers):
        fixed += headers[len(fixed):]
    return fixed[:len(headers)] if len(fixed) > len(headers) else fixed


# Epistatic QTLs_v3.0.xlsx :: Epistatic_yield mixes TWO unrelated row
# layouts in one sheet (different source papers pasted in over time, using
# different conventions), not a single consistent shift:
#   - "named-QTL" rows (e.g. col4="QTgw.cerz-1AS.1"): a Q-name matching
#     standard wheat QTL nomenclature (chromosome+arm suffix). These rows
#     have NO cross/population/method data; col4-11 hold QTL1's and QTL2's
#     name/chromosome/position/markers back to back (SHEET_HEADER_OVERRIDE
#     above handles these once split out).
#   - "cross-description" rows (majority, e.g. col4="TAM113 and Gallagher"):
#     a real cross description, and the ORIGINAL header is already correct
#     for these (col7's ad-hoc environment-code "QTL name", col8
#     chromosome, col9 position, col11 physical markers) - these only have
#     ONE locus's data in this sheet, not a QTL1/QTL2 pair, so QTL2 stays
#     empty for them; that's a real limitation of the source data, not a
#     bug to paper over.
# A single static header cannot describe both, so this sheet is split by
# row into two pseudo-sheets, each processed with the header that's
# actually correct for its rows.
EPISTATIC_YIELD_QTL_PATTERN = re.compile(r"-[1-7][ABD][LS]?(?:[._-]|$)", re.I)


def split_epistatic_yield(headers, body):
    named, cross_desc = [], []
    for row in body:
        v = str(row[4]) if len(row) > 4 and row[4] is not None else ""
        (named if EPISTATIC_YIELD_QTL_PATTERN.search(v) else cross_desc).append(row)
    return [
        ("Epistatic_yield [named-QTL rows]", headers, named),
        ("Epistatic_yield [cross-description rows]", headers, cross_desc),
    ]


def load_sheets(fpath):
    """Yield (sheet_name, headers, body) for .xlsx, .xls or .csv files."""
    fname = os.path.basename(fpath)
    _, ext = os.path.splitext(fpath)
    ext = ext.lower()
    if ext == ".csv":
        for enc in ("utf-8-sig", "latin-1"):
            try:
                with open(fpath, "r", encoding=enc, newline="", errors="replace") as f:
                    reader = csv.reader(f)
                    rows = list(reader)
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"  ERROR reading CSV {fname}: {e}")
                return
        headers, body = rows_from_list(rows)
        yield fname, apply_header_override(fname, fname, headers), body
        return
    if ext == ".xls":
        try:
            book = xlrd.open_workbook(fpath)
        except Exception as e:
            print(f"  ERROR opening .xls {fname}: {e}")
            return
        for sheet in book.sheets():
            rows = [sheet.row_values(r) for r in range(sheet.nrows)]
            headers, body = rows_from_list(rows)
            yield sheet.name, apply_header_override(fname, sheet.name, headers), body
        return
    # .xlsx
    try:
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
    except Exception as e:
        print(f"  ERROR opening workbook {fname}: {e}")
        return
    for shname in wb.sheetnames:
        ws = wb[shname]
        rows = list(ws.iter_rows(values_only=True))
        headers, body = rows_from_list(rows)
        if fname == "Epistatic QTLs_v3.0.xlsx" and shname == "Epistatic_yield":
            for sub_name, sub_headers, sub_body in split_epistatic_yield(headers, body):
                yield sub_name, apply_header_override(fname, sub_name, sub_headers), sub_body
            continue
        yield shname, apply_header_override(fname, shname, headers), body
    wb.close()

def rows_from_list(rows):
    if not rows:
        return [], []
    hdr_idx = 0
    for i, row in enumerate(rows):
        if sum(1 for c in row if c is not None and str(c).strip() != "") > 3:
            hdr_idx = i
            break
    if hdr_idx >= len(rows):
        return rows[0] if rows else [], []
    headers = [str(c).strip() if c is not None else "" for c in rows[hdr_idx]]
    body = rows[hdr_idx + 1:]
    return headers, body

def _norm_tokens(s):
    """Split a header string into normalized alphanumeric tokens."""
    return [t for t in re.split(r"[^a-z0-9]", str(s).lower()) if t]

def _singular_forms(tok):
    """Cheap pluralization-tolerant variants of a token (marker(s), gene(s),
    reference(s), cross(es), ...). Source headers mix singular and plural
    spellings of the same column across files, and a strict token-equality
    check silently fails to match the column at all when they differ - not
    a fuzzy-match risk worth worrying about here since these are short,
    closed candidate lists, not open-ended text."""
    forms = {tok}
    if tok.endswith("es") and len(tok) > 3:
        forms.add(tok[:-2])
    if tok.endswith("s") and len(tok) > 1:
        forms.add(tok[:-1])
    return forms

def _tokens_equal(t1, t2):
    return t1 == t2 or _singular_forms(t1) & _singular_forms(t2)

def _prefix_match(a, b):
    """Return True if one token list is a prefix of the other (pluralization-tolerant)."""
    if not a or not b:
        return False
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return all(_tokens_equal(x, y) for x, y in zip(shorter, longer))

def col_idx(headers, *candidates):
    """Return the index of the first matching candidate header (case-insensitive, token-wise prefix match)."""
    header_tokens = [_norm_tokens(h) for h in headers]
    for c in candidates:
        cand_tokens = _norm_tokens(c)
        for i, h in enumerate(header_tokens):
            if _prefix_match(cand_tokens, h):
                return i
    return None

def rows_from_sheet(ws):
    data = list(ws.iter_rows(values_only=True))
    # find header row (first row with >3 non-None cells)
    hdr_idx = 0
    for i, row in enumerate(data):
        if sum(1 for c in row if c is not None) > 3:
            hdr_idx = i
            break
    headers = [str(c).strip() if c else "" for c in data[hdr_idx]]
    body    = data[hdr_idx + 1:]
    return headers, body

def sheet_type(sheet_name, file_name=""):
    """Classify a sheet name into qtl / metaqtl / epistatic / skip."""
    n = sheet_name.lower().strip()
    fn = file_name.lower()

    def _tokens(s):
        return set(re.split(r"[^a-z0-9]+", s))

    fn_tokens = _tokens(fn)

    # sheet-name direct matches
    if any(k in n for k in ("eqtl", "epistatic", "epistasi")):
        return "epistatic"
    if any(k in n for k in ("meta", "mqtl", "m-qtl", "metaqtl")):
        return "metaqtl"

    # broad QTL match: named sheets with trait/disease/content keywords
    qtl_keywords = ("qtl", "gwas", "mta", "sheet1", "sheet 1",
                    "resistance", "toleran", "content", "disease",
                    "smut", "blotch", "blight", "rust", "mildew",
                    "zinc", "herbicide", "karnal", "salt", "yield",
                    "quality", "protein", "nematode", "bacterial",
                    "fungal", "spot", "loose", "kalpana")
    generic_sheets = {"sheet1", "control", "drought", "previous data and new data",
                      "common sheet", "physiological traits", "se content"}
    sheet_is_generic = n in generic_sheets

    if any(k in n for k in qtl_keywords) or sheet_is_generic:
        # use filename to disambiguate ambiguous sheet names
        if any(k in fn for k in ("metaqtl", "meta-qtl", "mqtl")) or \
           ("mqtl" in fn or "metaqtl" in fn):
            return "metaqtl"
        if "epistatic" in fn or "eqtl" in fn_tokens:
            return "epistatic"
        return "qtl"
    return "skip"

# ---------------------------------------------------------------------------
# per-table extraction
# ---------------------------------------------------------------------------

def extract_qtl(headers, body, source_file):
    records = []
    si  = col_idx(headers, "species")
    tri = col_idx(headers, "trait", "Trait")
    pai = col_idx(headers, "parameter", "paramete")
    cri = col_idx(headers, "cross")
    poi = col_idx(headers, "population", "germplasm")
    mei = col_idx(headers, "method")
    qni = col_idx(headers, "qtl name", "mta", "qtn", "qtl/mta", "qtl name/mta")
    chi = col_idx(headers, "chromosome", "chrom")
    psi = col_idx(headers, "position/interval")
    ami = col_idx(headers, "associated marker", "flanking marker")
    pvi = col_idx(headers, "pve", "r2")
    cgi = col_idx(headers, "candidate gene")
    rei = col_idx(headers, "reference", "full", "apa")
    doi = col_idx(headers, "link to reference", "url to reference", "doi", "link", "url")

    def g(row, i):
        return clean(row[i]) if i is not None and i < len(row) else ""

    for row in body:
        if all(c is None or str(c).strip() == "" for c in row):
            continue
        qtl_name = g(row, qni)
        if qtl_name and qtl_name.lower() in ("qtl name", "qtl name/mtas", "s_no", "s n"):
            continue
        chrom = g(row, chi)
        if not qtl_name and not chrom and not g(row, ami):
            continue
        records.append({
            "species":          normalize_species(g(row, si)),
            "trait":            g(row, tri),
            "parameter":        g(row, pai),
            "cross":            g(row, cri),
            "population":       g(row, poi),
            "method":           g(row, mei),
            "qtl_name":         qtl_name,
            "chromosome":       resolve_chromosome(chrom, qtl_name, g(row, ami)),
            "position_interval":g(row, psi),
            "associated_markers":g(row, ami),
            "pve":              g(row, pvi),
            "candidate_gene":   g(row, cgi),
            "reference":        g(row, rei),
            "doi":              g(row, doi),
            "source_file":      source_file,
        })
    return records

def extract_metaqtl(headers, body, source_file):
    records = []
    si  = col_idx(headers, "species")
    tri = col_idx(headers, "trait")
    pai = col_idx(headers, "parameter", "paramete")
    # Some MetaQTL sheets (correctly identified as MetaQTL by sheet name) are
    # laid out with the same generic locus-name header used by QTL sheets
    # ("QTL name/MTAs") rather than an MQTL-specific one -- fall back to the
    # QTL-style candidates so those rows aren't silently dropped.
    qni = col_idx(headers, "meta", "mqtl", "mqtl name", "metaqtl", "mQTL name",
                  "qtl name", "mta", "qtn", "qtl/mta", "qtl name/mta")
    chi = col_idx(headers, "chromosome", "chrom")
    psi = col_idx(headers, "position/interval")
    ami = col_idx(headers, "associated marker", "flanking")
    pvi = col_idx(headers, "pve", "r2")
    cgi = col_idx(headers, "candidate gene")
    rei = col_idx(headers, "reference", "full", "apa")
    doi = col_idx(headers, "link to reference", "url to reference", "doi", "link", "url")

    def g(row, i):
        return clean(row[i]) if i is not None and i < len(row) else ""

    for row in body:
        if all(c is None or str(c).strip() == "" for c in row):
            continue
        mqtl = g(row, qni)
        if not mqtl or mqtl.lower() in ("mqtl name", "metaqtl name", "s_no", "s n",
                                         "qtl name", "qtl name/mtas"):
            continue
        records.append({
            "species":           normalize_species(g(row, si)),
            "trait":             g(row, tri),
            "parameter":         g(row, pai),
            "mqtl_name":         mqtl,
            "chromosome":        resolve_chromosome(g(row, chi), mqtl, g(row, ami)),
            "position_interval": g(row, psi),
            "associated_markers":g(row, ami),
            "pve":               g(row, pvi),
            "candidate_gene":    g(row, cgi),
            "reference":         g(row, rei),
            "doi":               g(row, doi),
            "source_file":       source_file,
        })
    return records

def extract_epistatic(headers, body, source_file):
    records = []
    si   = col_idx(headers, "species")
    tri  = col_idx(headers, "trait")
    pai  = col_idx(headers, "parameter", "paramete")
    cri  = col_idx(headers, "cross")
    poi  = col_idx(headers, "population", "germplasm")
    mei  = col_idx(headers, "method")
    q1i  = col_idx(headers, "qtl1", "qtl 1", "qtl name", "epistatic")
    ch1i = col_idx(headers, "chromosome", "chromosome 1")
    ps1i = col_idx(headers, "position/interval qtl1", "position/interval", "position/interval in cm", "physical interval")
    am1i = col_idx(headers, "associated markers qtl1", "associated markers", "associated marker")
    q2i  = col_idx(headers, "qtl2", "qtl 2")
    ch2i = col_idx(headers, "chromosome 2")
    ps2i = col_idx(headers, "position/interval qtl2", "physical interval qtl2")
    am2i = col_idx(headers, "associated markers qtl2")
    ldi  = col_idx(headers, "lod")
    pvi  = col_idx(headers, "pve", "r2")
    rei  = col_idx(headers, "reference", "full", "apa")
    doi  = col_idx(headers, "link to reference", "doi", "link")

    def g(row, i):
        return clean(row[i]) if i is not None and i < len(row) else ""

    for row in body:
        if all(c is None or str(c).strip() == "" for c in row):
            continue
        q1 = g(row, q1i)
        if q1 and q1.lower() in ("qtl1", "qtl name", "s_no", "s n"):
            continue
        if not q1 and not g(row, ch1i) and not g(row, ps1i) and not g(row, am1i):
            continue
        q2 = g(row, q2i)
        markers1 = g(row, am1i)
        markers2 = g(row, am2i)
        chrom1 = resolve_chromosome(g(row, ch1i), q1, markers1)
        chrom2 = resolve_chromosome(g(row, ch2i), q2, markers2)
        if chrom2 == "Un" and chrom1 != "Un":
            # No chromosome recoverable for locus 2 at all; reported epistatic
            # pairs are very commonly intra-chromosomal (linked QTLs on one
            # linkage group), so assume the same chromosome as locus 1 rather
            # than discarding the interaction outright.
            chrom2 = chrom1
        records.append({
            "species":            normalize_species(g(row, si)),
            "trait":              g(row, tri),
            "parameter":          g(row, pai),
            "cross":              g(row, cri),
            "population":         g(row, poi),
            "method":             g(row, mei),
            "qtl1":               q1,
            "chromosome1":        chrom1,
            "position_interval1": g(row, ps1i),
            "markers1":           markers1,
            "qtl2":               q2,
            "chromosome2":        chrom2,
            "position_interval2": g(row, ps2i),
            "markers2":           markers2,
            "lod":                g(row, ldi),
            "pve":                g(row, pvi),
            "reference":          g(row, rei),
            "doi":                g(row, doi),
            "source_file":        source_file,
        })
    return records

# ---------------------------------------------------------------------------
# main loop
# ---------------------------------------------------------------------------

def write_csv(path, fieldnames, records):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(records)
    print(f"\nWrote {len(records)} rows -> {path}")

def main():
    all_qtl       = []
    all_metaqtl   = []
    all_epistatic = []

    # "Root traits_MQTL" (in MQTL_all traitsV3.0_final.xlsx) is a confirmed
    # 100%-redundant re-entry of loci already curated, with fuller annotation
    # (candidate genes), under "Morphological traits" elsewhere in the same
    # workbook - every one of its 94 rows shares chromosome+position+markers
    # with a row in another sheet of that file.
    # "Control" (in "Drought stress and drought control.xlsx") is the
    # well-watered/non-stressed condition sheet - excluded so this dataset
    # only contributes its actual drought-stress QTL records.
    skip_sheets = {"apa format references", "references", "list", "root traits_mqtl", "control"}

    # Sheet names like "Sheet1"/"Sheet2" are reused across many files with
    # unrelated content (e.g. N data_revised.xlsx's Sheet2 is real, needed
    # data), so exclusions scoped to a specific sheet NAME in a specific FILE
    # go here rather than in the global skip_sheets set above.
    # Nematode_Resistance.xlsx Sheet2 (181 rows, two other nematode-resistance
    # studies) is excluded per instruction, keeping only Sheet1.
    # N data_revised.xlsx: keep only Sheet2 per instruction, excluding Sheet1
    # (and Sheet3, already empty/junk).
    FILE_SHEET_SKIP = {
        "Nematode_Resistance.xlsx": {"sheet2"},
        "N data_revised.xlsx": {"sheet1"},
    }

    for fpath in collect_files():
        fname = os.path.basename(fpath)
        src = os.path.splitext(fname)[0]
        file_skip = FILE_SHEET_SKIP.get(fname, set())
        print(f"\nProcessing: {fname}")
        try:
            for shname, headers, body in load_sheets(fpath):
                if shname.lower().strip() in skip_sheets or shname.lower().strip() in file_skip:
                    continue
                stype = sheet_type(shname, fname)
                if stype == "skip":
                    stype = file_type_from_name(fname)
                if stype == "skip":
                    print(f"  skip sheet: {shname}")
                    continue
                if stype == "qtl":
                    recs = extract_qtl(headers, body, src)
                    all_qtl.extend(recs)
                    print(f"  QTL      {shname}: {len(recs)} records")
                elif stype == "metaqtl":
                    recs = extract_metaqtl(headers, body, src)
                    all_metaqtl.extend(recs)
                    print(f"  MetaQTL  {shname}: {len(recs)} records")
                elif stype == "epistatic":
                    recs = extract_epistatic(headers, body, src)
                    all_epistatic.extend(recs)
                    print(f"  Epistatic {shname}: {len(recs)} records")
        except Exception as e:
            print(f"  ERROR: {e}")

    def dedupe_exact(label, records):
        """Drop byte-for-byte duplicate records (every field identical), keeping
        the first occurrence. These are almost always copy-paste entry errors
        within a single source spreadsheet, not distinct QTL/MTA observations -
        unlike rows that merely share a marker/locus but differ in parameter,
        environment, or PVE, which are left untouched as legitimate separate
        associations."""
        seen = set()
        out = []
        for r in records:
            key = tuple(sorted(r.items()))
            if key in seen:
                continue
            seen.add(key)
            out.append(r)
        dropped = len(records) - len(out)
        if dropped:
            print(f"  {label}: dropped {dropped} exact-duplicate row(s) ({len(records)} -> {len(out)})")
        return out

    all_qtl = dedupe_exact("QTL", all_qtl)
    all_metaqtl = dedupe_exact("MetaQTL", all_metaqtl)
    all_epistatic = dedupe_exact("Epistatic", all_epistatic)

    # QTL
    qtl_fields = ["id","species","trait","parameter","cross","population","method",
                   "qtl_name","chromosome","position_interval","associated_markers",
                   "pve","candidate_gene","reference","doi","source_file"]
    for i, r in enumerate(all_qtl, 1):
        r["id"] = f"Q{i:05d}"
    write_csv(os.path.join(OUT, "qtl.csv"), qtl_fields, all_qtl)

    # MetaQTL
    mq_fields = ["id","species","trait","parameter","mqtl_name","chromosome",
                  "position_interval","associated_markers","pve","candidate_gene",
                  "reference","doi","source_file"]
    for i, r in enumerate(all_metaqtl, 1):
        r["id"] = f"M{i:05d}"
    write_csv(os.path.join(OUT, "metaqtl.csv"), mq_fields, all_metaqtl)

    # Epistatic
    ep_fields = ["id","species","trait","parameter","cross","population","method",
                 "qtl1","chromosome1","position_interval1","markers1",
                 "qtl2","chromosome2","position_interval2","markers2",
                 "lod","pve","reference","doi","source_file"]
    for i, r in enumerate(all_epistatic, 1):
        r["id"] = f"E{i:05d}"
    write_csv(os.path.join(OUT, "epistatic.csv"), ep_fields, all_epistatic)

    def _chr_summary(label, records, *chr_keys):
        total = len(records)
        un = sum(1 for r in records for k in chr_keys if r.get(k) == "Un")
        print(f"  {label}: {total} rows, {un} chromosome value(s) normalized to 'Un'")

    print("\nChromosome normalization summary (21 canonical codes + 'Un'):")
    _chr_summary("QTL", all_qtl, "chromosome")
    _chr_summary("MetaQTL", all_metaqtl, "chromosome")
    _chr_summary("Epistatic", all_epistatic, "chromosome1", "chromosome2")

    if _unmapped_species:
        print(f"\n{len(_unmapped_species)} species value(s) had no entry in SPECIES_MAP "
              "and were left as-is - add them to convert_datasets.py:SPECIES_MAP:")
        for s in sorted(_unmapped_species):
            print("  ", repr(s))

    print("\nDone.\n")

if __name__ == "__main__":
    main()
