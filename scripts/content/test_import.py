#!/usr/bin/env python3
"""
BrainCipher - Test Suite for Approved Content Importer

All tests operate strictly on copies in temporary directories.
The real src/data/quotes.ts and content/review_*.csv are NEVER touched.

Covers:
  1. Dry-run makes no changes to the copied file.
  2. A batch with 2 valid approved rows appends exactly 2 entries, with the right shape and valid syntax.
  3. An invalid row (illegal character, term > 60 chars, wrong category, alpha_count < 40)
     aborts with a non-zero exit and writes nothing (all-or-nothing guarantee).
  4. Re-running the same batch does not duplicate (manifest duplicate guard works).
  5. The appended text is the same shape as an existing real entry in QUOTE_DB.
  6. Zero approved rows is a clean no-op.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
REAL_QUOTES_TS = REPO_ROOT / "src" / "data" / "quotes.ts"
IMPORT_SCRIPT = REPO_ROOT / "scripts" / "content" / "import_approved.py"


def file_sha256(path: Path) -> str:
    """Compute sha256 checksum of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def make_review_csv(path: Path, rows: list[dict[str, str]]) -> None:
    """Helper to write a review CSV with standard headers."""
    fieldnames = [
        "term",
        "definition",
        "raw_definition",
        "category",
        "proposed_difficulty",
        "alpha_count",
        "char_count",
        "source",
        "license",
        "confidence",
        "status",
        "notes",
    ]
    with open(path, "w", encoding="utf-8-sig", newline="\r\n") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            full_row = {fn: "" for fn in fieldnames}
            full_row.update(r)
            writer.writerow(full_row)


