#!/usr/bin/env python3
"""
stage_openstax.py

Hardened glossary extractor for OpenStax College Physics (CC BY 4.0 only).
Includes machine-enforced licence gate, board_text normalisation (number-to-words),
junk rejection (equation-level math, artifact defects, formula-dominant, trivia stubs),
Physics chapter-to-branch mapping, and Global Term Registry deduplication.
Python standard library only.
"""

from __future__ import annotations

import argparse
import copy
import csv
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# Ensure local scripts/content/ directory is in sys.path for local imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from board_text import clean_for_board, tier_for, alpha_count, char_count
from term_registry import get_term_registry, normalize_term, TermRegistry

# Ensure UTF-8 stdout on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_URL = "https://github.com/openstax/osbooks-college-physics.git"
DEFAULT_BRANCH = "1e"
DEFAULT_TEMP_REPO = Path(r"C:\Users\user\AppData\Local\Temp\opencode\openstax\book")
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUTPUT_CSV = PROJECT_ROOT / "content" / "openstax" / "college_physics_terms.csv"
DEFAULT_REJECTED_PATH = PROJECT_ROOT / "content" / "openstax" / "rejected.jsonl"
DEFAULT_PHYSICS_BRANCHES = PROJECT_ROOT / "content" / "openstax" / "physics_branches.json"
DEFAULT_REGISTRY_PATH = PROJECT_ROOT / "content" / "term_registry.json"

# XML Namespaces
NS = {
    "col": "http://cnx.rice.edu/collxml",
    "md": "http://cnx.rice.edu/mdml",
    "m": "http://www.w3.org/1998/Math/MathML",
}

# Machine-enforced CC BY 4.0 Licence URLs
VALID_CC_BY_4_URLS = {
    "http://creativecommons.org/licenses/by/4.0/",
    "https://creativecommons.org/licenses/by/4.0/",
    "http://creativecommons.org/licenses/by/4.0",
    "https://creativecommons.org/licenses/by/4.0",
}

# Trivia stub pattern for SI units
SI_STUB_PATTERN = re.compile(r"(?i)\b(?:the\s+)?SI\s+unit\b.*?\babbreviated\b")

# Gap class patterns (dropped symbol leaving missing subject or variable run)
SYMBOL_GAP_WHERE_PATTERN = re.compile(r"(?i)\bwhere\s+(?:is|are|was|were)\b")
SYMBOL_GAP_RUN_PATTERN = re.compile(r"\b(?:[A-Za-z]\s+){3,}[A-Za-z]\b")
GAP_PATTERNS = [
    SYMBOL_GAP_WHERE_PATTERN,
    SYMBOL_GAP_RUN_PATTERN,
]

# 7 known mangled math terms to specifically verify and report
KNOWN_MANGLED_TARGETS = [
    "destructive interference for a single slit",
    "relativistic kinetic energy",
    "permeability of free space",
    "loop rule",
    "magnetic flux",
    "numerical aperture",
    "constructive interference for a diffraction grating",
]

# 2 dropped-symbol gap terms to specifically verify absence
DROPPED_SYMBOL_GAP_TARGETS = [
    "Stefan-Boltzmann law of radiation",
    "wavelength in a medium",
]


def clean_term(term_text: str) -> str:
    """Normalise term headword whitespace and curly quotes."""
    if not term_text:
        return ""
    for ch in ("\u2018", "\u2019", "\u201a", "\u201b", "`"):
        term_text = term_text.replace(ch, "'")
    for ch in ("\u201c", "\u201d", "\u201e", "\u201f"):
        term_text = term_text.replace(ch, "'")
    for ch in ("\u2013", "\u2014", "\u2015", "\u2212"):
        term_text = term_text.replace(ch, "-")
    return " ".join(term_text.split())


def extract_meaning_text(elem: ET.Element | None) -> str:
    """Extract raw text from a meaning element, ignoring MathML annotations
    and ensuring proper spacing across tag boundaries.
    """
    if elem is None:
        return ""
    m_copy = copy.deepcopy(elem)
    # Strip StarMath annotations embedded inside MathML semantics
    for ann in m_copy.findall(".//{*}annotation"):
        ann.text = ""
        for c in list(ann):
            ann.remove(c)

    pieces: list[str] = []

    def walk(node: ET.Element):
        if node.text:
            pieces.append(node.text)
        for child in node:
            child_tag = child.tag.split("}")[-1]
            if child_tag in ("math", "equation", "sub", "sup"):
                pieces.append(" ")
            walk(child)
            if child_tag in ("math", "equation", "sub", "sup"):
                pieces.append(" ")
            if child.tail:
                pieces.append(child.tail)

    walk(m_copy)
    return " ".join("".join(pieces).split())


