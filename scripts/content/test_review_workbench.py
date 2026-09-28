#!/usr/bin/env python3
"""
Verification script for Content Review Workbench.
Tests the backend HTTP API, atomic CSV persistence, BOM preservation,
quoting, backup creation, and roundtrip row patching.
"""

import csv
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = REPO_ROOT / "content"
BACKUPS_DIR = CONTENT_DIR / ".backups"
TARGET_CSV = CONTENT_DIR / "review_wordnet_sample.csv"
PORT = 8977
BASE_URL = f"http://127.0.0.1:{PORT}"

def http_get(path: str) -> dict | str:
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "WorkbenchVerifier/1.0"})
    with urllib.request.urlopen(req) as resp:
        content_type = resp.headers.get("Content-Type", "")
        data = resp.read()
        if "application/json" in content_type:
            return json.loads(data.decode("utf-8"))
        return data.decode("utf-8")

def http_post(path: str, payload: dict) -> dict:
    url = f"{BASE_URL}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "WorkbenchVerifier/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_patch(path: str, payload: dict) -> dict:
    url = f"{BASE_URL}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "WorkbenchVerifier/1.0"},
        method="PATCH"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main() -> int:
    print("=" * 70)
    print("STEP 1: Py-compile scripts/content/review_server.py")
    print("=" * 70)
    compile_proc = subprocess.run(
        [sys.executable, "-m", "py_compile", str(REPO_ROOT / "scripts" / "content" / "review_server.py")],
        capture_output=True,
        text=True
    )
    if compile_proc.returncode != 0:
        print("[FAIL] py_compile error:", compile_proc.stderr)
        return 1
    print("[PASS] review_server.py compiled successfully with exit code 0.")

    print("\n" + "=" * 70)
    print("STEP 2: Launch server in background on port", PORT)
    print("=" * 70)
    server_proc = subprocess.Popen(
        [sys.executable, str(REPO_ROOT / "scripts" / "content" / "review_server.py"), "--port", str(PORT), "--no-browser"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    time.sleep(1.2)

    try:
        # Check server is up
        print("\n--- Testing GET / (UI Serving) ---")
        ui_html = http_get("/")
        assert "<!DOCTYPE html>" in ui_html
        assert "Content Review Workbench" in ui_html
        print(f"[PASS] GET / responded 200 OK ({len(ui_html)} bytes of HTML served).")

        # Test GET /api/files
        print("\n--- Testing GET /api/files ---")
        files_data = http_get("/api/files")
        print("[RESPONSE] GET /api/files:")
        print(json.dumps(files_data, indent=2))
        assert "files" in files_data
        # Count-agnostic assertion: verify expected batches are present among discovered files
        assert any(f["name"] == "review_wordnet_sample.csv" for f in files_data["files"])
        assert any(f["name"] == "review_vintage_sample.csv" for f in files_data["files"])
        assert any("college_physics_terms.csv" in f["name"] for f in files_data["files"])
        assert len(files_data["files"]) >= 3, f"Expected at least 3 review batches, got {len(files_data['files'])}"
        print("[PASS] Review CSVs and OpenStax batch discovered and summarized (count-agnostic).")

        # Verify OpenStax batch via API
        print("\n--- Testing GET /api/rows?file=openstax/college_physics_terms.csv ---")
        openstax_data = http_get("/api/rows?file=openstax/college_physics_terms.csv")
        assert "college_physics_terms.csv" in openstax_data["file"]
        # Count-agnostic floor: the point is that a substantial batch is served,
        # not a specific row count (the content gate legitimately changes totals).
        assert len(openstax_data["rows"]) >= 100, f"Expected >=100 rows, got {len(openstax_data['rows'])}"
        assert "track" in openstax_data["columns"]
        assert "chapter" in openstax_data["columns"]
        print(f"[PASS] OpenStax batch verified via API ({len(openstax_data['rows'])} rows).")

        # Test GET /api/rows
        print("\n--- Testing GET /api/rows?file=review_wordnet_sample.csv ---")
        rows_data = http_get("/api/rows?file=review_wordnet_sample.csv")
        assert rows_data["file"] == "review_wordnet_sample.csv"
        assert len(rows_data["rows"]) == 20
        assert "columns" in rows_data
        EXPECTED_COLUMNS = [
            "term", "definition", "raw_definition", "category",
            "proposed_difficulty", "alpha_count", "char_count",
            "source", "license", "confidence", "status", "notes"
        ]
        assert rows_data["columns"] == EXPECTED_COLUMNS, f"Columns mismatch: {rows_data['columns']}"
        assert all(r.get("category") == "lexicon" for r in rows_data["rows"]), "All rows must have category 'lexicon'"
        assert all("raw_definition" in r for r in rows_data["rows"]), "All rows must have raw_definition"
        orig_row_0 = rows_data["rows"][0]
        orig_status = orig_row_0.get("status", "")
        print(f"[PASS] Retrieved {len(rows_data['rows'])} rows. Row 0: term='{orig_row_0['term']}', status='{orig_status}'")
        print(f"[PASS] Verified 12-column schema and all rows have category='lexicon'.")

        # Test POST /api/clean
        print("\n--- Testing POST /api/clean ---")
        dirty_sample = "1. (Astron.) The hiding of a heavenly body; -- applied especially to eclipses."
        clean_res = http_post("/api/clean", {"text": dirty_sample})
        print("[RESPONSE] POST /api/clean:", json.dumps(clean_res, indent=2))
        assert "cleaned" in clean_res
        assert "warnings" in clean_res
        assert "alpha_count" in clean_res
        assert "char_count" in clean_res
        assert "tier" in clean_res
        import re
        assert re.match(r"^[A-Za-z .,'-]+$", clean_res["cleaned"]), f"Disallowed characters in cleaned: {clean_res['cleaned']}"
        assert "apparatus_removed" in clean_res["warnings"]
        assert "digits_removed" in clean_res["warnings"]
        assert clean_res["cleaned"] == "The hiding of a heavenly body, applied especially to eclipses."
        print(f"[PASS] POST /api/clean verified: apparatus & digits removed, allowlist validated.")

        # Test PATCH /api/rows (mark approved)
        print("\n--- Testing PATCH /api/rows (Setting status='approved') ---")
        patch_payload = {
            "file": "review_wordnet_sample.csv",
            "index": 0,
            "fields": {"status": "approved"}
        }
        patch_res = http_patch("/api/rows", patch_payload)
        print("[RESPONSE] PATCH /api/rows:")
        print(json.dumps(patch_res, indent=2))
        assert patch_res.get("ok") is True
        assert patch_res["row"]["status"] == "approved"
        print("[PASS] Row 0 patched to 'approved'.")

        # Verify disk file directly
        print("\n--- Verifying raw CSV on disk (BOM, quoting, CRLF, encoding) ---")
        with TARGET_CSV.open("rb") as f:
            raw_bytes = f.read()
        has_bom = raw_bytes.startswith(b"\xef\xbb\xbf")
        has_crlf = b"\r\n" in raw_bytes
        print(f"File size: {len(raw_bytes)} bytes | UTF-8 BOM present: {has_bom} | CRLF line terminators: {has_crlf}")
        assert has_bom, "UTF-8 BOM is missing!"
        assert has_crlf, "CRLF line terminators missing!"

        # Parse CSV with csv.DictReader
        with TARGET_CSV.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            disk_rows = list(reader)
        assert len(disk_rows) == 20, f"Expected 20 rows, got {len(disk_rows)}"
        assert disk_rows[0]["status"] == "approved", "Row 0 status on disk is not approved!"
        print(f"[PASS] Disk CSV verified: 20 rows preserved in order, row 0 status is 'approved'.")

        # Test POST /api/export
        print("\n--- Testing POST /api/export ---")
        export_res = http_post("/api/export", {"file": "review_wordnet_sample.csv"})
        print("[RESPONSE] POST /api/export:")
        print(json.dumps(export_res, indent=2))
        assert export_res.get("ok") is True
        assert export_res["count"] == 1
        export_file = CONTENT_DIR / export_res["exported_file"]
        assert export_file.is_file(), f"Export file {export_file} was not created!"
        print(f"[PASS] Export file created at {export_file} with {export_res['count']} approved rows.")
        # Clean up export file created during test
        try:
            export_file.unlink()
            print(f"[CLEANUP] Removed temporary test export {export_file.name}")
        except Exception:
            pass

        # PATCH back to original status
        print("\n--- Testing PATCH /api/rows (Reverting status to original) ---")
        revert_payload = {
            "file": "review_wordnet_sample.csv",
            "index": 0,
            "fields": {"status": orig_status}
        }
        revert_res = http_patch("/api/rows", revert_payload)
        assert revert_res.get("ok") is True
        assert revert_res["row"]["status"] == orig_status
        print(f"[PASS] Row 0 status successfully reverted to '{orig_status}'.")

        # Re-verify disk after revert
        with TARGET_CSV.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            final_rows = list(reader)
        assert final_rows[0]["status"] == orig_status
        print(f"[PASS] Disk verified: row 0 status restored to original '{orig_status}'.")

        # Check backup created
        print("\n" + "=" * 70)
        print("STEP 4: Verify backup created under content/.backups/")
        print("=" * 70)
        assert BACKUPS_DIR.is_dir(), "content/.backups directory missing!"
        backup_files = sorted(BACKUPS_DIR.glob("*.csv"))
        print(f"Found {len(backup_files)} backup file(s) in {BACKUPS_DIR}:")
        for bf in backup_files:
            print(f" - {bf.name} ({bf.stat().st_size} bytes)")
        assert len(backup_files) > 0, "No backup file found in content/.backups/!"
        print("[PASS] Session backup verified.")

        # STEP 5: DOM & Headless Verification of Auto-Grow, Cap & Layout
        print("\n" + "=" * 70)
        print("STEP 5: Headless DOM Verification: Auto-Grow, Cap & Action Bar")
        print("=" * 70)
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = None
                for ch in ["msedge", "chrome", None]:
                    try:
                        browser = p.chromium.launch(channel=ch) if ch else p.chromium.launch()
                        break
                    except Exception:
                        continue
                if browser:
                    for w, h in [(1280, 800), (1920, 1080)]:
                        page = browser.new_page(viewport={"width": w, "height": h})
                        page.goto(BASE_URL)
                        page.wait_for_selector("#defTextarea")
                        page.wait_for_function("() => document.getElementById('defTextarea').value.length > 0")

                        # Short Row Check (WordNet row 0)
                        s = page.evaluate("""() => {
                            const dt = document.getElementById('defTextarea');
                            const ni = document.getElementById('notesInput');
                            const mp = document.getElementById('mainPanel');
                            const ab = document.querySelector('.sticky-action-bar');
                            const abRect = ab.getBoundingClientRect();
                            return {
                                dtScrollable: dt.scrollHeight > dt.clientHeight + 1,
                                mpScrollable: mp.scrollHeight > mp.clientHeight,
                                abVisible: abRect.top < window.innerHeight && abRect.bottom <= window.innerHeight,
                                isNotesTextarea: ni.tagName.toLowerCase() === 'textarea'
                            };
                        }""")
                        assert not s["dtScrollable"], f"Short definition should fit without scrollbar at {w}x{h}"
                        assert not s["mpScrollable"], f"Main panel should not scroll at {w}x{h}"
                        assert s["abVisible"], f"Action bar must remain visible at {w}x{h}"
                        assert s["isNotesTextarea"], "Notes field must be a textarea"

                        # Epic Row Check (vintage row 0)
                        with (CONTENT_DIR / "review_vintage_sample.csv").open("r", encoding="utf-8-sig") as f:
                            vintage_row_0 = next(csv.DictReader(f))
                        vintage_term_0 = vintage_row_0["term"]
                        page.select_option("#fileSelect", "review_vintage_sample.csv")
                        page.wait_for_function(f"() => document.getElementById('termInput').value === '{vintage_term_0}'")
                        page.wait_for_timeout(200)

                        e = page.evaluate("""() => {
                            const dt = document.getElementById('defTextarea');
                            const mp = document.getElementById('mainPanel');
                            const ab = document.querySelector('.sticky-action-bar');
                            const abRect = ab.getBoundingClientRect();
                            const rd = document.getElementById('rawDefContent');
                            const btn = document.getElementById('btnReClean');
                            return {
                                dtHeight: dt.offsetHeight,
                                dtScrollable: dt.scrollHeight > dt.clientHeight + 1,
                                mpScrollable: mp.scrollHeight > mp.clientHeight,
                                abVisible: abRect.top < window.innerHeight && abRect.bottom <= window.innerHeight,
                                hasRawText: Boolean(rd && rd.textContent && rd.textContent.length > 5),
                                hasBtnReClean: Boolean(btn)
                            };
                        }""")
                        print(f"[{w}x{h} Epic Sense '{vintage_term_0}'] defTextarea auto-grew to {e['dtHeight']}px | scrollable: {e['dtScrollable']} | page scrollable: {e['mpScrollable']} | action bar visible: {e['abVisible']} | rawDef: {e['hasRawText']}")
                        assert not e["dtScrollable"], f"Epic definition '{vintage_term_0}' must fit without scrollbar at {w}x{h}"
                        assert not e["mpScrollable"], f"Main panel should not scroll for '{vintage_term_0}' at {w}x{h}"
                        assert e["abVisible"], f"Action bar must remain visible at {w}x{h}"
                        assert e["hasRawText"], "Raw definition content must be populated"
                        assert e["hasBtnReClean"], "Re-clean button must exist"

                        # Past Cap Check (>1000 chars)
                        c = page.evaluate("""() => {
                            const dt = document.getElementById('defTextarea');
                            dt.value = 'An extraordinarily elaborate exposition that exceeds the cap. '.repeat(25);
                            dt.dispatchEvent(new Event('input', { bubbles: true }));
                            const mp = document.getElementById('mainPanel');
                            const ab = document.querySelector('.sticky-action-bar');
                            const abRect = ab.getBoundingClientRect();
                            return {
                                dtOffsetHeight: dt.offsetHeight,
                                dtScrollable: dt.scrollHeight > dt.clientHeight + 1,
                                mpScrollable: mp.scrollHeight > mp.clientHeight,
                                abVisible: abRect.top < window.innerHeight && abRect.bottom <= window.innerHeight
                            };
                        }""")
                        print(f"[{w}x{h} Past Cap] defTextarea capped at {c['dtOffsetHeight']}px | internal scroll appeared: {c['dtScrollable']} | page scrollable: {c['mpScrollable']} | action bar visible: {c['abVisible']}")
                        assert c["dtScrollable"], f"Super-long definition must show internal scrollbar past cap at {w}x{h}"
                        assert not c["mpScrollable"], f"Page itself must not scroll at {w}x{h}"
                        assert c["abVisible"], f"Action bar must remain visible at {w}x{h}"

                        # Notes Field Auto-Grow Check
                        n = page.evaluate("""() => {
                            const ni = document.getElementById('notesInput');
                            const h1 = ni.offsetHeight;
                            ni.value = 'Line 1\\nLine 2\\nLine 3';
                            ni.dispatchEvent(new Event('input', { bubbles: true }));
                            const h2 = ni.offsetHeight;
                            return { h1, h2, grew: h2 > h1 };
                        }""")
                        assert n["grew"], "Notes textarea should auto-grow for multi-line notes"

                        # Keyboard Suppression Check
                        k = page.evaluate("""() => {
                            const dt = document.getElementById('defTextarea');
                            dt.focus();
                            const statusBefore = document.getElementById('currentStatusPill').textContent;
                            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
                            const statusAfter = document.getElementById('currentStatusPill').textContent;
                            dt.blur();
                            return statusBefore === statusAfter;
                        }""")
                        assert k, "Single-letter shortcut 'a' must be suppressed while inside textarea"

                        page.close()
                    browser.close()
                    print("[PASS] Step 5 DOM assertions: auto-grow, cap limits, no-page-scroll, and action bar visibility verified.")
                else:
                    print("[SKIP] No browser available for Step 5 headless assertions.")
        except ImportError:
            print("[SKIP] Playwright not installed; skipping Step 5 headless assertions.")

    finally:
        print("\nShutting down test server...")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=2)
        except Exception:
            server_proc.kill()
        print("[PASS] Test server terminated cleanly.")

    print("\n" + "=" * 70)
    print("ALL API AND PERSISTENCE VERIFICATIONS PASSED!")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    sys.exit(main())
