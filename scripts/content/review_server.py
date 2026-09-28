#!/usr/bin/env python3
"""
BrainCipher Content Review Workbench - Local Backend Server

Standard library only. Serves the review web UI and provides atomic,
byte-compatible CSV persistence and export capabilities for puzzle-candidate review.
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import os
import re
import shutil
import sys
import threading
import urllib.parse
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

# Path anchors
REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = REPO_ROOT / "content"
BACKUPS_DIR = CONTENT_DIR / ".backups"
UI_FILE = Path(__file__).resolve().parent / "review_ui.html"

# Domain constants
VALID_CATEGORIES = {
    "biology", "physics", "chemistry", "astronomy", "geography",
    "history", "literature", "compsci", "anatomy", "music",
    "economics", "mythology", "lexicon"
}
VALID_STATUSES = {"", "approved", "rejected", "edit"}

# Single source of truth for text normalization and metrics
from board_text import clean_for_board, alpha_count, char_count, tier_for

# Session state: track files backed up during this server run
_backed_up_files: set[str] = set()
_lock = threading.Lock()


def resolve_review_file(filename: str) -> Path | None:
    """Validate that filename is safe and strictly targets a review_*.csv in content/
    or a *.csv in content/openstax/.
    """
    if not filename or ".." in filename:
        return None
    if "_websters1913.json" in filename:
        return None

    clean = filename.replace("\\", "/").strip("/")
    if not clean.endswith(".csv"):
        clean = f"{clean}.csv"

    content_root = CONTENT_DIR.resolve()
    openstax_root = (CONTENT_DIR / "openstax").resolve()

    # Direct resolution relative to CONTENT_DIR
    target = (CONTENT_DIR / clean).resolve()
    try:
        target.relative_to(content_root)
    except ValueError:
        return None

    if target.is_file():
        if target.parent == content_root and target.name.startswith("review_"):
            return target
        if target.parent == openstax_root and target.suffix == ".csv":
            return target

    # Also resolve if only filename was provided without openstax/ prefix
    alt = (openstax_root / Path(clean).name).resolve()
    if alt.is_file() and alt.parent == openstax_root and alt.suffix == ".csv":
        return alt

    return None


def is_safe_review_file(filename: str) -> bool:
    """Check if filename targets a safe review CSV in content/ or content/openstax/."""
    return resolve_review_file(filename) is not None


def read_csv_rows(file_path: Path) -> tuple[list[str], list[dict[str, Any]]]:
    """Read CSV rows preserving fieldnames, UTF-8 BOM, and order."""
    with file_path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)
    return fieldnames, rows


def write_csv_atomic(file_path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    """Write CSV atomically using temp file and os.replace, UTF-8 BOM, minimal quoting."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = file_path.parent / f".tmp_{file_path.name}_{os.getpid()}_{int(datetime.datetime.now().timestamp() * 1000)}"
    try:
        with temp_path.open("w", encoding="utf-8-sig", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=fieldnames,
                quoting=csv.QUOTE_MINIMAL,
                lineterminator="\r\n"
            )
            writer.writeheader()
            writer.writerows(rows)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(temp_path, file_path)
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


def backup_on_first_write(file_path: Path) -> Path | None:
    """Create a backup of the file in content/.backups/ on the first write of this session."""
    rel_key = str(file_path.relative_to(CONTENT_DIR)).replace("\\", "_").replace("/", "_")
    if rel_key in _backed_up_files:
        return None
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_file = BACKUPS_DIR / f"{rel_key}.{timestamp}.csv"
    shutil.copy2(file_path, backup_file)
    _backed_up_files.add(rel_key)
    return backup_file


def get_all_review_terms() -> dict[str, set[str]]:
    """Index terms per review file to detect duplicates across review CSVs."""
    terms_by_file: dict[str, set[str]] = {}
    paths = sorted(CONTENT_DIR.glob("review_*.csv")) + sorted((CONTENT_DIR / "openstax").glob("*.csv"))
    for p in paths:
        if not p.is_file() or p.name.startswith("."):
            continue
        rel_key = str(p.relative_to(CONTENT_DIR)).replace("\\", "/")
        try:
            _, rows = read_csv_rows(p)
            term_set = {r.get("term", "").strip().lower() for r in rows if r.get("term")}
            terms_by_file[rel_key] = term_set
            terms_by_file[p.name] = term_set
        except Exception:
            pass
    return terms_by_file