def is_single_symbol(text: str) -> bool:
    """Check if the text represents a lone inline symbol (e.g. single variable 'm', 'c', 'λ', 'θ', 'B')."""
    t = text.strip()
    return len(t) == 1 and (t.isalpha() or ("\u0370" <= t <= "\u03ff"))


def is_equation_level_math(m_elem: ET.Element) -> tuple[bool, str]:
    """Check if a <math> element is equation-level:
    - has an equals sign or relational operator (=, <, >, ≤, ≥, ≠, ≈, ∝, ≡)
    - or relational/arithmetic operator alongside variables
    - or more than one symbol
    A single inline symbol (for example a lone wavelength lambda) may still be allowed.
    """
    text = "".join(m_elem.itertext()).strip()
    text_collapsed = re.sub(r"\s+", "", text)
    if not text_collapsed:
        return False, ""

    # Allow a single lone symbol (e.g. λ, θ, m, c, B, z)
    if is_single_symbol(text_collapsed):
        return False, ""

    # 1. Equals sign or relational operator
    if any(op in text_collapsed for op in ("=", "<", ">", "≤", "≥", "≠", "≈", "∝", "≡")):
        return True, f"equals_or_relational: {text_collapsed}"

    # 2. Arithmetic operator alongside variables
    # Operators: +, -, −, ×, *, /, ÷, ^, ⋅
    arith_ops = ("+", "-", "\u2212", "\u00d7", "*", "/", "\u00f7", "^", "\u22c5")
    has_arith = any(op in text_collapsed for op in arith_ops)
    has_var = bool(re.search(r"[A-Za-z\u0370-\u03ff]", text_collapsed))
    if has_arith and has_var:
        return True, f"arithmetic_with_variable: {text_collapsed}"

    # 3. More than one symbol
    symbols = re.findall(r"[A-Za-z\u0370-\u03ff]", text_collapsed)
    if len(symbols) > 1:
        return True, f"multiple_symbols: {text_collapsed}"

    # Complex expression with letters and numbers (e.g. '10-35m', '226Ra')
    if len(text_collapsed) > 1 and not text_collapsed.isdigit():
        return True, f"complex_math_element: {text_collapsed}"

    return False, ""


def has_formula_artifact(cleaned_def: str) -> tuple[bool, str]:
    """Detect formula artifacts on cleaned definition:
    - mangled series with comma-hyphen-comma (',-,')
    - internal lowercase-to-uppercase transition inside one token ([a-z][A-Z], e.g. 'fI', 'nT', 'aFnetm')
    - unvowelled token of length >= 4 (e.g. 'Fsrv', 'XLXC', 'ttvct', 'VsVpNsNp')
    - uppercase run followed by lowercase ([A-Z]{2,}[a-z], e.g. 'BAcos', 'NAnsin', 'KErelmc')
    """
    if ",-," in cleaned_def:
        return True, "contains_mangled_series_comma_hyphen_comma (',-,')"

    m_lu = re.search(r"\b\w*[a-z][A-Z]\w*\b", cleaned_def)
    if m_lu:
        return True, f"lowercase_to_uppercase_transition: '{m_lu.group(0)}'"

    tokens = re.findall(r"\b[A-Za-z]+\b", cleaned_def)
    for tok in tokens:
        if len(tok) >= 4 and not re.search(r"[aeiouyAEIOUY]", tok):
            return True, f"unvowelled_token_len_{len(tok)}: '{tok}'"

    m_ul = re.search(r"\b\w*[A-Z]{2,}[a-z]\w*\b", cleaned_def)
    if m_ul:
        return True, f"uppercase_run_followed_by_lowercase: '{m_ul.group(0)}'"

    return False, ""


COLLAPSE_PATTERNS = [
    ("one_X_one_Y_collapse", re.compile(r"\bone\s+\S+\s+one\s+\S+", re.I)),
    ("spelled_power_of_ten", re.compile(
        r"\bten\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|to)\b", re.I)),
    ("spaced_single_letter_run", re.compile(r"\b[A-Za-z]\s+[A-Za-z]\s+[A-Za-z]\b")),
    ("lone_capital_then_token", re.compile(r"\b[A-Z]\s+[A-Z][a-z]{0,2}\b")),
    ("adjacent_capitals", re.compile(r"\b[A-Z]\s+[A-Z]\b")),
]


