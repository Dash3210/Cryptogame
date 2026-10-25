import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { AD_CONFIG } from '../services/adConfig';

/**
 * Screen routes where banners are strictly forbidden by product rule.
 * Banners are NEVER permitted during puzzle solving or timed challenges.
 */
export const FORBIDDEN_BANNER_ROUTES = new Set([
    'Game',
    'Blitz',
    'DailyChallenge',
    'DailyCipher',
    'Daily',
    'GameScreen',
    'BlitzScreen',
    'DailyChallengeScreen',
]);

/**
 * Screen routes where banners are explicitly permitted.
 */
export const ALLOWED_BANNER_ROUTES = new Set([
    'Library',
    'Store',
]);

export function isBannerAllowedOnScreen(screenName?: string): boolean {
    if (!screenName) return false;
    if (FORBIDDEN_BANNER_ROUTES.has(screenName)) return false;
    return ALLOWED_BANNER_ROUTES.has(screenName);
}

export interface AdBannerProps {
    screenName?: string;
    testID?: string;
}

/**
 * Reusable banner ad component with hard guardrails:
 * 1. Placement restricted to Library and Store screens only.
 * 2. Absolutely forbidden on GameScreen, BlitzScreen, and DailyChallengeScreen.
 * 3. On load failure or before loading, collapses cleanly to zero height (no empty grey box or jump).
 * 4. Respects safe area insets to prevent overlapping with system navigation / gesture bar.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ screenName, testID = 'ad-banner-container' }) => {
    const insets = useSafeAreaInsets();
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    let currentRouteName: string | undefined = screenName;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const route = useRoute();
        if (route?.name) {
            currentRouteName = route.name;
        }
    } catch {
        // Not mounted inside a navigation container (e.g. standalone test)
    }

    // Hard guardrail 1: Forbidden on puzzle and timed challenge screens
    if (currentRouteName && FORBIDDEN_BANNER_ROUTES.has(currentRouteName)) {
        return null;
    }

    // Hard guardrail 2: Allowed ONLY on Library and Store
    if (!currentRouteName || !ALLOWED_BANNER_ROUTES.has(currentRouteName)) {
        return null;
    }

    // On load failure, collapse cleanly to zero height
    if (hasError) {
        return null;
    }

    return (
        <View
            testID={testID}
            style={[
                styles.container,
                !isLoaded ? styles.collapsed : { paddingBottom: Math.max(0, insets.bottom) },
            ]}
        >
            <BannerAd
                unitId={AD_CONFIG.units.banner}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
                onAdLoaded={() => {
                    setIsLoaded(true);
                    setHasError(false);
                }}
                onAdFailedToLoad={() => {
                    setIsLoaded(false);
                    setHasError(true);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    collapsed: {
        height: 0,
        overflow: 'hidden',
    },
});
