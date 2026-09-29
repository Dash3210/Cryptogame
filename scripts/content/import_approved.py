#!/usr/bin/env python3
"""
BrainCipher - Approved Content Importer

Collects approved rows from review batches (content/review_*.csv), validates all
constraints, checks global term ownership against the Term Registry, and appends
them to the appropriate branch array in QUOTE_DB in src/data/quotes.ts.

Puzzle ID Scheme & Append-only Invariant:
  src/services/quoteService.ts derives puzzle IDs deterministically from entry content
  via getLevelId (`${branch}-${slug(entry.author)}`), with collision counters for
  identical slugs.
  Therefore, puzzle IDs are content-derived, not index-derived.
  However, append-only ordering is still mandatory because curriculum progression,
  saved progress (isBranchComplete, getBranchProgress, getNextQuote), and player
  journey depend strictly on array order. Imports MUST append to the target branch
  array and never reorder, insert, or rewrite existing entries.

Branch Validation & Term Registry:
  A row's branch is resolved from its 'branch' column (if present and non-empty),
  falling back to 'category'. It must match a registered branch from BRANCHES in
  src/data/quotes.ts or content/openstax/physics_branches.json.
  The global Term Registry (content/term_registry.json) enforces the invariant that
  every term has at most one owner branch. An approved row whose normalised term is
  owned by a different branch is rejected as a duplicate. Rows already in the manifest
  for the same branch are skipped without duplication.

Attribution & Provenance:
  content/imported.json tracks all imported terms to prevent duplication.
  content/sources.json records source and license attribution per term
  (e.g., CC BY 4.0 requirement for OpenStax and WordNet).

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
import time
from typing import Any, NamedTuple

# Ensure local scripts/content/ directory is in sys.path for local imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from term_registry import get_term_registry, normalize_term, TermRegistry


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
DEFAULT_REGISTRY = DEFAULT_CONTENT_DIR / "term_registry.json"
DEFAULT_PHYSICS_BRANCHES = DEFAULT_CONTENT_DIR / "openstax" / "physics_branches.json"


# -----------------------------------------------------------------------------
# DATA STRUCTURES
# -----------------------------------------------------------------------------

class ApprovedCandidate(NamedTuple):
    source_file: str
    row_number: int
    term: str
    definition: str
    branch: str
    category: str
    source: str
    license: str
    proposed_difficulty: str


class ValidationResult(NamedTuple):
    errors: list[str]
    to_import: list[ApprovedCandidate]
    skipped: list[ApprovedCandidate]


# -----------------------------------------------------------------------------
# ATOMIC FILE I/O HELPERS
# -----------------------------------------------------------------------------

def read_text_with_retry(path: Path, max_attempts: int = 3, delay: float = 0.1) -> str:
    """Read a text file with retry logic to tolerate concurrent writers."""
    for attempt in range(max_attempts):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError:
            if attempt == max_attempts - 1:
                raise
            time.sleep(delay)
    return ""


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
        content = read_text_with_retry(path)
        data = json.loads(content)
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
        content = read_text_with_retry(path)
        data = json.loads(content)
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


def load_valid_branches(quotes_path: Path, physics_branches_path: Path | None = None) -> set[str]:
    """
    Load registered branch IDs from:
      1. BRANCHES in quotes.ts
      2. physics_branches.json (if present)
    """
    valid: set[str] = set()

    if quotes_path.exists():
        try:
            content = read_text_with_retry(quotes_path)
            m = re.search(r"export const BRANCHES:\s*Branch\[\]\s*=\s*\[([\s\S]*?)\];", content)
            if m:
                for b_id in re.findall(r"id:\s*['\"]([a-zA-Z0-9_-]+)['\"]", m.group(1)):
                    valid.add(b_id)
        except Exception as e:
            print(f"Warning: Failed to parse BRANCHES from {quotes_path}: {e}", file=sys.stderr)

    phys_path = physics_branches_path or DEFAULT_PHYSICS_BRANCHES
    if phys_path.exists():
        for attempt in range(3):
            try:
                content = read_text_with_retry(phys_path)
                data = json.loads(content)
                if isinstance(data, dict):
                    for v in data.values():
                        if isinstance(v, str) and v.strip():
                            valid.add(v.strip())
                break
            except (json.JSONDecodeError, OSError):
                if attempt == 2:
                    break
                time.sleep(0.1)

    return valid


# -----------------------------------------------------------------------------
# ROW COLLECTION & VALIDATION
# -----------------------------------------------------------------------------

def collect_approved_rows(csv_paths: list[Path]) -> list[ApprovedCandidate]:
    """
    Read review CSV files and collect all rows where status == 'approved'.
    Uses encoding='utf-8-sig' to safely handle BOM from DictWriter.
    Resolves branch from 'branch' column when present and non-empty, otherwise 'category'.
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
                    branch_col = (row.get("branch") or "").strip()
                    cat_col = (row.get("category") or "").strip()
                    resolved_branch = branch_col if branch_col else cat_col
                    candidates.append(
                        ApprovedCandidate(
                            source_file=csv_path.name,
                            row_number=row_idx,
                            term=(row.get("term") or "").strip(),
                            definition=(row.get("definition") or "").strip(),
                            branch=resolved_branch,
                            category=cat_col,
                            source=(row.get("source") or "").strip(),
                            license=(row.get("license") or "").strip(),
                            proposed_difficulty=(row.get("proposed_difficulty") or "").strip(),
                        )
                    )
    return candidates