def has_formula_collapse(cleaned_def: str) -> tuple[bool, str]:
    """Detect a COLLAPSED inline formula on the cleaned definition.

    Symbols are stripped before this point, so an equation collapses into spaced
    single letters and spelled-out numbers, for example:
      "W SI unit of power, with one W one Js."            (from 1 W = 1 J/s)
      "A unit of volume, equal to ten three m three."     (from 10^3 cm^3)
      "expressed as V V zero sin ft"                       (from V = V0 sin(2*pi*f*t))
    Tuned against the 752-row batch: 16 caught, 16 true positives, 0 false positives.
    """
    for name, pattern in COLLAPSE_PATTERNS:
        m = pattern.search(cleaned_def)
        if m:
            return True, f"{name}: '{m.group(0)}'"
    return False, ""


# Alias for backward compatibility
has_artifact_defect = has_formula_artifact


def has_symbol_gap(cleaned_def: str) -> tuple[bool, str]:
    """Detect ungrammatical gap caused by a stripped inline math symbol:
    1. A relative clause whose subject was stripped: 'where is', 'where are',
       'where was', 'where were' with no token between the relative pronoun and the verb.
       (Legitimate phrasing has a subject token, e.g. 'where lambda is the constant'.)
    2. Runs of isolated single letters (e.g. 'Q t e A T four').
    """
    reasons: list[str] = []
    m_where = SYMBOL_GAP_WHERE_PATTERN.search(cleaned_def)
    if m_where:
        reasons.append(f"missing_subject_relative_clause: '{m_where.group(0)}'")

    m_run = SYMBOL_GAP_RUN_PATTERN.search(cleaned_def)
    if m_run:
        reasons.append(f"isolated_single_letter_run: '{m_run.group(0)}'")

    if reasons:
        return True, "; ".join(reasons)
    return False, ""


# Backward compatibility alias
check_gap_class = has_symbol_gap


def is_formula_dominant(
    d_elem: ET.Element, raw_text: str, cleaned_text: str, words: list[str], real_words: list[str]
) -> bool:
    """Determine if definition is formula-dominant with no real sentence structure,
    or has fewer than 4 real words.
    """
    if len(real_words) < 4:
        return True

    has_math = d_elem.find(".//{*}math") is not None
    if not has_math:
        return False

    single_chars = [w for w in words if len(w) == 1 and w.lower() not in ("a", "i")]
    # High ratio of isolated variable characters
    if len(single_chars) >= 3 and len(single_chars) / max(len(words), 1) >= 0.25:
        return True

    # Raw definition starts directly with an equation and lacks substantial explanatory text
    if re.match(r"^(?:is\s+)?[A-Za-z0-9_Δ\s]+\s*=", raw_text.strip()) and len(real_words) < 15:
        return True

    # Formulas producing unnatural variable concatenation fragments
    jumble_tokens = [
        w for w in words
        if re.search(r"[a-z][A-Z]|[A-Z]{2,}[a-z]", w)
        or (len(w) >= 3 and not re.search(r"[aeiouyAEIOUY]", w))
    ]
    if jumble_tokens and len(real_words) < 12:
        return True

    return False


def is_trivia_stub(raw_text: str, cleaned_text: str, real_words: list[str]) -> bool:
    """Determine if definition is a trivial SI unit stub or under 6 words."""
    if SI_STUB_PATTERN.search(cleaned_text) or SI_STUB_PATTERN.search(raw_text):
        return True
    if len(real_words) < 6:
        return True
    return False