class TestImportApproved(unittest.TestCase):
    def setUp(self) -> None:
        # Snapshot real quotes.ts to verify it is NEVER touched
        self.real_quotes_hash_before = file_sha256(REAL_QUOTES_TS)

        # Temporary workspace
        self.tmp_dir_obj = tempfile.TemporaryDirectory()
        self.tmp_dir = Path(self.tmp_dir_obj.name)

        self.tmp_quotes = self.tmp_dir / "quotes.ts"
        self.tmp_manifest = self.tmp_dir / "imported.json"
        self.tmp_sources = self.tmp_dir / "sources.json"
        self.tmp_csv = self.tmp_dir / "review_sample.csv"

        # Copy real quotes.ts into temp workspace
        with open(REAL_QUOTES_TS, "r", encoding="utf-8") as f_src:
            content = f_src.read()
        with open(self.tmp_quotes, "w", encoding="utf-8", newline="\n") as f_dst:
            f_dst.write(content)

        # Initialize empty manifest and sources
        with open(self.tmp_manifest, "w", encoding="utf-8") as f:
            json.dump([], f)
        with open(self.tmp_sources, "w", encoding="utf-8") as f:
            json.dump({}, f)

    def tearDown(self) -> None:
        self.tmp_dir_obj.cleanup()
        # Assert real quotes.ts remained completely untouched
        real_quotes_hash_after = file_sha256(REAL_QUOTES_TS)
        self.assertEqual(
            self.real_quotes_hash_before,
            real_quotes_hash_after,
            "CRITICAL: Real src/data/quotes.ts was modified during tests!",
        )

    def run_importer(self, *extra_args: str) -> subprocess.CompletedProcess[str]:
        """Invoke import_approved.py via subprocess targeting the isolated temp files."""
        cmd = [
            sys.executable,
            str(IMPORT_SCRIPT),
            "--quotes-path",
            str(self.tmp_quotes),
            "--manifest-path",
            str(self.tmp_manifest),
            "--sources-path",
            str(self.tmp_sources),
            "--content-dir",
            str(self.tmp_dir),
            *extra_args,
        ]
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
        )

    # -------------------------------------------------------------------------
    # TEST 1: Dry-run makes no changes to the copied file
    # -------------------------------------------------------------------------
    def test_dry_run_makes_no_changes(self) -> None:
        sample_rows = [
            {
                "term": "selenic",
                "definition": "Of or pertaining to selenium derived from or containing selenium specifically designating those compounds.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
            {
                "term": "ketone",
                "definition": "One of a large class of organic substances resembling the aldehydes obtained by the distillation of certain salts.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
        ]
        make_review_csv(self.tmp_csv, sample_rows)
        initial_hash = file_sha256(self.tmp_quotes)

        result = self.run_importer("--dry-run", "--file", str(self.tmp_csv))

        self.assertEqual(result.returncode, 0, f"Dry-run failed: {result.stderr}")
        self.assertIn("[DRY RUN]", result.stdout)
        self.assertIn("selenic", result.stdout)
        self.assertIn("ketone", result.stdout)

        # Quotes file must be byte-for-byte identical
        self.assertEqual(
            initial_hash,
            file_sha256(self.tmp_quotes),
            "Copied quotes.ts was modified during --dry-run!",
        )

        # Manifest and sources must remain empty
        with open(self.tmp_manifest, "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), [])
        with open(self.tmp_sources, "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), {})

    # -------------------------------------------------------------------------
    # TEST 2: Valid approved rows append exactly 2 entries with valid shape & syntax
    # -------------------------------------------------------------------------
    def test_batch_with_two_valid_approved_rows(self) -> None:
        sample_rows = [
            {
                "term": "selenic",
                "definition": "Of or pertaining to selenium derived from or containing selenium specifically designating those compounds.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
            {
                "term": "ketone",
                "definition": "One of a large class of organic substances resembling the aldehydes obtained by the distillation of certain salts.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
            {
                "term": "unreviewed term",
                "definition": "This row is unreviewed and must be ignored by the importer completely.",
                "category": "lexicon",
                "status": "",
            },
        ]
        make_review_csv(self.tmp_csv, sample_rows)

        result = self.run_importer("--file", str(self.tmp_csv))
        self.assertEqual(result.returncode, 0, f"Import failed: {result.stderr}")

        # Check quotes.ts content
        with open(self.tmp_quotes, "r", encoding="utf-8") as f:
            updated_ts = f.read()

        # Check lexicon array contains exactly 2 entries
        lex_match = re.search(r"lexicon\s*:\s*\[([\s\S]*?)\]", updated_ts)
        self.assertIsNotNone(lex_match, "lexicon array not found in updated quotes.ts")
        lex_body = lex_match.group(1)

        # Find all entry objects inside lexicon array
        entry_lines = [
            line.strip()
            for line in lex_body.splitlines()
            if line.strip().startswith("{") and line.strip().endswith("},")
        ]
        self.assertEqual(len(entry_lines), 2, f"Expected 2 entries, found: {entry_lines}")

        # Verify entry content
        self.assertIn('"selenic"', entry_lines[0])
        self.assertIn('"ketone"', entry_lines[1])

        # Verify manifest
        with open(self.tmp_manifest, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        self.assertEqual(manifest_data, ["selenic", "ketone"])

        # Verify sources attribution
        with open(self.tmp_sources, "r", encoding="utf-8") as f:
            sources_data = json.load(f)
        self.assertIn("selenic", sources_data)
        self.assertIn("ketone", sources_data)
        self.assertEqual(
            sources_data["selenic"]["source"],
            "Webster's Unabridged Dictionary (1913)",
        )
        self.assertEqual(sources_data["selenic"]["license"], "Public domain")

    # -------------------------------------------------------------------------
    # TEST 3: Invalid row aborts with non-zero exit and writes nothing (all-or-nothing)
    # -------------------------------------------------------------------------
    def test_invalid_row_aborts_all_or_nothing(self) -> None:
        initial_hash = file_sha256(self.tmp_quotes)

        # 3a: Illegal character in definition (e.g. semicolon)
        rows_illegal_char = [
            {
                "term": "valid word",
                "definition": "This is a valid definition with more than forty letters for testing.",
                "category": "lexicon",
                "status": "approved",
            },
            {
                "term": "invalid word",
                "definition": "This definition contains an illegal semicolon; which breaks allowlist.",
                "category": "lexicon",
                "status": "approved",
            },
        ]
        make_review_csv(self.tmp_csv, rows_illegal_char)
        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertNotEqual(res.returncode, 0, "Importer should fail on illegal characters")
        self.assertIn("illegal character", res.stderr.lower())
        self.assertEqual(initial_hash, file_sha256(self.tmp_quotes), "Quotes file was modified on error!")

        # 3b: Term longer than 60 characters
        rows_long_term = [
            {
                "term": "a" * 61,
                "definition": "This is a valid definition with more than forty letters for testing.",
                "category": "lexicon",
                "status": "approved",
            }
        ]
        make_review_csv(self.tmp_csv, rows_long_term)
        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertNotEqual(res.returncode, 0, "Importer should fail on term > 60 chars")
        self.assertIn("exceeds 60 characters", res.stderr)
        self.assertEqual(initial_hash, file_sha256(self.tmp_quotes))

        # 3c: Wrong category (not 'lexicon')
        rows_wrong_category = [
            {
                "term": "photosynthesis",
                "definition": "This is a valid definition with more than forty letters for testing.",
                "category": "biology",
                "status": "approved",
            }
        ]
        make_review_csv(self.tmp_csv, rows_wrong_category)
        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertNotEqual(res.returncode, 0, "Importer should fail on category != 'lexicon'")
        self.assertIn("invalid category", res.stderr.lower())
        self.assertEqual(initial_hash, file_sha256(self.tmp_quotes))

        # 3d: Alpha count < 40 letters
        rows_short_alpha = [
            {
                "term": "short def",
                "definition": "Too short def.",
                "category": "lexicon",
                "status": "approved",
            }
        ]
        make_review_csv(self.tmp_csv, rows_short_alpha)
        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertNotEqual(res.returncode, 0, "Importer should fail on alpha_count < 40")
        self.assertIn("below required minimum of 40", res.stderr)
        self.assertEqual(initial_hash, file_sha256(self.tmp_quotes))

        # Verify all-or-nothing guarantee: manifest and sources were never updated
        with open(self.tmp_manifest, "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), [])
        with open(self.tmp_sources, "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), {})

    # -------------------------------------------------------------------------
    # TEST 4: Re-running the same batch does not duplicate (manifest works)
    # -------------------------------------------------------------------------
    def test_re_running_batch_does_not_duplicate(self) -> None:
        sample_rows = [
            {
                "term": "selenic",
                "definition": "Of or pertaining to selenium derived from or containing selenium specifically designating those compounds.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
            {
                "term": "ketone",
                "definition": "One of a large class of organic substances resembling the aldehydes obtained by the distillation of certain salts.",
                "category": "lexicon",
                "proposed_difficulty": "Epic",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            },
        ]
        make_review_csv(self.tmp_csv, sample_rows)

        # First run: should succeed
        res1 = self.run_importer("--file", str(self.tmp_csv))
        self.assertEqual(res1.returncode, 0)

        # Hash after first successful import
        post_first_run_hash = file_sha256(self.tmp_quotes)

        # Second run with exact same batch: duplicate guard aborts to prevent duplication
        res2 = self.run_importer("--file", str(self.tmp_csv))
        self.assertNotEqual(res2.returncode, 0, "Second run should abort due to duplicate terms in manifest")
        self.assertIn("already present in manifest", res2.stderr)

        # Quotes file must NOT have changed from the first run (no duplicates added)
        self.assertEqual(
            post_first_run_hash,
            file_sha256(self.tmp_quotes),
            "Quotes file was modified on duplicate re-run!",
        )

        # Read lexicon array and assert exactly 2 entries remain
        with open(self.tmp_quotes, "r", encoding="utf-8") as f:
            updated_ts = f.read()
        lex_match = re.search(r"lexicon\s*:\s*\[([\s\S]*?)\]", updated_ts)
        self.assertIsNotNone(lex_match)
        entries = [
            line.strip()
            for line in lex_match.group(1).splitlines()
            if line.strip().startswith("{")
        ]
        self.assertEqual(len(entries), 2, "Array entries duplicated!")

    # -------------------------------------------------------------------------
    # TEST 5: Appended text is the same shape as an existing real entry
    # -------------------------------------------------------------------------
    def test_appended_text_matches_real_entry_shape(self) -> None:
        # Read real entries from biology in quotes.ts
        with open(REAL_QUOTES_TS, "r", encoding="utf-8") as f:
            real_quotes_content = f.read()

        # Regex matching the exact formatting shape of QUOTE_DB items
        # 4 spaces indent, { text: "...", author: "..." },
        entry_shape_re = re.compile(
            r'^    \{ text: "(?P<text>[^"\\]*(?:\\.[^"\\]*)*)", author: "(?P<author>[^"\\]*(?:\\.[^"\\]*)*)" \},?$'
        )

        # Find sample real entry in biology
        bio_match = re.search(r"biology\s*:\s*\[\s*\n(\s*\{[\s\S]*?\})\n", real_quotes_content)
        self.assertIsNotNone(bio_match, "Could not find sample real entry in biology")
        sample_real_entry = bio_match.group(1).splitlines()[0]
        self.assertTrue(
            entry_shape_re.match(sample_real_entry),
            f"Real entry does not match expected shape: {sample_real_entry!r}",
        )

        # Import a valid row
        sample_rows = [
            {
                "term": "anopheles",
                "definition": "A genus of mosquitoes which are secondary hosts of the malaria parasites and transmit infection.",
                "category": "lexicon",
                "proposed_difficulty": "Long",
                "source": "Webster's Unabridged Dictionary (1913)",
                "license": "Public domain",
                "status": "approved",
            }
        ]
        make_review_csv(self.tmp_csv, sample_rows)
        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertEqual(res.returncode, 0)

        # Read appended entry line from lexicon
        with open(self.tmp_quotes, "r", encoding="utf-8") as f:
            updated_ts = f.read()

        lex_match = re.search(r"lexicon\s*:\s*\[([\s\S]*?)\]", updated_ts)
        self.assertIsNotNone(lex_match)
        appended_lines = [
            line for line in lex_match.group(1).splitlines() if line.strip().startswith("{")
        ]
        self.assertEqual(len(appended_lines), 1)
        appended_line = appended_lines[0]

        # Verify shape
        m = entry_shape_re.match(appended_line)
        self.assertIsNotNone(m, f"Appended line does not match entry shape: {appended_line!r}")
        self.assertTrue(appended_line.startswith("    { text: \""))
        self.assertIn("\", author: \"", appended_line)
        self.assertTrue(appended_line.endswith("\" },"))

        # Verify difficulty field is omitted
        self.assertNotIn("difficulty", appended_line)

    # -------------------------------------------------------------------------
    # TEST 6: Zero approved rows is a clean no-op
    # -------------------------------------------------------------------------
    def test_zero_approved_rows_clean_noop(self) -> None:
        initial_hash = file_sha256(self.tmp_quotes)
        sample_rows = [
            {
                "term": "unreviewed row",
                "definition": "Valid definition with more than forty letters for unreviewed sample testing.",
                "category": "lexicon",
                "status": "",
            },
            {
                "term": "rejected row",
                "definition": "Valid definition with more than forty letters for rejected sample testing.",
                "category": "lexicon",
                "status": "rejected",
            },
            {
                "term": "edit row",
                "definition": "Valid definition with more than forty letters for flagged edit sample testing.",
                "category": "lexicon",
                "status": "edit",
            },
        ]
        make_review_csv(self.tmp_csv, sample_rows)

        res = self.run_importer("--file", str(self.tmp_csv))
        self.assertEqual(res.returncode, 0)
        self.assertIn("0 approved rows", res.stdout.lower())
        self.assertEqual(initial_hash, file_sha256(self.tmp_quotes))


if __name__ == "__main__":
    unittest.main()
