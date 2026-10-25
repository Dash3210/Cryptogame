import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Production AdMob Ad Unit IDs.
 *
 * IMPORTANT FOR APP OWNER:
 * - REWARDED is currently configured with the verified AdMob unit ID.
 * - BANNER and INTERSTITIAL use clearly-marked PLACEHOLDER constants.
 *   The app owner MUST replace these with real production AdMob Ad Unit IDs
 *   before releasing to the Play Store or App Store.
 * - Do NOT invent plausible-looking real unit IDs: fake IDs in release builds
 *   silently earn nothing.
 */
export const PRODUCTION_AD_UNITS = {
    BANNER: 'ca-app-pub-PLACEHOLDER/BANNER',
    INTERSTITIAL: 'ca-app-pub-PLACEHOLDER/INTERSTITIAL',
    REWARDED: 'ca-app-pub-9087778942896444/3099185756',
} as const;

/**
 * Google Mobile Ads SDK test unit IDs for local development and QA.
 */
export const TEST_AD_UNITS = {
    BANNER: TestIds.BANNER,
    INTERSTITIAL: TestIds.INTERSTITIAL,
    REWARDED: TestIds.REWARDED,
} as const;

/**
 * Centralized Ad Configuration.
 * Controls ad unit IDs (dev vs production) and hardcoded cadence/cap policies.
 */
export const AD_CONFIG = {
    units: {
        banner: __DEV__ ? TEST_AD_UNITS.BANNER : PRODUCTION_AD_UNITS.BANNER,
        interstitial: __DEV__ ? TEST_AD_UNITS.INTERSTITIAL : PRODUCTION_AD_UNITS.INTERSTITIAL,
        rewarded: __DEV__ ? TEST_AD_UNITS.REWARDED : PRODUCTION_AD_UNITS.REWARDED,
    },
    cadence: {
        /** Number of solved standard levels between interstitial ad impressions */
        interstitialIntervalSolves: 5,
        /** Minimum cooldown time in seconds between two interstitial ad impressions */
        interstitialCooldownSeconds: 90,
        /** Number of standard levels solved after first install before interstitials are eligible */
        interstitialInitialGraceSolves: 3,
        /** Maximum rewarded video impressions allowed per user per calendar day */
        rewardedDailyCap: 20,
        /** Number of rewarded ad completions required to permanently unlock an extension subject */
        subjectUnlockRequiredAds: 2,
    },
} as const;