def load_physics_branches(path: Path = DEFAULT_PHYSICS_BRANCHES) -> dict[str, str]:
    """Load chapter_index -> branch id mapping from physics_branches.json."""
    if not path.exists():
        raise FileNotFoundError(f"Missing physics branches mapping at {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {str(k): str(v) for k, v in data.items()}


def ensure_repo_cloned(repo_path: Path, branch: str = DEFAULT_BRANCH) -> None:
    """Check if repository exists and is on the requested branch;
    otherwise clone shallow sparse checkout or switch branch.
    """
    if (repo_path / ".git").exists():
        res = subprocess.run(
            ["git", "-C", str(repo_path), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
        )
        curr_branch = res.stdout.strip()
        if curr_branch != branch:
            print(f"Switching repository at {repo_path} from branch '{curr_branch}' to '{branch}'...")
            subprocess.run(
                ["git", "-C", str(repo_path), "remote", "set-branches", "origin", "*"],
                check=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_path), "fetch", "--depth", "1", "origin", branch],
                check=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_path), "checkout", branch],
                check=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_path), "sparse-checkout", "set", "collections", "modules"],
                check=True,
            )
        return

    print(f"Repository not found at {repo_path}. Cloning branch '{branch}' (shallow, sparse)...")
    repo_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            branch,
            "--filter=blob:none",
            "--sparse",
            REPO_URL,
            str(repo_path),
        ],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(repo_path), "sparse-checkout", "set", "collections", "modules"],
        check=True,
    )


def resolve_collection_xml(repo_path: Path) -> Path:
    """Resolve the book collection XML file inside collections/."""
    col_dir = repo_path / "collections"
    if not col_dir.is_dir():
        raise FileNotFoundError(f"Collections directory missing at: {col_dir}")

    for filename in ("college-physics.collection.xml", "college-physics-2e.collection.xml"):
        target = col_dir / filename
        if target.is_file():
            return target

    xml_files = sorted(col_dir.glob("*.collection.xml"))
    if not xml_files:
        raise FileNotFoundError(f"No .collection.xml file found in {col_dir}")
    return xml_files[0]


