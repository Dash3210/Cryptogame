#!/usr/bin/env python3
"""
BrainCipher - Approved Content Importer

Collects approved dictionary/lexicon rows from review batches (content/review_*.csv),
validates all constraints, and appends them to QUOTE_DB.lexicon in src/data/quotes.ts.

Append-only invariant:
  src/services/quoteService.ts derives puzzle IDs from array indices (`lexicon-${index}`).
  Therefore, imports MUST strictly append to QUOTE_DB.lexicon and never reorder,
  insert, or rewrite existing entries.

Attribution & provenance:
  content/imported.json tracks all imported terms to prevent duplication.
  content/sources.json records source and license attribution per term
  (e.g., CC BY 4.0 requirement for WordNet).

Python 3.10 standard library only.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any, NamedTuple


# -----------------------------------------------------------------------------
# CONSTANTS & BOARD ALLOWLIST
# -----------------------------------------------------------------------------

# Board-safe puzzle text allowlist regex
# Note: Another agent owns scripts/content/board_text.py. Do NOT import board_text;
# keep this regex identical and in sync with scripts/content/board_text.py ALLOWLIST_RE.
ALLOWLIST_RE = re.compile(r"^[A-Za-z .,'-]+$")
ALPHA_RE = re.compile(r"[A-Za-z]")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_QUOTES_TS = REPO_ROOT / "src" / "data" / "quotes.ts"
DEFAULT_CONTENT_DIR = REPO_ROOT / "content"
DEFAULT_MANIFEST = DEFAULT_CONTENT_DIR / "imported.json"
DEFAULT_SOURCES = DEFAULT_CONTENT_DIR / "sources.json"


# -----------------------------------------------------------------------------
# DATA STRUCTURES
# -----------------------------------------------------------------------------

class ApprovedCandidate(NamedTuple):
    source_file: str
    row_number: int
    term: str
    definition: str
    category: str
    source: str
    license: str
    proposed_difficulty: str


# -----------------------------------------------------------------------------
# ATOMIC FILE I/O HELPERS
# -----------------------------------------------------------------------------

def atomic_write_text(path: Path, content: str) -> None:
    """Write content to path atomically via a temporary file in the same directory."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        newline="\n",
        dir=path.parent,
        delete=False,
        prefix=f".tmp_{path.name}_",
    )
    try:
        temp_file.write(content)
        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_file.close()
        os.replace(temp_file.name, path)
    except Exception:
        temp_file.close()
        if os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except OSError:
                pass
        raise


def atomic_write_json(path: Path, data: Any) -> None:
    """Serialize data to JSON and write atomically to path."""
    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    atomic_write_text(path, content)


def load_imported_manifest(path: Path) -> list[str]:
    """Load previously imported terms as an ordered list of strings."""
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return [str(item) for item in data]
            elif isinstance(data, dict):
                return [str(k) for k in data.keys()]
    except (json.JSONDecodeError, OSError):
        pass
    return []


def load_sources_data(path: Path) -> dict[str, dict[str, str]]:
    """Load sources attribution map: term -> {source, license}."""
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return {
                    str(k): {
                        "source": str(v.get("source", "")),
                        "license": str(v.get("license", "")),
                    }
                    for k, v in data.items()
                    if isinstance(v, dict)
                }
            elif isinstance(data, list):
                result: dict[str, dict[str, str]] = {}
                for item in data:
                    if isinstance(item, dict) and "term" in item:
                        result[str(item["term"])] = {
                            "source": str(item.get("source", "")),
                            "license": str(item.get("license", "")),
                        }
                return result
    except (json.JSONDecodeError, OSError):
        pass
    return {}


# -----------------------------------------------------------------------------
# ROW COLLECTION & VALIDATION
# -----------------------------------------------------------------------------

def collect_approved_rows(csv_paths: list[Path]) -> list[ApprovedCandidate]:
    """
    Read review CSV files and collect all rows where status == 'approved'.
    Uses encoding='utf-8-sig' to safely handle BOM from DictWriter.
    """
    candidates: list[ApprovedCandidate] = []
    for csv_path in csv_paths:
        if not csv_path.exists() or not csv_path.is_file():
            continue
        with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row_idx, row in enumerate(reader, start=2):  # Header is row 1
                status = (row.get("status") or "").strip().lower()
                if status == "approved":
                    candidates.append(
                        ApprovedCandidate(
                            source_file=csv_path.name,
                            row_number=row_idx,
                            term=(row.get("term") or "").strip(),
                            definition=(row.get("definition") or "").strip(),
                            category=(row.get("category") or "").strip(),
                            source=(row.get("source") or "").strip(),
                            license=(row.get("license") or "").strip(),
                            proposed_difficulty=(row.get("proposed_difficulty") or "").strip(),
                        )
                    )
    return candidates