def validate_candidates(
    candidates: list[ApprovedCandidate],
    existing_manifest: list[str],
    valid_branches: set[str],
    registry: TermRegistry | None = None,
) -> ValidationResult:
    """
    Validates all candidates against constraints:
      - branch is in valid_branches (from BRANCHES in quotes.ts or physics_branches.json)
      - term non-empty and <= 60 characters
      - definition non-empty and matches ^[A-Za-z .,'-]+$
      - alpha_count >= 40 (recomputed, not trusting CSV)
      - registry check: normalised term not already owned by a DIFFERENT branch (cross-branch duplicate)
      - manifest check: same branch and already in manifest -> skipped as already imported
      - batch uniqueness: term not duplicated within current import batch

    Returns ValidationResult(errors, to_import, skipped).
    """
    errors: list[str] = []
    to_import: list[ApprovedCandidate] = []
    skipped: list[ApprovedCandidate] = []

    manifest_set = set(existing_manifest)
    batch_terms: set[str] = set()

    for cand in candidates:
        loc = f"{cand.source_file}:{cand.row_number}"

        # 1. Branch check
        if not cand.branch:
            errors.append(
                f"[{loc}] Missing branch for term '{cand.term}'. Specify 'branch' or 'category'."
            )
        elif cand.branch not in valid_branches:
            errors.append(
                f"[{loc}] Unknown or invalid branch '{cand.branch}'; not found in BRANCHES list or physics_branches.json."
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

        # 5. Global Term Registry check (cross-branch duplicate guard)
        if registry is not None and cand.term:
            owner = registry.get_owner(cand.term)
            if owner is not None and owner != cand.branch:
                errors.append(
                    f"[{loc}] Cross-branch duplicate: Term '{cand.term}' is already owned by branch '{owner}', "
                    f"cannot be claimed by '{cand.branch}'."
                )

        # 6. Manifest check: already imported for same branch -> skip without duplicating
        if cand.term and cand.term in manifest_set:
            skipped.append(cand)
            continue

        # 7. Intra-batch duplicate check
        if cand.term:
            if cand.term in batch_terms:
                errors.append(
                    f"[{loc}] Duplicate term '{cand.term}' found within current import batch."
                )
            batch_terms.add(cand.term)
            to_import.append(cand)

    return ValidationResult(errors=errors, to_import=to_import, skipped=skipped)


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


def append_to_quotes_ts(content: str, branch: str, entry_lines: list[str]) -> str:
    """
    Appends formatted entry lines to the specified branch array in QUOTE_DB in quotes.ts.
    Maintains append-only invariant:
      - Never reorders existing elements.
      - Never modifies earlier entries (preserves array index stability).
      - Appends strictly before the closing bracket of `[branch]: [...]`.
      - If the branch array does not exist in QUOTE_DB yet, inserts it before the closing `};`.
      - Preserves indentation, comments, and line endings.
    """
    if not entry_lines:
        return content

    entries_block = "\n".join(entry_lines)

    # Search for branch key in QUOTE_DB
    # Matches:
    #   branch: [
    #   'branch': [
    #   "branch": [
    pattern = rf"(?:^|\n)([ \t]*)(['\"]?){re.escape(branch)}\2\s*:\s*\["
    m = re.search(pattern, content)

    if m:
        indent = m.group(1) or "  "
        start_bracket = content.find("[", m.start())
        end_bracket = content.find("]", start_bracket)
        if end_bracket == -1:
            raise ValueError(f"Could not find closing bracket for branch '{branch}' in quotes.ts")

        inside = content[start_bracket + 1 : end_bracket]
        stripped = inside.strip()

        if not stripped:
            # Case 1: Empty array `branch: []` or `branch: [\n  ]`
            return (
                content[:start_bracket]
                + "[\n"
                + entries_block
                + "\n"
                + indent
                + "]"
                + content[end_bracket + 1 :]
            )
        else:
            # Case 2: Array with existing entries
            # Ensure the last entry before closing bracket has a trailing comma
            r_inside = inside.rstrip()
            if r_inside.endswith("}"):
                prefix = r_inside + ",\n"
            elif r_inside.endswith(","):
                prefix = r_inside + "\n"
            else:
                prefix = r_inside + ",\n"

            return (
                content[:start_bracket + 1]
                + prefix
                + entries_block
                + "\n"
                + indent
                + "]"
                + content[end_bracket + 1 :]
            )

    # Case 3: Branch array not found in QUOTE_DB yet - insert before closing `};` of QUOTE_DB
    m_db = re.search(r"export const QUOTE_DB:[^=]*=\s*\{([\s\S]*?)(\n\};)", content)
    if not m_db:
        raise ValueError(f"Could not find QUOTE_DB block in quotes.ts to insert branch '{branch}'")

    db_body = m_db.group(1)
    stripped_body = db_body.rstrip()
    comma = ""
    if stripped_body and not stripped_body.endswith(","):
        comma = ","

    # Format key name: quote if not a simple identifier (e.g. contains hyphens)
    key_repr = branch if re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", branch) else f"'{branch}'"

    new_branch_block = (
        f"\n\n  // --------------------------------------------------------------------------\n"
        f"  // {branch.upper()}\n"
        f"  // --------------------------------------------------------------------------\n"
        f"  {key_repr}: [\n"
        f"{entries_block}\n"
        f"  ]"
    )

    insert_pos = m_db.start(1) + len(stripped_body)
    return (
        content[:insert_pos]
        + comma
        + new_branch_block
        + content[m_db.start(2) :]
    )


# -----------------------------------------------------------------------------
# MAIN IMPORT ORCHESTRATOR
# -----------------------------------------------------------------------------

def run_import(
    quotes_path: Path = DEFAULT_QUOTES_TS,
    content_dir: Path = DEFAULT_CONTENT_DIR,
    manifest_path: Path = DEFAULT_MANIFEST,
    sources_path: Path = DEFAULT_SOURCES,
    registry_path: Path = DEFAULT_REGISTRY,
    physics_branches_path: Path = DEFAULT_PHYSICS_BRANCHES,
    single_file: str | None = None,
    dry_run: bool = False,
) -> int:
    """
    Main import pipeline:
      1. Discover review CSV(s)
      2. Collect approved rows
      3. Load valid branches, manifest, and term registry
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

    # 4. Load valid branches, manifest, and term registry
    valid_branches = load_valid_branches(quotes_path, physics_branches_path)
    manifest = load_imported_manifest(manifest_path)
    registry = TermRegistry(registry_path) if registry_path.exists() else None

    # 5. Validate all candidates
    result = validate_candidates(candidates, manifest, valid_branches, registry)

    if result.errors:
        print(f"Validation failed with {len(result.errors)} error(s):", file=sys.stderr)
        for err in result.errors:
            print(f"  - {err}", file=sys.stderr)
        print("Import aborted. No changes were written.", file=sys.stderr)
        return 1

    if not result.to_import:
        if result.skipped:
            print(
                f"All {len(result.skipped)} approved row(s) were already imported in manifest. "
                f"Clean no-op, nothing to import."
            )
        else:
            print("0 approved rows to import. Clean no-op, nothing to import.")
        return 0

    # Group to_import by branch
    entries_by_branch: dict[str, list[ApprovedCandidate]] = {}
    for cand in result.to_import:
        entries_by_branch.setdefault(cand.branch, []).append(cand)

    # 6. Handle Dry-Run
    if dry_run:
        print(
            f"[DRY RUN] All {len(result.to_import)} approved row(s) validated successfully"
            f"{f' ({len(result.skipped)} skipped as already imported)' if result.skipped else ''}."
        )
        for branch, b_cands in entries_by_branch.items():
            formatted = [format_quote_entry(c.definition, c.term) for c in b_cands]
            print(
                f"[DRY RUN] Would append {len(formatted)} entries to branch '{branch}' in {quotes_path}:"
            )
            for entry in formatted:
                print(entry)
        print(
            f"[DRY RUN] Would record {len(result.to_import)} term(s) in manifest: {manifest_path}"
        )
        print(
            f"[DRY RUN] Would record {len(result.to_import)} source attribution record(s) in: {sources_path}"
        )
        print("[DRY RUN] Clean dry-run complete. No files were modified.")
        return 0

    # 7. Atomic Write to quotes.ts
    if not quotes_path.exists():
        print(f"Error: Target quotes file does not exist: {quotes_path}", file=sys.stderr)
        return 1

    quotes_content = read_text_with_retry(quotes_path)
    for branch, b_cands in entries_by_branch.items():
        formatted = [format_quote_entry(c.definition, c.term) for c in b_cands]
        quotes_content = append_to_quotes_ts(quotes_content, branch, formatted)

    atomic_write_text(quotes_path, quotes_content)

    # 8. Atomic Write to Manifest (content/imported.json)
    manifest_terms = list(manifest)
    manifest_set = set(manifest)
    for cand in result.to_import:
        if cand.term not in manifest_set:
            manifest_terms.append(cand.term)
            manifest_set.add(cand.term)
    atomic_write_json(manifest_path, manifest_terms)

    # 9. Atomic Write to Sources (content/sources.json)
    sources_data = load_sources_data(sources_path)
    for cand in result.to_import:
        sources_data[cand.term] = {
            "source": cand.source,
            "license": cand.license,
        }
    atomic_write_json(sources_path, sources_data)

    print(
        f"Successfully imported {len(result.to_import)} approved row(s) across "
        f"{len(entries_by_branch)} branch(es)."
    )
    for branch, b_cands in entries_by_branch.items():
        print(f"  - Appended {len(b_cands)} entries to branch '{branch}' in {quotes_path}")
    if result.skipped:
        print(f"  - Skipped {len(result.skipped)} row(s) already in manifest")
    print(f"  - Updated manifest {manifest_path} (total: {len(manifest_terms)} terms)")
    print(f"  - Updated attribution {sources_path} (total: {len(sources_data)} records)")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BrainCipher approved content importer (append-only, branch-aware)."
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
    parser.add_argument(
        "--registry-path",
        type=Path,
        default=DEFAULT_REGISTRY,
        help=f"Path to term_registry.json (default: {DEFAULT_REGISTRY})",
    )
    parser.add_argument(
        "--physics-branches-path",
        type=Path,
        default=DEFAULT_PHYSICS_BRANCHES,
        help=f"Path to physics_branches.json (default: {DEFAULT_PHYSICS_BRANCHES})",
    )

    args = parser.parse_args()

    exit_code = run_import(
        quotes_path=args.quotes_path,
        content_dir=args.content_dir,
        manifest_path=args.manifest_path,
        sources_path=args.sources_path,
        registry_path=args.registry_path,
        physics_branches_path=args.physics_branches_path,
        single_file=args.file_name,
        dry_run=args.dry_run,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