def enforce_licence_gate(col_path: Path, branch: str) -> tuple[str, str, str]:
    """Parse collection XML, extract book title and licence, and REFUSE to proceed
    unless the licence URL is strictly CC BY 4.0.
    """
    tree = ET.parse(col_path)
    root = tree.getroot()

    title_elem = root.find(".//{*}title")
    book_title = title_elem.text.strip() if title_elem is not None and title_elem.text else "OpenStax Book"

    lic_elem = root.find(".//{*}license")
    lic_url = lic_elem.attrib.get("url", "").strip() if lic_elem is not None else ""
    lic_name = lic_elem.text.strip() if lic_elem is not None and lic_elem.text else ""

    if lic_elem is None or not lic_url or lic_url.rstrip("/") not in {
        "http://creativecommons.org/licenses/by/4.0",
        "https://creativecommons.org/licenses/by/4.0",
    }:
        lic_desc = f"{lic_name} ({lic_url})" if lic_url else (lic_name or "Missing/empty licence")
        print("=" * 70, file=sys.stderr)
        print("LICENCE GATE VIOLATION - EXECUTION REFUSED", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print(f"Branch requested:  '{branch}'", file=sys.stderr)
        print(f"Collection file:   {col_path.name}", file=sys.stderr)
        print(f"Book title:        '{book_title}'", file=sys.stderr)
        print(f"Licence found:     '{lic_desc}'", file=sys.stderr)
        print("-" * 70, file=sys.stderr)
        print("Non-commercial or restrictive licences are NOT permitted.", file=sys.stderr)
        print("Only CC BY 4.0 is allowed.", file=sys.stderr)
        print("Aborting extraction with non-zero exit code.", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        sys.exit(1)

    print("=" * 70)
    print("LICENCE GATE VERIFIED (CC BY 4.0)")
    print("=" * 70)
    print(f"Resolved branch:  {branch}")
    print(f"Book title:       {book_title}")
    print(f"Resolved licence: {lic_name} ({lic_url})")
    print("=" * 70)

    return book_title, lic_name, lic_url


def extract_openstax_terms(
    repo_path: Path,
    output_csv: Path,
    rejected_path: Path = DEFAULT_REJECTED_PATH,
    physics_branches_path: Path = DEFAULT_PHYSICS_BRANCHES,
    registry_path: Path = DEFAULT_REGISTRY_PATH,
    branch: str = DEFAULT_BRANCH,
    update_registry: bool = False,
) -> tuple[list[dict[str, str | int]], dict[str, int], dict[str, int], list[tuple[str, str, str]]]:
    """Parse collection.xml spine and module cnxml files into CSV candidate rows,
    applying licence verification, number-to-words normalisation, calibrated formula artifact rejection,
    Physics branch mapping, and Global Term Registry deduplication. Logs all rejections to JSONL.
    """
    col_path = resolve_collection_xml(repo_path)
    book_title, lic_name, lic_url = enforce_licence_gate(col_path, branch)

    # Load Physics branch mapping (34 chapters -> 9 branches)
    branches_map = load_physics_branches(physics_branches_path)

    # Initialize Global Term Registry: seeded from canonical QUOTE_DB and review samples
    registry = get_term_registry(registry_path)
    # Exclude terms in branches currently being staged so re-runs do not self-duplicate
    staged_branches = set(branches_map.values())
    registry._registry = {
        k: v for k, v in registry._registry.items() if v not in staged_branches
    }
    # Ensure baseline quotes and samples are present in registry
    registry.seed_from_quotes_ts()
    registry.seed_from_csv(PROJECT_ROOT / "content" / "review_wordnet_sample.csv", "category")
    registry.seed_from_csv(PROJECT_ROOT / "content" / "review_vintage_sample.csv", "category")

    tree = ET.parse(col_path)
    root = tree.getroot()

    subcollections = root.findall(".//col:subcollection", NS)
    if not subcollections:
        subcollections = root.findall(".//{*}subcollection")

    rows: list[dict[str, str | int]] = []
    rejections: list[dict[str, str]] = []
    tiers_dist: dict[str, int] = {"Short": 0, "Medium": 0, "Long": 0, "Epic": 0}
    rejection_counts: dict[str, int] = {
        "total_extracted": 0,
        "formula_dominant": 0,
        "trivia_stub": 0,
        "formula_artifact": 0,
        "formula_collapse": 0,
        "symbol_gap": 0,
        "duplicate_cross_branch": 0,
        "duplicate_intra_branch": 0,
        "total_rejected": 0,
    }
    gap_class_reported: list[tuple[str, str, str]] = []

    for ch_idx, sc in enumerate(subcollections, start=1):
        branch_id = branches_map.get(str(ch_idx), "physics")
        title_elem = sc.find("md:title", NS)
        if title_elem is None:
            title_elem = sc.find("{*}title")
        chapter_title = title_elem.text.strip() if title_elem is not None and title_elem.text else f"Chapter {ch_idx}"

        modules = sc.findall(".//col:module", NS)
        if not modules:
            modules = sc.findall(".//{*}module")

        order_in_chapter = 0

        for m_elem in modules:
            doc_id = m_elem.attrib.get("document")
            if not doc_id:
                continue

            cnxml_path = repo_path / "modules" / doc_id / "index.cnxml"
            if not cnxml_path.exists():
                continue

            try:
                mod_tree = ET.parse(cnxml_path)
            except Exception as e:
                print(f"Warning: Failed to parse {cnxml_path}: {e}", file=sys.stderr)
                continue

            for g in mod_tree.findall(".//{*}glossary"):
                for d in g.findall(".//{*}definition"):
                    t_elem = d.find("{*}term")
                    raw_term = "".join(t_elem.itertext()).strip() if t_elem is not None else ""
                    term = clean_term(raw_term)
                    if not term:
                        continue

                    meaning = d.find("{*}meaning")
                    raw_def = extract_meaning_text(meaning)
                    board_def, warns = clean_for_board(raw_def, term=term)

                    rejection_counts["total_extracted"] += 1
                    words = re.findall(r"\b[A-Za-z]+\b", board_def)
                    real_words = [w for w in words if len(w) > 1 or w.lower() in ("a", "i")]

                    # Rule 1: Formula/math-dominant (structureless or < 4 real words)
                    if is_formula_dominant(d, raw_def, board_def, words, real_words):
                        rejection_counts["formula_dominant"] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": "formula_dominant",
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                        })
                        continue

                    # Rule 2: Trivia stubs (SI units, < 6 words)
                    if is_trivia_stub(raw_def, board_def, real_words):
                        rejection_counts["trivia_stub"] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": "trivia_stub",
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                        })
                        continue

                    # Rule 3: Calibrated formula artifact on cleaned definition
                    # Replaces indiscriminate raw MathML rejection with evidence-based artifact gate
                    has_art, art_reason = has_formula_artifact(board_def)
                    if has_art:
                        rejection_counts["formula_artifact"] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": "formula_artifact",
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                            "detail": art_reason,
                        })
                        continue

                    # Rule 3b: Collapsed inline formula (spaced single letters, spelled-out powers)
                    has_collapse, collapse_reason = has_formula_collapse(board_def)
                    if has_collapse:
                        rejection_counts["formula_collapse"] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": "formula_collapse",
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                            "detail": collapse_reason,
                        })
                        continue

                    # Rule 4: Dropped-symbol gap (missing subject in relative clause, single letter runs)
                    has_gap, gap_reason = has_symbol_gap(board_def)
                    if has_gap:
                        rejection_counts["symbol_gap"] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": "symbol_gap",
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                            "detail": gap_reason,
                        })
                        continue

                    # Rule 5: Global Term Registry deduplication ("never repeat a topic across subjects")
                    is_dupe, dupe_reason = registry.check_duplicate(term, branch_id)
                    if is_dupe:
                        tag = "duplicate_cross_branch" if "CROSS-BRANCH" in dupe_reason else "duplicate_intra_branch"
                        rejection_counts[tag] += 1
                        rejection_counts["total_rejected"] += 1
                        rejections.append({
                            "term": term,
                            "chapter": chapter_title,
                            "reason": tag,
                            "raw_definition": raw_def,
                            "cleaned_definition": board_def,
                            "detail": dupe_reason,
                        })
                        continue

                    # Check and track any remaining gap class instances surviving in accepted pool
                    has_surviving_gap, gap_snippet = check_gap_class(board_def)
                    if has_surviving_gap:
                        gap_class_reported.append((term, gap_snippet, board_def))

                    # Valid candidate! Register into Global Term Registry
                    registry.register(term, branch_id)

                    ac = alpha_count(board_def)
                    cc = char_count(board_def)
                    tier = tier_for(board_def)
                    tiers_dist[tier] += 1
                    order_in_chapter += 1

                    row: dict[str, str | int] = {
                        "track": "physics",
                        "branch": branch_id,
                        "unit": "",
                        "stage": "school",
                        "chapter": chapter_title,
                        "chapter_index": ch_idx,
                        "order_in_chapter": order_in_chapter,
                        "term": term,
                        "definition": board_def,
                        "raw_definition": raw_def,
                        "alpha_count": ac,
                        "char_count": cc,
                        "proposed_difficulty": tier,
                        "source": book_title,
                        "license": "CC BY 4.0",
                        "status": "",
                        "notes": f"module: {doc_id}",
                    }
                    rows.append(row)

    # Write rejected candidates to JSONL (no silent drops)
    rejected_path.parent.mkdir(parents=True, exist_ok=True)
    with open(rejected_path, "w", encoding="utf-8") as f:
        for rej in rejections:
            f.write(json.dumps(rej, ensure_ascii=False) + "\n")

    # Persist updated term registry atomically if requested
    if update_registry:
        registry.save()
    else:
        print("[Registry Notice] content/term_registry.json left untouched on disk (pass --update-registry to overwrite)")

    # Ensure output directory exists
    output_csv.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "track",
        "branch",
        "unit",
        "stage",
        "chapter",
        "chapter_index",
        "order_in_chapter",
        "term",
        "definition",
        "raw_definition",
        "alpha_count",
        "char_count",
        "proposed_difficulty",
        "source",
        "license",
        "status",
        "notes",
    ]

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return rows, tiers_dist, rejection_counts, gap_class_reported


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract glossary terms from OpenStax College Physics into review CSV."
    )
    parser.add_argument(
        "--branch",
        type=str,
        default=DEFAULT_BRANCH,
        help=f"Git branch/edition to extract (default: {DEFAULT_BRANCH})",
    )
    parser.add_argument(
        "--repo-path",
        type=Path,
        default=DEFAULT_TEMP_REPO,
        help="Path to cloned openstax repository",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_CSV,
        help="Target CSV output path",
    )
    parser.add_argument(
        "--rejected",
        type=Path,
        default=DEFAULT_REJECTED_PATH,
        help=f"Target JSONL path for logged rejections (default: {DEFAULT_REJECTED_PATH})",
    )
    parser.add_argument(
        "--physics-branches",
        type=Path,
        default=DEFAULT_PHYSICS_BRANCHES,
        help=f"Path to physics_branches.json (default: {DEFAULT_PHYSICS_BRANCHES})",
    )
    parser.add_argument(
        "--registry-path",
        type=Path,
        default=DEFAULT_REGISTRY_PATH,
        help=f"Path to term_registry.json (default: {DEFAULT_REGISTRY_PATH})",
    )
    parser.add_argument(
        "--update-registry",
        action="store_true",
        help="Persist staged terms to term_registry.json (default: leave registry file untouched)",
    )
    args = parser.parse_args()

    ensure_repo_cloned(args.repo_path, branch=args.branch)
    rows, tiers_dist, rejection_counts, gap_class_reported = extract_openstax_terms(
        args.repo_path,
        args.output,
        rejected_path=args.rejected,
        physics_branches_path=args.physics_branches,
        registry_path=args.registry_path,
        branch=args.branch,
        update_registry=args.update_registry,
    )

    total_accepted = len(rows)
    chapters_covered = len(set(r["chapter_index"] for r in rows))
    branches_covered = len(set(r["branch"] for r in rows))

    print("\n" + "=" * 70)
    print("OPENSTAX EXTRACTION & REJECTION REPORT")
    print("=" * 70)
    print(f"Output CSV:                      {args.output}")
    print(f"Rejected logging file:           {args.rejected}")
    print(f"Total raw terms scanned:         {rejection_counts['total_extracted']}")
    print(f"Total rejected candidates:       {rejection_counts['total_rejected']}")
    print(f"Accepted candidate terms:        {total_accepted}")
    print(f"Chapters covered:                {chapters_covered} / 34")
    print(f"Curriculum branches covered:     {branches_covered} / 9")

    print("\n" + "-" * 70)
    print("REJECTION SUMMARY GROUPED BY REASON TAG")
    print("-" * 70)
    for tag in ("formula_dominant", "trivia_stub", "formula_artifact", "formula_collapse", "symbol_gap", "duplicate_cross_branch", "duplicate_intra_branch"):
        cnt = rejection_counts.get(tag, 0)
        pct = (cnt / rejection_counts["total_rejected"] * 100) if rejection_counts["total_rejected"] else 0.0
        print(f"  {tag:30s}: {cnt:4d} ({pct:5.1f}%)")

    print("\n" + "-" * 70)
    print("BRANCH DISTRIBUTION (Accepted Terms Per Curriculum Branch)")
    print("-" * 70)
    by_branch: dict[str, int] = {}
    for r in rows:
        b = str(r["branch"])
        by_branch[b] = by_branch.get(b, 0) + 1
    for b_id, b_count in sorted(by_branch.items()):
        pct = (b_count / total_accepted * 100) if total_accepted else 0.0
        print(f"  {b_id:28s}: {b_count:4d} ({pct:5.1f}%)")

    print("\n" + "-" * 70)
    print("PROPOSED DIFFICULTY TIER DISTRIBUTION")
    print("-" * 70)
    for tier in ("Short", "Medium", "Long", "Epic"):
        count = tiers_dist[tier]
        pct = (count / total_accepted * 100) if total_accepted else 0.0
        print(f"  {tier:7s}: {count:4d} ({pct:5.1f}%)")

    print("\n" + "-" * 70)
    print(f"GAP CLASS AUDIT ({len(gap_class_reported)} milder instance(s) detected surviving in accepted pool)")
    print("-" * 70)
    for term, snippet, defn in gap_class_reported:
        print(f"  [{term}]: snippet '{snippet}' -> {defn}")

    print("\n" + "-" * 70)
    print("VERIFICATION OF 7 KNOWN MANGLED-MATH TERMS (Must ALL be absent)")
    print("-" * 70)
    accepted_norm = {normalize_term(str(r["term"])): r["term"] for r in rows}
    all_absent = True
    for target in KNOWN_MANGLED_TARGETS:
        norm_t = normalize_term(target)
        present = norm_t in accepted_norm
        status_str = "PRESENT (FAIL)" if present else "ABSENT (PASS)"
        if present:
            all_absent = False
        print(f"  {target:52s} : {status_str}")
    print(f"All 7 known mangled-math rows eliminated: {all_absent}")
    assert all_absent, "Error: One or more known mangled math terms were not eliminated!"

    print("\n" + "-" * 70)
    print("VERIFICATION OF 2 DROPPED-SYMBOL GAP TERMS (Must ALL be absent)")
    print("-" * 70)
    gaps_absent = True
    for target in DROPPED_SYMBOL_GAP_TARGETS:
        norm_t = normalize_term(target)
        present = norm_t in accepted_norm
        status_str = "PRESENT (FAIL)" if present else "ABSENT (PASS)"
        if present:
            gaps_absent = False
        print(f"  {target:52s} : {status_str}")
    print(f"All 2 dropped-symbol gap rows eliminated: {gaps_absent}")
    assert gaps_absent, "Error: One or more dropped-symbol gap terms were not eliminated!"


if __name__ == "__main__":
    main()