class ReviewRequestHandler(BaseHTTPRequestHandler):
    server_version = "BrainCipherReview/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        # Clean formatted logging
        sys.stderr.write(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]} -> {args[2]}\n")

    def send_json(self, status: int, data: Any) -> None:
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/":
            self.handle_serve_ui()
        elif path == "/api/files":
            self.handle_get_files()
        elif path == "/api/rows":
            self.handle_get_rows(parsed.query)
        else:
            self.send_json(404, {"error": f"Endpoint not found: {path}"})

    def do_PATCH(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/rows":
            self.handle_patch_rows()
        else:
            self.send_json(404, {"error": f"Endpoint not found: {parsed.path}"})

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/export":
            self.handle_export()
        elif parsed.path == "/api/clean":
            self.handle_clean()
        else:
            self.send_json(404, {"error": f"Endpoint not found: {parsed.path}"})

    def handle_serve_ui(self) -> None:
        if not UI_FILE.is_file():
            self.send_json(500, {"error": f"UI template missing: {UI_FILE}"})
            return
        content = UI_FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(content)

    def handle_get_files(self) -> None:
        with _lock:
            files_meta = []
            paths = sorted(CONTENT_DIR.glob("review_*.csv")) + sorted((CONTENT_DIR / "openstax").glob("*.csv"))
            for p in paths:
                if not p.is_file() or p.name.startswith("."):
                    continue
                rel_name = str(p.relative_to(CONTENT_DIR)).replace("\\", "/")
                try:
                    _, rows = read_csv_rows(p)
                    total = len(rows)
                    reviewed = sum(1 for r in rows if r.get("status", "").strip().lower() in ("approved", "rejected", "edit"))
                    approved = sum(1 for r in rows if r.get("status", "").strip().lower() == "approved")
                    rejected = sum(1 for r in rows if r.get("status", "").strip().lower() == "rejected")
                    edit = sum(1 for r in rows if r.get("status", "").strip().lower() == "edit")
                    unreviewed = total - reviewed
                    files_meta.append({
                        "name": rel_name,
                        "rows": total,
                        "reviewed": reviewed,
                        "approved": approved,
                        "rejected": rejected,
                        "edit": edit,
                        "unreviewed": unreviewed,
                    })
                except Exception as ex:
                    files_meta.append({
                        "name": rel_name,
                        "rows": 0,
                        "reviewed": 0,
                        "error": str(ex),
                    })
            self.send_json(200, {"files": files_meta})

    def handle_get_rows(self, query_string: str) -> None:
        qs = urllib.parse.parse_qs(query_string)
        file_list = qs.get("file", [])
        if not file_list:
            self.send_json(400, {"error": "Missing 'file' query parameter"})
            return
        filename = file_list[0]
        target_path = resolve_review_file(filename)
        if not target_path:
            self.send_json(400, {"error": f"Invalid or disallowed file: {filename}"})
            return
        rel_filename = str(target_path.relative_to(CONTENT_DIR)).replace("\\", "/")

        with _lock:
            try:
                fieldnames, raw_rows = read_csv_rows(target_path)
            except Exception as ex:
                self.send_json(500, {"error": f"Failed reading CSV: {ex}"})
                return

            all_terms = get_all_review_terms()
            other_terms: set[str] = set()
            for other_file, terms in all_terms.items():
                if other_file not in (rel_filename, filename, target_path.name):
                    other_terms.update(terms)

            # Detect duplicates in file
            term_counts: dict[str, int] = {}
            for r in raw_rows:
                t = r.get("term", "").strip().lower()
                if t:
                    term_counts[t] = term_counts.get(t, 0) + 1
            dupes_in_file = {t for t, count in term_counts.items() if count > 1}
            dupes_across = {t for t in term_counts if t in other_terms}

            rows_with_index = []
            for i, r in enumerate(raw_rows):
                row_copy = dict(r)
                row_copy["index"] = i
                term = r.get("term", "")
                raw_text = r.get("raw_definition") or r.get("definition") or ""
                _, raw_warns = clean_for_board(raw_text, term=term)
                cur_text = r.get("definition") or ""
                _, cur_warns = clean_for_board(cur_text, term=term)
                combined_warns = list(dict.fromkeys(raw_warns + cur_warns))
                row_copy["warnings"] = combined_warns
                rows_with_index.append(row_copy)

            self.send_json(200, {
                "file": rel_filename,
                "columns": fieldnames,
                "rows": rows_with_index,
                "duplicates": {
                    "in_file": sorted(dupes_in_file),
                    "across_files": sorted(dupes_across),
                }
            })

    def handle_clean(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self.send_json(400, {"error": "Missing request body"})
            return

        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception as ex:
            self.send_json(400, {"error": f"Malformed JSON: {ex}"})
            return

        text = body.get("text", "")
        term = body.get("term")
        cleaned, warnings = clean_for_board(text, term=term)
        self.send_json(200, {
            "cleaned": cleaned,
            "warnings": warnings,
            "alpha_count": alpha_count(cleaned),
            "char_count": char_count(cleaned),
            "tier": tier_for(cleaned),
        })

    def handle_patch_rows(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self.send_json(400, {"error": "Missing request body"})
            return

        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception as ex:
            self.send_json(400, {"error": f"Malformed JSON: {ex}"})
            return

        filename = body.get("file")
        target_path = resolve_review_file(filename) if filename else None
        if not target_path:
            self.send_json(400, {"error": f"Invalid or disallowed file: {filename}"})
            return

        index = body.get("index")
        if index is None or not isinstance(index, int) or index < 0:
            self.send_json(400, {"error": "Valid 0-based integer 'index' is required"})
            return

        fields = body.get("fields")
        if not isinstance(fields, dict):
            self.send_json(400, {"error": "'fields' object is required"})
            return

        # Validate category if provided
        cat_key = "category" if "category" in fields else ("suggested_category" if "suggested_category" in fields else None)
        if cat_key:
            cat = str(fields[cat_key]).strip().lower()
            if cat != "" and cat not in VALID_CATEGORIES:
                self.send_json(400, {
                    "error": f"Invalid category '{fields[cat_key]}'. "
                             f"Valid categories are: {', '.join(sorted(VALID_CATEGORIES))} or blank."
                })
                return
            fields[cat_key] = cat

        # Validate status if provided
        if "status" in fields:
            st = str(fields["status"]).strip().lower()
            if st not in VALID_STATUSES:
                self.send_json(400, {
                    "error": f"Invalid status '{fields['status']}'. "
                             f"Valid values are: approved, rejected, edit, or blank."
                })
                return
            fields["status"] = st

        with _lock:
            try:
                fieldnames, rows = read_csv_rows(target_path)
            except Exception as ex:
                self.send_json(500, {"error": f"Failed reading CSV: {ex}"})
                return

            if index >= len(rows):
                self.send_json(400, {"error": f"Index {index} out of bounds (file has {len(rows)} rows)"})
                return

            # Session backup on first write
            backup_path = backup_on_first_write(target_path)

            target_row = rows[index]

            # If definition changed and alpha_count/char_count were not explicitly supplied, update them
            if "definition" in fields:
                def_text = str(fields["definition"])
                if "alpha_count" not in fields:
                    fields["alpha_count"] = str(alpha_count(def_text))
                if "char_count" not in fields:
                    fields["char_count"] = str(char_count(def_text))
                if "proposed_difficulty" not in fields:
                    fields["proposed_difficulty"] = tier_for(def_text)

            # Apply fields, preserving unknown keys and fieldnames
            for k, v in fields.items():
                target_row[k] = str(v) if v is not None else ""
                if k not in fieldnames:
                    fieldnames.append(k)

            # Atomic write back
            try:
                write_csv_atomic(target_path, fieldnames, rows)
            except Exception as ex:
                self.send_json(500, {"error": f"Failed atomic write to CSV: {ex}"})
                return

            resp_row = dict(target_row)
            resp_row["index"] = index
            self.send_json(200, {
                "ok": True,
                "row": resp_row,
                "backup_created": str(backup_path) if backup_path else None
            })

    def handle_export(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self.send_json(400, {"error": "Missing request body"})
            return

        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception as ex:
            self.send_json(400, {"error": f"Malformed JSON: {ex}"})
            return

        filename = body.get("file")
        target_path = resolve_review_file(filename) if filename else None
        if not target_path:
            self.send_json(400, {"error": f"Invalid or disallowed file: {filename}"})
            return

        with _lock:
            try:
                fieldnames, rows = read_csv_rows(target_path)
            except Exception as ex:
                self.send_json(500, {"error": f"Failed reading CSV: {ex}"})
                return

            approved_rows = [r for r in rows if r.get("status", "").strip().lower() == "approved"]
            export_filename = f"approved_{target_path.stem}.csv"
            export_path = target_path.parent / export_filename

            try:
                write_csv_atomic(export_path, fieldnames, approved_rows)
            except Exception as ex:
                self.send_json(500, {"error": f"Failed exporting approved rows: {ex}"})
                return

            rel_export = str(export_path.relative_to(CONTENT_DIR)).replace("\\", "/")
            self.send_json(200, {
                "ok": True,
                "exported_file": rel_export,
                "count": len(approved_rows),
                "total_rows": len(rows),
                "path": str(export_path)
            })


def main() -> None:
    parser = argparse.ArgumentParser(description="BrainCipher Content Review Workbench Server")
    parser.add_argument("--port", type=int, default=8977, help="Port to bind (default: 8977)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    args = parser.parse_args()

    port = args.port
    server_address = ("127.0.0.1", port)

    print("=" * 68)
    print("BrainCipher Content Review Workbench")
    print("=" * 68)
    print(f"Server binding: http://127.0.0.1:{port}/")
    print(f"Content directory: {CONTENT_DIR}")
    print(f"Safety: Bound to 127.0.0.1 ONLY. Outbound calls disabled.")
    print(f"Safety: _websters1913.json is protected and never touched.")
    print("=" * 68)

    ThreadingHTTPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer(server_address, ReviewRequestHandler)

    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(f"http://127.0.0.1:{port}/")).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server cleanly...")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
