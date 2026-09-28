# BrainCipher Approved Content Importer

The approved content importer (`scripts/content/import_approved.py`) ingests vetted, board-safe lexicon definitions from the content review workbench into the production game quote database.

---

## 1. Quick Start & CLI Usage

From the repository root (Windows PowerShell or Command Prompt):

### Dry-Run (Preview only, no writes)
Inspect which entries would be added without modifying any files:
```powershell
python scripts/content/import_approved.py --dry-run
```

### Full Import
Scans all `content/review_*.csv` files and imports all rows where `status == 'approved'`:
```powershell
python scripts/content/import_approved.py
```

### Single-File Import
Restrict import to a single review batch:
```powershell
python scripts/content/import_approved.py --file review_vintage_sample.csv
# Or provide a relative/absolute path:
python scripts/content/import_approved.py --file content/review_wordnet_sample.csv
```

---

## 2. Validation Rules (Strict All-or-Nothing)

Every candidate row with `status == 'approved'` must pass all validation checks. If **any** row in the batch fails, the importer aborts with a descriptive error message and a non-zero exit code (`1`), writing **nothing** (all-or-nothing guarantee):

| Field | Rule | Details |
|---|---|---|
| `category` | `== 'lexicon'` | All imported dictionary rows belong exclusively to the free core subject `lexicon`. |
| `term` | `1 <= len <= 60` | The answer word or phrase; must not be empty or exceed 60 characters. |
| `definition` | `^[A-Za-z .,'-]+$` | Puzzle board allowlist: uppercase, lowercase, space, period, comma, apostrophe, hyphen. No digits, semicolons, brackets, or foreign symbols. |
| `alpha_count` | `>= 40` letters | Recomputed independently by counting `[A-Za-z]` occurrences (the CSV column value is not trusted blindly). |
| `duplicate guard` | Not in manifest | The term must not already exist in `content/imported.json` or appear more than once within the current import batch. |

---

## 3. The Append-Only Guarantee (WHY It Is Mandatory)

In BrainCipher, puzzle identifiers are **not** stored as static keys in the level definition. Instead, `src/services/quoteService.ts` derives puzzle IDs dynamically from the array index:

```typescript
// quoteService.ts line 42:
const availableQuotes = categoryQuotes
  .map((q, idx) => ({ ...q, id: `${category}-${idx}` }))
```

- For the `lexicon` category, puzzles are identified as `lexicon-0`, `lexicon-1`, `lexicon-2`, etc.
- A player's save game records solved levels by this ID string (e.g., `solvedIds.has('lexicon-12')`).
- **Critical Invariant**: Inserting entries at the beginning or middle, reordering entries, or rewriting existing entries would shift array indices and alter puzzle IDs for existing puzzles. This would corrupt players' solved progress, statistics, and bookmarked puzzles.
- **Implementation**: The importer strictly locates the closing bracket (`]`) of `lexicon: [...]` in `src/data/quotes.ts` and inserts new entries at the very end of the array, preserving all existing code, comments, indentation, and earlier entries.

---

## 4. Entry Formatting & Type Specification

Entries in `QUOTE_DB` are typed as `Record<string, Omit<LevelData, 'category' | 'id'>[]>`.

Each imported entry matches the exact style of existing categories in `src/data/quotes.ts`:
```typescript
    { text: "Definition text here.", author: "Answer Term" },
```

- **Indentation**: Exactly 4 spaces (`    `).
- **Quotes**: Double quotes (`"`), with internal double quotes escaped if needed.
- **Trailing Comma**: Each appended entry includes a trailing comma, ensuring subsequent imports can append cleanly without modifying previous lines.

### Critical Type Note: Length Tier vs Difficulty
- `proposed_difficulty` in review CSVs is a **Length Tier** (`Short` < 60 letters, `Medium` 60–100, `Long` 101–150, `Epic` > 150), derived from board letter counts.
- It is **not** the game's gameplay `Difficulty` (`Easy | Normal | Hard | Legendary`).
- Consistent with all other subjects in `QUOTE_DB`, the `difficulty` field is omitted on imported entries. If explicit difficulty mapping is required in the future, the canonical mapping is:
  - `Short` &rarr; `Easy`
  - `Medium` &rarr; `Normal`
  - `Long` &rarr; `Hard`
  - `Epic` &rarr; `Legendary`

---

## 5. Tracking & Provenance Files

### Manifest: `content/imported.json`
Stores the set of all previously imported terms as a JSON array of strings:
```json
[
  "selenic",
  "ketone"
]
```
- Ensures idempotency: re-running the importer on a previously imported batch immediately detects existing terms and refuses to duplicate them.

### Attribution: `content/sources.json`
Records source provenance and licensing terms for each imported term:
```json
{
  "rational motive": {
    "source": "Open English WordNet 2023 (oewn:2023)",
    "license": "CC BY 4.0 - attribution required"
  },
  "selenic": {
    "source": "Webster's Unabridged Dictionary (1913)",
    "license": "Public domain"
  }
}
```
- **Attribution Auditing**: Required to fulfill Creative Commons Attribution 4.0 (CC BY 4.0) requirements for WordNet content, and maintains audit trails for vintage public domain entries.

---

## 6. Atomic File Safety

To ensure that file writes cannot be corrupted if a process is interrupted:
1. Files are written first to a unique temporary file (`.tmp_*`) in the same directory.
2. The file is flushed and synced to disk (`os.fsync`).
3. The temporary file is closed and replaced atomically via `os.replace`.

---

## 7. Running Unit Tests

The test suite tests the importer against temporary copies in isolated temp directories, ensuring `src/data/quotes.ts` and review files are never mutated during test runs:

```powershell
python scripts/content/test_import.py -v
```