def validate_candidates(
    candidates: list[ApprovedCandidate],
    existing_manifest: list[str],
) -> list[str]:
    """
    Validates all candidates against constraints:
      - category == 'lexicon'
      - term non-empty and <= 60 characters
      - definition non-empty and matches ^[A-Za-z .,'-]+$
      - alpha_count >= 40 (recomputed, not trusting CSV)
      - term not in imported manifest (duplicate guard)
      - term not duplicate within current batch

    Returns a list of human-readable error descriptions. Empty list means all valid.
    """
    errors: list[str] = []
    manifest_set = set(existing_manifest)
    batch_terms: set[str] = set()

    for cand in candidates:
        loc = f"{cand.source_file}:{cand.row_number}"

        # 1. Category check
        if cand.category != "lexicon":
            errors.append(
                f"[{loc}] Invalid category '{cand.category}'; expected 'lexicon'."
            )

        # 2. Term checks
        if not cand.term:
            errors.append(f"[{loc}] Term is empty.")
        elif len(cand.term) > 60:
            errors.append(
                f"[{loc}] Term '{cand.term}' exceeds 60 characters (length: {len(cand.term)})."
            )

        # 3. Definition checks (board-safe allowlist)
        if not cand.definition:
            errors.append(f"[{loc}] Definition is empty for term '{cand.term}'.")
        else:
            if not ALLOWLIST_RE.match(cand.definition):
                bad_chars = sorted(
                    list(set(c for c in cand.definition if not ALLOWLIST_RE.match(c)))
                )
                errors.append(
                    f"[{loc}] Definition for term '{cand.term}' contains illegal character(s) "
                    f"{bad_chars!r} outside allowlist ^[A-Za-z .,'-]+$."
                )

            # 4. Alpha count check (recalculated)
            alpha_cnt = len(ALPHA_RE.findall(cand.definition))
            if alpha_cnt < 40:
                errors.append(
                    f"[{loc}] Alpha count for term '{cand.term}' is {alpha_cnt}, "
                    f"below required minimum of 40."
                )

        # 5. Duplicate guard
        if cand.term:
            if cand.term in manifest_set:
                errors.append(
                    f"[{loc}] Term '{cand.term}' is already present in manifest of "
                    f"previously imported terms (content/imported.json)."
                )
            if cand.term in batch_terms:
                errors.append(
                    f"[{loc}] Duplicate term '{cand.term}' found within current import batch."
                )
            batch_terms.add(cand.term)

    return errors


# -----------------------------------------------------------------------------
# QUOTES.TS FORMATTING & INSERTION
# -----------------------------------------------------------------------------

def format_quote_entry(definition: str, term: str) -> str:
    """
    Formats a single LevelData entry for QUOTE_DB.
    Matches exact existing shape in src/data/quotes.ts:
      4 spaces indentation, double quotes, text and author, trailing comma.
    Note: proposed_difficulty is a length tier and is omitted from QUOTE_DB entries.
    """
    clean_def = definition.replace("\\", "\\\\").replace('"', '\\"')
    clean_term = term.replace("\\", "\\\\").replace('"', '\\"')
    return f'    {{ text: "{clean_def}", author: "{clean_term}" }},'


def append_to_quotes_ts(content: str, entry_lines: list[str]) -> str:
    """
    Appends formatted entry lines to the QUOTE_DB.lexicon array in quotes.ts.
    Maintains append-only invariant:
      - Never reorders existing elements.
      - Never modifies earlier entries (preserves array index stability).
      - Appends strictly before the closing bracket of `lexicon: [...]`.
      - Preserves indentation, comments, and line endings.
    """
    if not entry_lines:
        return content

    entries_block = "\n".join(entry_lines)

    # Case 1: Empty array `lexicon: []`
    m_empty = re.search(r"(\blexicon\s*:\s*\[)\s*(\])", content)
    if m_empty:
        line_start = content.rfind("\n", 0, m_empty.start())
        indent = content[line_start + 1 : m_empty.start()]
        return (
            content[: m_empty.start()]
            + "lexicon: [\n"
            + entries_block
            + "\n"
            + indent
            + "]"
            + content[m_empty.end() :]
        )

    # Case 2: Array with existing entries `lexicon: [ ... \n  ]`
    m_full = re.search(r"(\blexicon\s*:\s*\[[\s\S]*?)(\n\s*\])", content)
    if m_full:
        prefix = m_full.group(1)
        # Ensure previous line ends with comma if it did not have one
        if prefix.rstrip().endswith("}"):
            prefix = prefix.rstrip() + ","
        return (
            content[: m_full.start()]
            + prefix
            + "\n"
            + entries_block
            + m_full.group(2)
            + content[m_full.end() :]
        )

    raise ValueError("Could not find 'lexicon: [...]' array in quotes.ts")


# -----------------------------------------------------------------------------
# MAIN IMPORT ORCHESTRATOR
# -----------------------------------------------------------------------------

