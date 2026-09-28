"""
Content staging - sample batches for human review.

Produces two review CSVs (20 rows each) from real, licensable sources:
  - content/review_wordnet_sample.csv   (Open English WordNet 2023, CC BY 4.0)
  - content/review_vintage_sample.csv   (Webster's 1913, public domain)

Only samples entries that are clean by construction and pass the candidate quality gate.

Run:  python scripts/content/stage_samples.py
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from board_text import (
    ALLOWLIST_RE,
    DOMAIN_WORDS,
    alpha_count,
    char_count,
    clean_for_board,
    tier_for,
)
from term_registry import get_term_registry, TermRegistry, normalize_term

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content"
CONTENT.mkdir(exist_ok=True)
OUT_WORDNET = CONTENT / "review_wordnet_sample.csv"
OUT_VINTAGE = CONTENT / "review_vintage_sample.csv"
WEBSTERS = CONTENT / "_websters1913.json"

WORD_RE = re.compile(r"^[A-Za-z][A-Za-z' -]{2,58}$")
LOWER_WORD_RE = re.compile(r"^[a-z][a-z-]{3,59}$")

# Deictic / generic nouns that make useless puzzle answers.
GENERIC_STOP = {
    "here", "there", "where", "somewhere", "anywhere", "everywhere", "nowhere",
    "elsewhere", "somebody", "anybody", "everybody", "nobody", "something",
    "anything", "everything", "nothing", "thing", "things", "part", "parts",
    "area", "areas", "region", "regions", "place", "places", "object", "objects",
    "entity", "entities", "group", "groups", "person", "people", "time", "times",
}

RESIDUE_SUBSTRINGS = ["See ", "Illust.", "Note", "Cf.", "Syn.", "Obs."]
FORBIDDEN_SUBSTRINGS = ["Note", "Illust", "Landor", "Dryden", "Waller", "HSO", "AsO", " a The ", " b In "]

FIELDS = [
    "term", "definition", "raw_definition", "category", "proposed_difficulty",
    "alpha_count", "char_count", "source", "license", "confidence",
    "status", "notes",
]


def passes_quality_gate(raw_entry: str, cleaned_def: str) -> tuple[bool, str]:
    """Candidate quality gate.
    Ensures candidates are clean by construction before entering review samples.
    """
    # 1. Cleaned definition matches allowlist regex ^[A-Za-z .,'-]+$
    if not cleaned_def or not ALLOWLIST_RE.match(cleaned_def):
        return False, "allowlist_failed"

    # 2. No digits anywhere in the raw entry (structurally excludes chemical formulas and numbering)
    if any(ch.isdigit() for ch in raw_entry):
        return False, "digits_in_raw"

    # 3. alpha_count(cleaned) >= 40 so there is actual puzzle substance
    if alpha_count(cleaned_def) < 40:
        return False, "alpha_under_40"

    # 4. No residue of apparatus labels or citations
    for res in RESIDUE_SUBSTRINGS:
        if res in cleaned_def:
            return False, f"residue_{res.strip()}"

    for forbidden in FORBIDDEN_SUBSTRINGS:
        if forbidden in cleaned_def or forbidden in raw_entry:
            return False, f"forbidden_{forbidden.strip()}"

    # 5. No sentence in cleaned definition has fewer than 4 words
    sentences = [s.strip() for s in re.split(r"(?<=\.)\s+", cleaned_def) if s.strip()]
    if not sentences:
        return False, "empty_sentences"
    for s in sentences:
        words = [w for w in re.findall(r"\b[A-Za-z0-9'-]+\b", s) if any(c.isalnum() for c in w)]
        if len(words) < 4:
            return False, "sentence_under_4_words"

    # 6. Domain-label leak backstop: reject any candidate whose cleaned definition
    # begins with a known domain word followed by a lowercase word (or any domain word).
    m_domain = re.match(r"^([A-Za-z]+)\s+([a-z]+)", cleaned_def)
    if m_domain and m_domain.group(1).lower() in DOMAIN_WORDS:
        return False, f"domain_word_leak_{m_domain.group(1).lower()}"

    m_start = re.match(r"^([A-Za-z]+)\b", cleaned_def)
    if m_start and m_start.group(1).lower() in DOMAIN_WORDS:
        return False, f"starts_with_domain_{m_start.group(1).lower()}"

    # 7. No ", as, " in cleaned definition
    if ", as, " in cleaned_def:
        return False, "contains_as_example"

    return True, ""


def first_sense(text: str, min_alpha: int = 100, max_alpha: int = 210) -> str:
    """Reduce a Webster's entry to one concise sense."""
    text = re.split(r"\bSyn\.", text)[0]
    parts = [p.strip() for p in re.split(r"(?<=[.;])\s+", text) if p.strip()]
    out = ""
    for part in parts:
        candidate = f"{out} {part}".strip()
        if out and alpha_count(candidate) > max_alpha:
            break
        out = candidate
        if alpha_count(out) >= min_alpha:
            break
    if alpha_count(out) > max_alpha:
        words, acc = out.split(), ""
        for word in words:
            if alpha_count(f"{acc} {word}") > max_alpha:
                break
            acc = f"{acc} {word}".strip()
        out = acc
    return out.strip(" .;:")


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


