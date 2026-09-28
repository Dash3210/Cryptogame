#!/usr/bin/env python3
"""
BrainCipher - Global Term Registry

Enforces the "never repeat a topic across subjects" rule.
Persisted at content/term_registry.json.

Every normalised term (lowercase, collapse whitespace, strip surrounding punctuation)
has EXACTLY ONE owner branch. If the same normalised term appears under a DIFFERENT
branch, it is a DUPLICATE and must be rejected at staging/import time.

Python standard library only.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_REGISTRY_PATH = REPO_ROOT / "content" / "term_registry.json"
DEFAULT_QUOTES_TS = REPO_ROOT / "src" / "data" / "quotes.ts"


def normalize_term(term: str) -> str:
    """Normalise term: lowercase, collapse whitespace, strip surrounding punctuation."""
    if not term:
        return ""
    # Lowercase
    t = term.lower()
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()
    # Strip surrounding non-alphanumeric punctuation (quotes, brackets, periods, commas, etc.)
    t = re.sub(r"^[^a-z0-9]+|[^a-z0-9]+$", "", t)
    return t


def atomic_write_json(path: Path, data: Any) -> None:
    """Serialize data to JSON and write atomically to path via a temporary file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
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


class TermRegistry:
    """Global registry mapping normalised term -> owner branch."""

    def __init__(self, registry_path: Path = DEFAULT_REGISTRY_PATH) -> None:
        self.path = registry_path
        self._registry: dict[str, str] = {}
        self.load()

    def load(self) -> None:
        """Load registry from JSON file if it exists."""
        if not self.path.exists():
            self._registry = {}
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    self._registry = {
                        normalize_term(k): str(v)
                        for k, v in data.items()
                        if normalize_term(k)
                    }
                else:
                    self._registry = {}
        except (json.JSONDecodeError, OSError) as e:
            print(f"Warning: Failed to load term registry from {self.path}: {e}", file=sys.stderr)
            self._registry = {}

    def save(self) -> None:
        """Save registry atomically to disk."""
        atomic_write_json(self.path, self._registry)

    def __len__(self) -> int:
        return len(self._registry)

    def __contains__(self, term: str) -> bool:
        return normalize_term(term) in self._registry

    def get_owner(self, term: str) -> str | None:
        """Return owner branch for a term, or None if unregistered."""
        return self._registry.get(normalize_term(term))

    def check_duplicate(self, term: str, target_branch: str) -> tuple[bool, str]:
        """
        Check if term is already claimed.
        Returns:
            (is_duplicate, reason_message)
        """
        norm = normalize_term(term)
        if not norm:
            return False, ""
        if norm in self._registry:
            owner = self._registry[norm]
            if owner != target_branch:
                return (
                    True,
                    f"CROSS-BRANCH DUPLICATE: Term '{term}' (normalised: '{norm}') is already owned by branch '{owner}', cannot be claimed by '{target_branch}'",
                )
            else:
                return (
                    True,
                    f"INTRA-BRANCH DUPLICATE: Term '{term}' (normalised: '{norm}') is already registered in branch '{owner}'",
                )
        return False, ""

    def register(self, term: str, branch: str) -> tuple[bool, str]:
        """
        Register a term to a branch.
        Returns:
            (success, error_reason)
        """
        norm = normalize_term(term)
        if not norm:
            return False, "Empty term"
        is_dupe, reason = self.check_duplicate(norm, branch)
        if is_dupe:
            return False, reason
        self._registry[norm] = branch
        return True, ""

    def force_set(self, term: str, branch: str) -> None:
        """Force set an entry in the registry (e.g. during initial seeding)."""
        norm = normalize_term(term)
        if norm:
            self._registry[norm] = branch

    def seed_from_quotes_ts(self, quotes_path: Path = DEFAULT_QUOTES_TS) -> int:
        """
        Extract existing puzzles from QUOTE_DB in src/data/quotes.ts and register them.
        Returns number of terms added.
        """
        if not quotes_path.exists():
            return 0
        content = quotes_path.read_text(encoding="utf-8")
        # Find QUOTE_DB block
        m = re.search(r"export const QUOTE_DB:[^=]*=\s*\{(.*?)\n\};", content, re.DOTALL)
        if not m:
            return 0
        quote_db_str = m.group(1)

        # Match each branch block: branch_id: [ ... ]
        branch_matches = re.findall(r"(\b[a-zA-Z0-9_-]+)\s*:\s*\[\s*(.*?)\s*\]", quote_db_str, re.DOTALL)
        added = 0
        for branch_id, block in branch_matches:
            authors = re.findall(r'author:\s*"([^"]+)"', block)
            for a in authors:
                norm = normalize_term(a)
                if not norm:
                    continue
                if norm not in self._registry:
                    self._registry[norm] = branch_id
                    added += 1
                elif self._registry[norm] != branch_id:
                    print(
                        f"[Registry Seed Notice] Duplicate in QUOTE_DB: '{a}' already owned by '{self._registry[norm]}', skipping for '{branch_id}'",
                        file=sys.stderr,
                    )
        return added

    def seed_from_csv(self, csv_path: Path, branch_col: str = "category") -> int:
        """Seed registry from a review CSV file."""
        if not csv_path.exists():
            return 0
        added = 0
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                term = row.get("term", "").strip()
                branch = (row.get(branch_col) or row.get("branch") or row.get("category") or "").strip()
                if not term or not branch:
                    continue
                norm = normalize_term(term)
                if norm not in self._registry:
                    self._registry[norm] = branch
                    added += 1
        return added

    def to_dict(self) -> dict[str, str]:
        return dict(self._registry)