def run_import(
    quotes_path: Path = DEFAULT_QUOTES_TS,
    content_dir: Path = DEFAULT_CONTENT_DIR,
    manifest_path: Path = DEFAULT_MANIFEST,
    sources_path: Path = DEFAULT_SOURCES,
    single_file: str | None = None,
    dry_run: bool = False,
) -> int:
    """
    Main import pipeline:
      1. Discover review CSV(s)
      2. Collect approved rows
      3. Handle zero-row no-op
      4. Validate all rows (all-or-nothing)
      5. Dry-run output or atomic writes
    Returns exit code (0 on success, 1 on error).
    """
    # 1. Resolve CSV paths
    if single_file:
        single_path = Path(single_file)
        if not single_path.is_file():
            single_path = content_dir / single_file
        if not single_path.is_file():
            print(f"Error: Review CSV file not found: {single_file}", file=sys.stderr)
            return 1
        csv_paths = [single_path]
    else:
        csv_paths = sorted(content_dir.glob("review_*.csv"), key=lambda p: p.name)

    if not csv_paths:
        print(f"No review CSV files found in {content_dir}. Nothing to import.")
        return 0

    # 2. Collect approved rows
    candidates = collect_approved_rows(csv_paths)

    # 3. Handle zero approved rows cleanly
    if not candidates:
        print("0 approved rows found across review files. Clean no-op, nothing to import.")
        return 0

    # 4. Load manifest & validate all candidates
    manifest = load_imported_manifest(manifest_path)
    errors = validate_candidates(candidates, manifest)

    if errors:
        print(f"Validation failed with {len(errors)} error(s):", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        print("Import aborted. No changes were written.", file=sys.stderr)
        return 1

    # Format new TypeScript entries
    formatted_entries = [
        format_quote_entry(cand.definition, cand.term) for cand in candidates
    ]

    # 5. Handle Dry-Run
    if dry_run:
        print(
            f"[DRY RUN] All {len(candidates)} approved row(s) validated successfully."
        )
        print(
            f"[DRY RUN] Would append {len(formatted_entries)} entries to QUOTE_DB.lexicon in {quotes_path}:"
        )
        for entry in formatted_entries:
            print(entry)
        print(
            f"[DRY RUN] Would record {len(candidates)} term(s) in manifest: {manifest_path}"
        )
        print(
            f"[DRY RUN] Would record {len(candidates)} source attribution record(s) in: {sources_path}"
        )
        print("[DRY RUN] Clean dry-run complete. No files were modified.")
        return 0

    # 6. Atomic Write to quotes.ts
    if not quotes_path.exists():
        print(f"Error: Target quotes file does not exist: {quotes_path}", file=sys.stderr)
        return 1

    with open(quotes_path, "r", encoding="utf-8") as f:
        original_ts = f.read()

    new_ts = append_to_quotes_ts(original_ts, formatted_entries)
    atomic_write_text(quotes_path, new_ts)

    # 7. Atomic Write to Manifest (content/imported.json)
    manifest_terms = list(manifest)
    manifest_set = set(manifest)
    for cand in candidates:
        if cand.term not in manifest_set:
            manifest_terms.append(cand.term)
            manifest_set.add(cand.term)
    atomic_write_json(manifest_path, manifest_terms)

    # 8. Atomic Write to Sources (content/sources.json)
    sources_data = load_sources_data(sources_path)
    for cand in candidates:
        sources_data[cand.term] = {
            "source": cand.source,
            "license": cand.license,
        }
    atomic_write_json(sources_path, sources_data)

    print(
        f"Successfully imported {len(candidates)} approved row(s) into QUOTE_DB.lexicon."
    )
    print(f"  - Appended {len(candidates)} entries to {quotes_path}")
    print(f"  - Updated manifest {manifest_path} (total: {len(manifest_terms)} terms)")
    print(f"  - Updated attribution {sources_path} (total: {len(sources_data)} records)")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BrainCipher approved content importer (append-only)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print what would be appended without writing anything.",
    )
    parser.add_argument(
        "--file",
        dest="file_name",
        type=str,
        default=None,
        help="Limit import to a single review CSV file (path or filename).",
    )
    parser.add_argument(
        "--quotes-path",
        type=Path,
        default=DEFAULT_QUOTES_TS,
        help=f"Path to quotes.ts (default: {DEFAULT_QUOTES_TS})",
    )
    parser.add_argument(
        "--content-dir",
        type=Path,
        default=DEFAULT_CONTENT_DIR,
        help=f"Path to content directory (default: {DEFAULT_CONTENT_DIR})",
    )
    parser.add_argument(
        "--manifest-path",
        type=Path,
        default=DEFAULT_MANIFEST,
        help=f"Path to imported.json manifest (default: {DEFAULT_MANIFEST})",
    )
    parser.add_argument(
        "--sources-path",
        type=Path,
        default=DEFAULT_SOURCES,
        help=f"Path to sources.json attribution file (default: {DEFAULT_SOURCES})",
    )

    args = parser.parse_args()

    exit_code = run_import(
        quotes_path=args.quotes_path,
        content_dir=args.content_dir,
        manifest_path=args.manifest_path,
        sources_path=args.sources_path,
        single_file=args.file_name,
        dry_run=args.dry_run,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