# --------------------------------------------------------------------------- #
# Source 1: Open English WordNet 2023
# --------------------------------------------------------------------------- #
def stage_wordnet(limit: int = 20, registry: TermRegistry | None = None) -> tuple[list[dict], int, int]:
    if registry is None:
        registry = get_term_registry()
    import wn

    wnet = wn.Wordnet("oewn:2023")
    tier_buckets: dict[str, list[dict]] = {
        "Short": [], "Medium": [], "Long": [], "Epic": []
    }
    rejected_count = 0
    duplicate_count = 0
    seen_terms: set[str] = set()

    for syn in wnet.synsets(pos="n"):
        try:
            if syn.get_related("instance_hypernym"):
                continue
        except Exception:
            pass

        lemma = None
        for form in syn.lemmas():
            if WORD_RE.match(form) and len(form.split()) <= 2:
                lemma = form.lower()
                break
        if not lemma or len(lemma) > 40:
            continue
        if lemma in GENERIC_STOP or len(lemma) < 4:
            continue
        if lemma in seen_terms:
            continue

        # Check Global Term Registry ("never repeat a topic across subjects")
        is_dupe, dupe_reason = registry.check_duplicate(lemma, "lexicon")
        if is_dupe:
            rejected_count += 1
            duplicate_count += 1
            continue

        raw_gloss = syn.definition() or ""
        cleaned_gloss, _ = clean_for_board(raw_gloss, term=lemma)

        passed, reason = passes_quality_gate(raw_gloss, cleaned_gloss)
        if not passed:
            rejected_count += 1
            continue

        try:
            lexfile = syn.lexfile()
        except Exception:
            lexfile = "general"

        t = tier_for(cleaned_gloss)
        a_count = alpha_count(cleaned_gloss)
        c_count = char_count(cleaned_gloss)

        row_candidate = {
            "term": lemma,
            "definition": cleaned_gloss,
            "raw_definition": raw_gloss,
            "category": "lexicon",
            "proposed_difficulty": t,
            "alpha_count": a_count,
            "char_count": c_count,
            "source": "Open English WordNet 2023 (oewn:2023)",
            "license": "CC BY 4.0 - attribution required",
            "confidence": "review-length" if c_count > 240 else "high",
            "status": "",
            "notes": f"lexfile={lexfile}; verify the intended sense",
        }
        tier_buckets[t].append(row_candidate)
        seen_terms.add(lemma)

    # Balance 5 per tier across Short, Medium, Long, Epic for an even spread
    per_tier = limit // 4
    selected: list[dict] = []
    for t in ["Short", "Medium", "Long", "Epic"]:
        selected.extend(tier_buckets[t][:per_tier])

    for r in selected[:limit]:
        registry.register(r["term"], "lexicon")

    return selected[:limit], rejected_count, duplicate_count