def get_term_registry(registry_path: Path = DEFAULT_REGISTRY_PATH) -> TermRegistry:
    """Factory helper to obtain a loaded TermRegistry instance."""
    return TermRegistry(registry_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="BrainCipher Global Term Registry Utility")
    parser.add_argument("--seed", action="store_true", help="Seed registry from existing content")
    parser.add_argument("--stats", action="store_true", help="Display registry statistics")
    parser.add_argument("--check-term", type=str, help="Check ownership of a specific term")
    parser.add_argument("--target-branch", type=str, default="", help="Branch to test with --check-term")
    parser.add_argument("--output", type=Path, default=DEFAULT_REGISTRY_PATH, help="Registry JSON path")
    args = parser.parse_args()

    reg = TermRegistry(args.output)

    if args.seed:
        quotes_count = reg.seed_from_quotes_ts(DEFAULT_QUOTES_TS)
        wn_count = reg.seed_from_csv(REPO_ROOT / "content" / "review_wordnet_sample.csv", branch_col="category")
        vt_count = reg.seed_from_csv(REPO_ROOT / "content" / "review_vintage_sample.csv", branch_col="category")
        reg.save()
        print(f"Seeded registry from existing content ({reg.path}):")
        print(f"  - QUOTE_DB terms added:       {quotes_count}")
        print(f"  - WordNet sample terms added:  {wn_count}")
        print(f"  - Vintage sample terms added:  {vt_count}")
        print(f"  - Total unique registry size:  {len(reg)}")

    if args.check_term:
        norm = normalize_term(args.check_term)
        owner = reg.get_owner(args.check_term)
        print(f"Term: '{args.check_term}' -> Normalised: '{norm}'")
        print(f"Owner branch: {owner or '<None>'}")
        if args.target_branch:
            is_dupe, reason = reg.check_duplicate(args.check_term, args.target_branch)
            print(f"Check against '{args.target_branch}': is_duplicate={is_dupe}, reason={reason}")

    if args.stats or (not args.seed and not args.check_term):
        print(f"Term Registry: {reg.path} (Total terms: {len(reg)})")
        by_branch: dict[str, int] = {}
        for t, b in reg.to_dict().items():
            by_branch[b] = by_branch.get(b, 0) + 1
        for b, count in sorted(by_branch.items()):
            print(f"  {b:30s}: {count:4d}")


if __name__ == "__main__":
    main()
