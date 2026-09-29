import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Alert } from 'react-native';

const adUnitId = __DEV__
    ? TestIds.REWARDED
    : 'ca-app-pub-9087778942896444/3099185756'; // Replace with real ID in production

// Class-based Service with error handling and proper listener cleanup
class AdService {
    private rewardedAd: RewardedAd | null = null;
    private isLoaded = false;
    private onRewardCallback: (() => void) | null = null;
    public isInitialized = false;
    private unsubscribers: (() => void)[] = [];
    private initTimeout: ReturnType<typeof setTimeout> | null = null;
    private retryTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        // Delay initialization to avoid issues during module load
        this.initTimeout = setTimeout(() => this.init(), 1000);
    }

    private init() {
        this.initTimeout = null;
        try {
            this.load();
            this.isInitialized = true;
        } catch (e) {
            console.error('AdService init failed:', e);
        }
    }

    dispose() {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        this.removeListeners();
        this.cancelPendingReward();
        this.isLoaded = false;
        this.rewardedAd = null;
    }

    private removeListeners() {
        this.unsubscribers.forEach(unsub => {
            try { unsub(); } catch { /* ignore */ }
        });
        this.unsubscribers = [];
    }

    load() {
        try {
            // Remove any existing listeners before creating a new ad
            this.removeListeners();

            this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
                requestNonPersonalizedAdsOnly: true,
            });

            const unsubLoaded = this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
                this.isLoaded = true;
            });

            const unsubEarned = this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
                if (this.onRewardCallback) {
                    try {
                        this.onRewardCallback();
                    } catch (e) {
                        console.error('Reward callback error:', e);
                    }
                    this.onRewardCallback = null;
                }
            });

            const unsubClosed = this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
                this.isLoaded = false;
                this.onRewardCallback = null;
                this.retryTimeout = setTimeout(() => this.load(), 1000); // Preload next with delay
            });

            const unsubError = this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('Ad error:', error);
                this.isLoaded = false;
                // Retry after a longer delay on error
                this.retryTimeout = setTimeout(() => this.load(), 5000);
            });

            this.unsubscribers = [unsubLoaded, unsubEarned, unsubClosed, unsubError];

            this.rewardedAd.load();
        } catch (e) {
            console.error('Failed to load ad:', e);
        }
    }

    /**
     * Show a rewarded ad. The reward is granted ONLY when the ad SDK reports
     * EARNED_REWARD. When no ad is available we fail closed: nothing is awarded,
     * otherwise offline players could farm hints, packs and coins for free.
     */
    show(onReward: () => void, onFallback?: () => void) {
        try {
            if (this.isLoaded && this.rewardedAd) {
                this.onRewardCallback = onReward;
                this.rewardedAd.show();
                return;
            }
            this.notifyUnavailable(onFallback);
        } catch (e) {
            console.error('Failed to show ad:', e);
            this.notifyUnavailable(onFallback);
        }
    }

    private notifyUnavailable(onFallback?: () => void) {
        // Always tell the player, even when the caller needs to reset UI state,
        // otherwise tapping "Solve All" / "Hint" appears to do nothing.
        onFallback?.();
        Alert.alert(
            "Ad Unavailable",
            "We could not load an ad right now. Please check your connection and try again.",
            [{ text: "OK" }]
        );
        if (!this.rewardedAd) {
            this.retryTimeout = setTimeout(() => this.load(), 500);
        }
    }

    /**
     * Cancel any pending reward callback (e.g. when the game screen unmounts).
     * This prevents stale callbacks from firing after navigation.
     */
    cancelPendingReward() {
        this.onRewardCallback = null;
    }
}

export const adService = new AdService();
