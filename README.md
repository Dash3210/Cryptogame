# BrainCipher

An Android cryptogram puzzle game built with React Native 0.83.1 (Hermes, New Architecture).
Each puzzle hides a definition or quote behind a substitution cipher: use frequency
analysis, starter hints, or the master key to reveal the text.

## Features

- **12 subject archives** (7 core + 5 purchasable extensions), 15 puzzles each.
- **Daily Cipher** with local-day streaks and a calendar.
- **Blitz Rush**: 90-second speed mode with combo multipliers and a points-to-coins payout.
- **Coins economy**: transparent per-solve ledger (mistakes, hints, overtime, master key, clean bonus).
- **Casual loops**: achievements, mastery progress, saved quotes, 7 themes.
- **Google Play Games** hooks for leaderboards (requires a real project id).
- **Rewarded ads** (AdMob) for optional hints, coins and unlocks.

## Tech stack

React Native 0.83.1, React 19, TypeScript (strict), React Navigation 7, AsyncStorage,
react-native-google-mobile-ads, Google Play Games Services v2 (Kotlin bridge).

## Project layout

```
App.tsx                     Root: providers, tabs and stack navigation
src/
  context/GameContext.tsx   Global state: economy, stats, achievements, persistence
  screens/                  Library, Game, Daily, Blitz, Store, Mastery, Leaderboard,
                            Saved, Settings, Splash
  components/               PuzzleBoard, VirtualKeyboard, Header, FrequencyBar,
                            WinCelebrationModal, DailyQuoteModal, ...
  utils/cipher.ts           Cipher generation, hints, scoring, coin economy
  utils/physics.ts          Springs, haptics, share-card generator
  utils/date.ts             Local "game day" helpers
  services/                 quoteService, adService, playGamesService
  data/quotes.ts            Puzzle, daily and Blitz content
  styles/theme.ts           Color themes, typography, radius tokens
android/                    Android project + PlayGames native module
ios/                        iOS shell
web/index.html              Standalone landing page with a playable demo
```

## Getting started

Requires Node >= 20, JDK 17, and the Android SDK. From the project root:

```sh
npm install
npm start                 # Metro
npm run android           # build and run on a device/emulator
```

## Quality gates

```sh
npm run typecheck         # tsc --noEmit
npm run lint              # eslint . (errors must be zero; --quiet for errors only)
npm test                  # jest (all suites)
```

CI runs these three on every push and pull request (`.github/workflows/ci.yml`).

## Release build

Release signing keys are read from `local.properties` (gitignored). Create it with:

```properties
BRAINCIPHER_UPLOAD_STORE_FILE=/absolute/path/to/upload.keystore
BRAINCIPHER_UPLOAD_STORE_PASSWORD=...
BRAINCIPHER_UPLOAD_KEY_ALIAS=...
BRAINCIPHER_UPLOAD_KEY_PASSWORD=...
```

Then:

```sh
cd android
./gradlew bundleRelease     # or assembleRelease for an APK
```

If the signing keys are missing, Gradle logs a warning and the release output is unsigned.

## Production configuration (required before shipping)

The following values are placeholders in this repository and must be set to real ids:

| Setting | File | Notes |
|---|---|---|
| Play Games project id | `android/app/src/main/res/values/strings.xml` | Referenced by `AndroidManifest.xml` |
| Leaderboard ids | `src/services/playGamesService.ts` | `GLOBAL_CIPHER_IQ`, `BLITZ_RUSH_HIGH_SCORE` |
| AdMob app id | `app.json` | Android is set; iOS uses a Google test id |
| AdMob rewarded unit | `src/services/adService.ts` | Android production unit |

While the Play Games ids are placeholders, sign-in and global rankings are unavailable;
the app shows an honest "open Play Games" state instead of fabricated data.

## Ads and privacy

Ads are requested as **non-personalized** (`requestNonPersonalizedAdsOnly: true`).
Before publishing in the EEA/UK, add a Google UMP consent flow and keep
`PRIVACY_POLICY.md` and the Play Data Safety form consistent with the ad SDK.

## Content model

`QUOTE_DB` entries are definitions: `text` is the clue and `author` is the answer term.
`DAILY_QUOTES` entries are real quotes with a real author. The UI renders them
accordingly (a definition shows "Answer:", a quote shows an attribution).