# --------------------------------------------------------------------------- #
# Source 2: Webster's 1913 (public domain)
# --------------------------------------------------------------------------- #
def stage_vintage(limit: int = 20, registry: TermRegistry | None = None) -> tuple[list[dict], int, int]:
    if registry is None:
        registry = get_term_registry()
    if not WEBSTERS.exists():
        raise SystemExit(f"missing dataset: {WEBSTERS} (download it first)")
    data = json.loads(WEBSTERS.read_text(encoding="utf-8"))

    tier_buckets: dict[str, list[dict]] = {
        "Epic": [], "Long": [], "Medium": [], "Short": []
    }
    rejected_count = 0
    duplicate_count = 0
    seen_terms: set[str] = set()

    for term, definition in data.items():
        if not LOWER_WORD_RE.match(term):
            continue
        text = re.sub(r"\s+", " ", str(definition)).strip()
        raw_sense = first_sense(text)
        cleaned_text, _ = clean_for_board(raw_sense, term=term)

        passed, reason = passes_quality_gate(raw_sense, cleaned_text)
        if not passed:
            rejected_count += 1
            continue

        if any(bad in cleaned_text.lower() for bad in ("obsolete", "plural of", "see also")):
            continue
        if term in seen_terms:
            continue

        # Check Global Term Registry ("never repeat a topic across subjects")
        is_dupe, dupe_reason = registry.check_duplicate(term, "lexicon")
        if is_dupe:
            rejected_count += 1
            duplicate_count += 1
            continue

        t = tier_for(cleaned_text)
        a_count = alpha_count(cleaned_text)
        c_count = char_count(cleaned_text)

        row_candidate = {
            "term": term,
            "definition": cleaned_text,
            "raw_definition": raw_sense,
            "category": "lexicon",
            "proposed_difficulty": t,
            "alpha_count": a_count,
            "char_count": c_count,
            "source": "Webster's Unabridged Dictionary (1913)",
            "license": "Public domain",
            "confidence": "review-length" if c_count > 240 else "medium",
            "status": "",
            "notes": "vintage pack candidate; check tone + board length",
        }
        tier_buckets[t].append(row_candidate)
        seen_terms.add(term)

    # Balance 5 per tier across Epic, Long, Medium, Short (Epic first)
    per_tier = limit // 4
    selected: list[dict] = []
    for t in ["Epic", "Long", "Medium", "Short"]:
        selected.extend(tier_buckets[t][:per_tier])

    for r in selected[:limit]:
        registry.register(r["term"], "lexicon")

    return selected[:limit], rejected_count, duplicate_count


def main() -> None:
    registry = get_term_registry()
    wordnet_rows, wn_rejected, wn_dupes = stage_wordnet(20, registry=registry)
    write_csv(OUT_WORDNET, wordnet_rows)
    print(f"wordnet: {len(wordnet_rows)} rows -> {OUT_WORDNET} (gate rejected {wn_rejected} candidates, {wn_dupes} duplicate terms)")

    vintage_rows, vintage_rejected, vt_dupes = stage_vintage(20, registry=registry)
    write_csv(OUT_VINTAGE, vintage_rows)
    print(f"vintage: {len(vintage_rows)} rows -> {OUT_VINTAGE} (gate rejected {vintage_rejected} candidates, {vt_dupes} duplicate terms)")

    registry.save()

    # Final assertions: allowlist, categories, length, and forbidden substrings
    all_rows = wordnet_rows + vintage_rows
    for idx, r in enumerate(all_rows):
        d = r["definition"]
        assert ALLOWLIST_RE.match(d), (
            f"Row {idx} ({r['term']}) definition fails allowlist: {d!r}"
        )
        assert r["category"] == "lexicon", f"Row {idx} category is not 'lexicon'"
        assert alpha_count(d) >= 40, f"Row {idx} alpha count under 40: {d!r}"

    # Assert none of the forbidden substrings appear anywhere in either dataset
    for forbidden in FORBIDDEN_SUBSTRINGS:
        for idx, r in enumerate(all_rows):
            assert forbidden not in r["definition"], (
                f"Row {idx} ({r['term']}) definition contains forbidden {forbidden!r}"
            )
            assert forbidden not in r["raw_definition"], (
                f"Row {idx} ({r['term']}) raw_definition contains forbidden {forbidden!r}"
            )

    # Assert NO definition starts with any word from the domain list, and neither contains ", as, "
    for idx, r in enumerate(all_rows):
        d = r["definition"]
        assert ", as, " not in d, f"Row {idx} ({r['term']}) definition contains ', as, ': {d!r}"
        first_w = re.findall(r"\b[A-Za-z]+\b", d)
        if first_w:
            assert first_w[0].lower() not in DOMAIN_WORDS, (
                f"Row {idx} ({r['term']}) definition starts with domain word {first_w[0]!r}: {d!r}"
            )

    print(
        f"Assertion passed: all {len(all_rows)} definitions match "
        f"allowlist regex ^[A-Za-z .,'-]+$ with no exceptions and zero quality defects."
    )


if __name__ == "__main__":
    main()
