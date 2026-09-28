# Content review workbench

Two sample batches of real, licensable puzzle candidates, produced by
`scripts/content/stage_samples.py`. Nothing here is AI-generated: WordNet and
Webster's 1913 are human-written reference works.

| File | Source | Licence | Fills |
|---|---|---|---|
| `review_wordnet_sample.csv` | Open English WordNet 2023 | CC BY 4.0 (attribution) | Short / Medium boards |
| `review_vintage_sample.csv` | Webster's Unabridged Dictionary (1913) | Public domain | Long / Epic boards |

## Your job (the only manual step)

Open either CSV in a spreadsheet and fill the **`status`** column per row:

- `approved` - ship it as-is
- `edit` - fix the term/definition/category, then approve
- `rejected` - drop it
- leave blank - decide later

Columns: `term, definition, raw_definition, category, proposed_difficulty,
alpha_count, char_count, source, license, confidence, status, notes`.

- `definition`: the board-safe cleaned text. This is what ships and what the reviewer edits.
- `raw_definition`: the untouched source text, kept for provenance.
- `category`: constant `lexicon` for every row. Per-row classification into 12 school subjects is gone; all imported dictionary rows live in ONE dedicated home: the free core subject "Lexicon" (`id: 'lexicon'`, label `Lexicon`, description `Words & Meanings`).
- `proposed_difficulty`: derived from the alphabetic letter count of the cleaned definition (Short <60, Medium 60-100, Long 101-150, Epic >150 letters).
- `confidence`: flags rows that need a closer look (e.g. `review-length` when char_count > 240).

### Board-Safe Allowlist
Definitions are strictly filtered to the board allowlist:
`^[A-Za-z .,'-]+$` (letters A-Z, a-z, space, period, comma, apostrophe, hyphen).
Nothing else leaks onto the board. All dictionary apparatus like `(Astron.)`, `(Obs.)`, `(n.)`, sense digits (`1.`), brackets, semicolons, and em dashes are stripped or unwrapped by `scripts/content/board_text.py`.

## Rules the importer will enforce

- `term` length <= 60 characters; keep it a single word where possible.
- `definition` must strictly conform to the board allowlist `^[A-Za-z .,'-]+$`.
- `definition` should read as one clear sense (Webster's entries are trimmed
  to their first sense automatically; check for truncation).
- **Append-only**: approved rows are appended to `src/data/quotes.ts`. The game
  derives puzzle ids from array index, so re-ordering or inserting would break
  players' saved progress.

## Re-running

```powershell
python scripts/content/stage_samples.py
```

`content/_websters1913.json` (21.9 MB, public domain) is the raw dataset and is
git-ignored. WordNet data is installed once via `python -m wn download oewn:2023`.

## Review workbench GUI

The Content Review Workbench is a local, keyboard-first web interface designed for reviewing thousands of candidate dictionary rows with high throughput and zero eye strain.

### Launching

From PowerShell or Command Prompt at the repository root, run:

```powershell
.\content-review.cmd
```

Or invoke the Python server directly:

```powershell
python scripts/content/review_server.py
```

Optional flags:
- `--port 8977`: set the listening port (default: `8977`).
- `--no-browser`: start server without automatically launching the browser.

The server binds strictly to `127.0.0.1` and makes no external network calls.

### Keyboard Map

The workbench is optimized for touch typists and long editing sessions. Single-letter shortcuts are automatically suppressed while editing text inputs.

| Shortcut | Action |
|---|---|
| `A` | **Approve** current row and advance to next in filter |
| `R` | **Reject** current row and advance to next in filter |
| `E` | **Flag for edit** and advance to next in filter |
| `Space` / `S` | **Skip** to next row without changing status |
| `J` / `Down` | Move to next row |
| `K` / `Up` | Move to previous row |
| `G` | Jump to first row |
| `Shift + G` | Jump to last row |
| `1` .. `4` | Assign difficulty tier (`1`=Short, `2`=Medium, `3`=Long, `4`=Epic) |
| `X` | **Re-clean from raw**: re-clean definition from `raw_definition` via `/api/clean` |
| `/` | Focus live search box |
| `Esc` | Unfocus input field or dismiss shortcut overlay |
| `U` | **Undo** last review action (history up to 50 actions deep) |
| `Ctrl + S` | Force save current edits immediately |
| `?` | Toggle in-app keyboard shortcut cheat sheet overlay |

### HTTP API Surface

The Python standard-library backend exposes a JSON REST API:

- `GET /api/files`: Returns list of review files with total rows and review progress statistics (`{ files: [{ name, rows, reviewed, approved, rejected, edit, unreviewed }] }`).
- `GET /api/rows?file=<NAME>`: Returns all rows with 0-based indices, column headers, warnings, and precomputed duplicate term analyses.
- `POST /api/clean`: Body `{ "text": "<RAW_OR_DIRTY_TEXT>" }`. Cleans definition using `scripts/content/board_text.py` and returns `{ "cleaned": str, "warnings": list[str], "alpha_count": int, "char_count": int, "tier": str }`.
- `PATCH /api/rows`: Applies specified field changes (`file`, `index`, `fields: {...}`). Validates category whitelist, updates letter/char counts, preserves unknown columns, and atomically rewrites the CSV.
- `POST /api/export`: Body `{ "file": "<NAME>" }`. Filters all rows whose status is `approved` and writes `content/approved_<basename>.csv`. Never modifies the source CSV.
- `GET /`: Serves the responsive, accessible single-file review application.

### Backup and Export Locations

- **Automatic Backups**: `content/.backups/<name>.<YYYYMMDD-HHMMSS>.csv`. Created automatically on the first write to any review CSV in a server session.
- **Approved Exports**: `content/approved_<basename>.csv`. Created when clicking the Export button or sending `POST /api/export`.

### Safety and Compatibility Invariants

1. **Byte-level CSV Compatibility**: Always written using Python's `csv.DictWriter` with `encoding="utf-8-sig"` (UTF-8 with BOM), minimal quoting (`QUOTE_MINIMAL`), and `\r\n` line terminators.
2. **Atomic Writes**: Writes first to a unique temporary file (`content/.tmp_*`) in the same directory, flushes and `fsync`s to disk, then atomically swaps into place using `os.replace`.
3. **No Row Mutations or Reordering**: Rows are never inserted, reordered, or deleted. Row indices remain stable and byte-compatible with the downstream quote importer.
4. **Data Protection**: `content/_websters1913.json` is strictly protected and never opened or modified by the workbench server.

