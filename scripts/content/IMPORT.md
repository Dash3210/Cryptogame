# BrainCipher Approved Content Importer

The approved content importer (`scripts/content/import_approved.py`) ingests vetted, board-safe curriculum definitions from review batches into the production game quote database (`src/data/quotes.ts`).

The importer is branch-aware and integrates with the Global Term Registry (`content/term_registry.json`) to enforce cross-subject term uniqueness and branch-level progression.

---

## 1. Quick Start & CLI Usage

From the repository root (PowerShell or Bash):

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

### Advanced CLI Flags
- `--quotes-path <path>`: Target `quotes.ts` (default: `src/data/quotes.ts`).
- `--manifest-path <path>`: Target `imported.json` (default: `content/imported.json`).
- `--sources-path <path>`: Target `sources.json` (default: `content/sources.json`).
- `--registry-path <path>`: Global term registry (default: `content/term_registry.json`).
- `--physics-branches-path <path>`: Physics branch map (default: `content/openstax/physics_branches.json`).
- `--content-dir <dir>`: Content folder for review CSV discovery (default: `content`).

---

## 2. Validation Rules (Strict All-or-Nothing)

Every candidate row with `status == 'approved'` must pass all validation checks. If **any** row in the batch fails, the importer aborts with a descriptive error message and a non-zero exit code (`1`), writing **nothing** (all-or-nothing guarantee):

| Field | Rule | Details |
|---|---|---|
| `branch` | Registered branch ID | Resolved from `branch` column if present and non-empty, falling back to `category`. Must appear in `BRANCHES` in `src/data/quotes.ts` OR `content/openstax/physics_branches.json`. |
| `term` | `1 <= len <= 60` | The answer word or phrase; must not be empty or exceed 60 characters. |
| `definition` | `^[A-Za-z .,'-]+$` | Puzzle board allowlist: uppercase, lowercase, space, period, comma, apostrophe, hyphen. No digits, semicolons, brackets, or math notation. |
| `alpha_count` | `>= 40` letters | Recomputed independently by counting `[A-Za-z]` occurrences (the CSV column value is not trusted blindly). |
| `term registry` | Single-owner invariant | The normalised term (`normalize_term(term)`) must NOT already be owned by a different branch in `content/term_registry.json`. Cross-branch duplicates are rejected. |
| `manifest duplicate guard` | Idempotent skip | If an approved row's term is already recorded in `content/imported.json` for the same branch, it is skipped as already imported to prevent duplicates. |
| `batch uniqueness` | No duplicate terms in batch | A term cannot appear multiple times within the unimported rows of the current import batch. |

---

## 3. The Append-Only Guarantee (WHY It Is Mandatory)

### Deterministic Puzzle IDs via `getLevelId`
Puzzle identifiers in BrainCipher are **content-derived**, not index-derived. In `src/services/quoteService.ts`:
```typescript
export function getLevelId(
    category: string,
    entry: { id?: string; author: string; text?: string },
    indexOrList?: number | Array<{ id?: string; author: string; text?: string }>,
    list?: Array<{ id?: string; author: string; text?: string }>
): string {
    if (entry.id && entry.id.trim().length > 0) return entry.id;
    const baseSlug = slugify(entry.author) || 'entry';
    const baseId = `${category}-${baseSlug}`;
    ...
}
```
Base IDs follow the format `${branch}-${slug(entry.author)}` (e.g. `physics-mechanics-centripetal-acceleration`). If duplicate slugs occur within a branch array, collisions are disambiguated by appending `-2`, `-3`, etc., in order of appearance.

### Why Append-Only Ordering Remains Mandatory
Even though IDs are content-derived:
1. **Curriculum Progression**: Functions like `getNextQuote` present puzzles sequentially in the order authored within the array.
2. **Branch & Track Mastery**: Progress calculations (`getBranchProgress`, `isBranchComplete`, `getTrackProgress`) iterate over the array in curriculum order.
3. **Save State Integrity**: Any shift or reordering of entries can disrupt collision counter resolution (`-2`, `-3`) for identical slugs and alter progression ordering.
4. **Invariant**: All imports MUST strictly append before the closing bracket (`]`) of the target branch's array, preserving all existing entries, indentation, comments, and line endings.

---

## 4. Entry Formatting & Branch Insertion

Entries in `QUOTE_DB` are typed as `Record<string, Omit<LevelData, 'category'>[]>`.

Each imported entry matches the exact style of existing categories in `src/data/quotes.ts`:
```typescript
    { text: "The acceleration of an object moving in a circle directed toward the center of curvature.", author: "centripetal acceleration" },
```

- **Indentation**: Exactly 4 spaces (`    `).
- **Quotes**: Double quotes (`"`), with internal double quotes escaped if needed.
- **Trailing Comma**: Each appended entry includes a trailing comma, ensuring subsequent imports can append cleanly without modifying previous lines.
- **Branch Routing**: Entries are routed to their validated branch array (e.g. `physics-mechanics`, `physics-optics`, `lexicon`). If the branch array does not yet exist in `QUOTE_DB`, the importer creates the array block before `QUOTE_DB`'s closing `};`, quoting the key if it contains hyphens.

### Length Tier vs Difficulty Note
- `proposed_difficulty` in review CSVs is a **Length Tier** (`Short` < 60 letters, `Medium` 60–100, `Long` 101–150, `Epic` > 150), derived from board letter counts.
- It is **not** the game's gameplay `Difficulty` (`Easy | Normal | Hard | Legendary`).
- Consistent with all other subjects in `QUOTE_DB`, the `difficulty` field is omitted on imported entries.

---

## 5. Tracking & Provenance Files

### Global Term Registry: `content/term_registry.json`
Enforces the project invariant that each topic/term belongs to exactly one branch across all subjects:
```json
{
  "acceleration due to gravity": "physics-mechanics",
  "accommodation": "physics-optics",
  "antibodies": "biology",
  "selenic": "lexicon"
}
```
If an incoming approved row attempts to claim a term that is already registered to another branch, the importer refuses the import with a `CROSS-BRANCH DUPLICATE` error.

### Manifest: `content/imported.json`
Stores the set of all previously imported terms as a JSON array of strings:
```json
[
  "selenic",
  "ketone"
]
```
Ensures idempotency: re-running the importer on an already-imported batch skips those rows cleanly and produces a no-op without duplicating array entries.

### Attribution: `content/sources.json`
Records source provenance and licensing terms for each imported term:
```json
{
  "centripetal acceleration": {
    "source": "OpenStax College Physics",
    "license": "CC BY 4.0"
  },
  "selenic": {
    "source": "Webster's Unabridged Dictionary (1913)",
    "license": "Public domain"
  }
}
```
Attribution auditing is required to fulfill Creative Commons Attribution 4.0 (CC BY 4.0) requirements for OpenStax and WordNet content, and maintains audit trails for vintage public domain entries.

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
