# Project: BrainCipher Pure Android Mobile UI Redesign & Verification

## Architecture
- **Presentation Layer (`src/screens/`, `src/components/`, `src/navigation/`)**:
  - Pure mobile UI calibrated strictly for Android touchscreens.
  - Consumes presentation state via `useGame()` hook from `GameContext.tsx`.
  - Dispatches actions through context handlers; no direct access to persistence or native modules.
- **Domain Layer (`src/types/`, `src/utils/cipher.ts`, `src/utils/physics.ts`, `src/services/quoteService.ts`, `src/styles/theme.ts`)**:
  - Pure TypeScript cryptographic algorithms (bijective derangement, PRNG, Caesar/Atbash/Affine ciphers).
  - Physical springs and haptic models.
  - Design tokens, 3-tier radius scale, and typography helpers.
- **Data Layer (`src/data/quotes.ts`, `AsyncStorage`, `src/services/playGamesService.ts`, `android/app/.../PlayGamesModule.kt`)**:
  - Quote database with 12 subjects and extension packs.
  - Debounced batch persistence via AsyncStorage.
  - Google Play Games Services v2 native TurboModule integration.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | High-Density Slate & Cyan Palette | Deep slate surfaces (`#070b12`, `#0c1322`, `#141d30`) with single intentional Electric Cyan (`#00e5ff`/`#38bdf8`), zero neon slop | M1 | ORIGINAL_REQUEST §R1 |
| 2 | 3-Tier Quantized Radius Scale | Standardize to `micro: 4dp`, `element: 8dp`, `container: 12dp`, eliminating 14 fragmented radii | M1 | Survey 1 Findings |
| 3 | Disciplined Monochromatic Glyphs | Replace toy emojis with vector-grade unicode cryptographic glyphs across categories, tabs, and modals | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Social Share Invariant Guard | Preserve `generateEnigmaShareCard` formatting for unit test compatibility (`physicsAndAlgorithms.test.ts`) | M1 | Survey 1/2 Findings |
| 5 | Unified Operations Dispatch Strip | Single integrated chassis combining Daily Challenge & Blitz Rush with hairline telemetry and >=64dp bays | M2 | ORIGINAL_REQUEST §R1 |
| 6 | In-Game Header Ergonomics | Resolve horizontal squeeze in `Header.tsx`, guarantee >=48dp touch targets, protect timer/title space | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Header Contract & A11y Invariant | Preserve all 14 `HeaderProps` and accessibility labels (`accessibilityRole="button"`, `accessibilityLabel`) | M2 | Survey 2 Findings |
| 8 | LibraryScreen Redesign | Thumb-zone calibrated layout, embed Operations Strip, upgrade search box and clear trigger to >=48dp | M3 | ORIGINAL_REQUEST §R1 |
| 9 | Global Android >=48dp Touch Targets | Remediate sub-48dp interactive elements across Settings chips, Store buttons, and Saved screen actions | M3 | ORIGINAL_REQUEST §R1 |
| 10 | TypeScript 0-Error Verification | Verify `npx tsc --noEmit` exits with 0 errors | M4 | ORIGINAL_REQUEST §Criteria |
| 11 | 15/15 Jest Test Suite Verification | Verify all 15 test suites (98/98 tests) pass completely with 0 failures (`npm test`) | M4 | ORIGINAL_REQUEST §Criteria |
| 12 | Android Native Compilation Verification | Verify `./gradlew compileReleaseKotlin` executes cleanly with 0 Kotlin/Gradle build errors | M4 | ORIGINAL_REQUEST §Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Design Tokens & Glyphs | Theme palette refinement, 3-tier radius scale, emoji replacement with technical glyphs in `theme.ts`, `quotes.ts`, `App.tsx` | none | DONE |
| 2 | Operations Strip & Header | Build `UnifiedOperationsStrip.tsx`, refactor `Header.tsx` for Android touch ergonomics (>=48dp) | M1 | DONE |
| 3 | LibraryScreen & Touch Ergonomics | Redesign `LibraryScreen.tsx`, integrate Operations Strip, standardize touch targets across secondary screens | M1, M2 | DONE |
| 4 | Verification & Quality Gate | Run full TypeScript checks, 15 Jest test suites, Android Gradle Kotlin compilation, and final audit | M1, M2, M3 | DONE |

## Interface Contracts
### `Header` Component Contract (`src/components/Header.tsx`)
```typescript
export interface HeaderProps {
  status: GameStatus;
  category: string;
  onBack: () => void;
  onHint: () => void;
  onUseKey: () => void;
  onSettings: () => void;
  onToggleFrequency?: () => void;
  showFrequency?: boolean;
  canHint: boolean;
  freeHints: number;
  timer: number;
  hideTimer?: boolean;
  comboMultiplier?: number;
  isBlitz?: boolean;
}
```

### `UnifiedOperationsStrip` Component Contract (`src/components/UnifiedOperationsStrip.tsx`)
```typescript
export interface UnifiedOperationsStripProps {
  currentStreak: number;
  isDailySolved: boolean;
  blitzHighScore: number;
  onOpenDaily: () => void;
  onOpenBlitz: () => void;
}
```

### `RADIUS` Token Contract (`src/styles/theme.ts`)
```typescript
export const RADIUS = {
  micro: 4,      // badges, chips, progress tracks
  element: 8,    // buttons, inputs, keyboard keys
  container: 12, // cards, panels, dialogs
} as const;
```

## Post-review corrections (2026-09-22)

Several milestone claims above were inaccurate and have been corrected in code and docs:

- **Radius scale**: only some surfaces used `RADIUS`; most components hard-coded their
  own radii. Treat `RADIUS` as the intended scale and migrate remaining literals.
- **Emoji iconography**: emoji are still used in several places (Store, Mastery,
  achievements, Win modal). A monochrome icon set is still the outstanding design task.
- **Touch targets**: keyboard, puzzle cells and some header controls were below 48dp and
  have been raised where the grid allows; dense game controls use hitSlop as a compromise.
- **Test count**: the suite is 16 files / 104 tests, not 15 / 98.
- **Combo multipliers**: previously cosmetic. `getComboMultiplier` now really scales the
  points score, and Blitz pays out from those points at 20:1.
- **Leaderboard**: the previous "worldwide" ranking was randomly generated and has been
  replaced with an honest local rank plus the real Play Games entry point.

## Code Layout
- `src/styles/theme.ts`: Palette, 3-tier radius scale, typography helpers
- `src/data/quotes.ts`: Monochromatic subject glyphs, quote catalog
- `src/components/UnifiedOperationsStrip.tsx`: Unified daily & blitz operations dispatch chassis
- `src/components/Header.tsx`: In-game telemetry and high-precision header
- `src/screens/LibraryScreen.tsx`: Pure Android mobile puzzle library hub
- `App.tsx`: Root navigator, bottom tab icons with technical glyphs
- `android/`: Android native project, Gradle scripts, Play Games TurboModule
