import {
    RewardedAd,
    RewardedAdEventType,
    InterstitialAd,
    AdEventType,
} from 'react-native-google-mobile-ads';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_CONFIG } from './adConfig';
import { todayKey } from '../utils/date';

export const STORAGE_KEYS = {
    REWARDED_DAILY: '@braincipher_ad_rewarded_daily',
    INTERSTITIAL_STATE: '@braincipher_ad_interstitial_state',
    SUBJECT_PROGRESS: '@braincipher_ad_subject_unlock_progress',
} as const;

export interface InterstitialGateOptions {
    mode?: string;
    isBonusActive?: boolean;
    isLevelCompleted?: boolean;
    onAdClosed?: () => void;
}

export interface InterstitialState {
    totalSolves: number;
    solvesSinceLastInterstitial: number;
    lastInterstitialTime: number;
}

export interface RewardedDailyState {
    date: string;
    count: number;
}

class AdService {
    // Rewarded Ad state
    private rewardedAd: RewardedAd | null = null;
    private isRewardedLoaded = false;
    private onRewardCallback: (() => void) | null = null;
    private rewardedUnsubscribers: (() => void)[] = [];
    private rewardedRetryTimeout: ReturnType<typeof setTimeout> | null = null;

    // Daily Cap state
    private rewardedDailyDate: string = todayKey();
    private rewardedDailyCount = 0;

    // Interstitial Ad state
    private interstitialAd: InterstitialAd | null = null;
    private isInterstitialLoaded = false;
    private interstitialUnsubscribers: (() => void)[] = [];
    private interstitialRetryTimeout: ReturnType<typeof setTimeout> | null = null;
    private onInterstitialClosedCallback: (() => void) | null = null;

    // Interstitial Cadence state
    private totalSolves = 0;
    private solvesSinceLastInterstitial = 0;
    private lastInterstitialTime = 0;

    // Subject Unlock 2-Ad Progress cache
    private subjectProgress: Record<string, number> = {};

    public isInitialized = false;
    private initTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        // Delay initialization to avoid blocking module load
        this.initTimeout = setTimeout(() => this.init(), 500);
    }

    private async init() {
        this.initTimeout = null;
        try {
            await this.loadPersistedState();
            this.loadRewarded();
            this.loadInterstitial();
            this.isInitialized = true;
        } catch (e) {
            console.error('AdService init failed:', e);
        }
    }

    async loadPersistedState(): Promise<void> {
        try {
            const [storedDaily, storedInterstitial, storedSubject] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.REWARDED_DAILY),
                AsyncStorage.getItem(STORAGE_KEYS.INTERSTITIAL_STATE),
                AsyncStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS),
            ]);

            // Load daily rewarded count
            const today = todayKey();
            if (storedDaily) {
                const parsed: RewardedDailyState = JSON.parse(storedDaily);
                if (parsed.date === today) {
                    this.rewardedDailyDate = today;
                    this.rewardedDailyCount = typeof parsed.count === 'number' ? parsed.count : 0;
                } else {
                    this.rewardedDailyDate = today;
                    this.rewardedDailyCount = 0;
                }
            } else {
                this.rewardedDailyDate = today;
                this.rewardedDailyCount = 0;
            }

            // Load interstitial cadence
            if (storedInterstitial) {
                const parsed: InterstitialState = JSON.parse(storedInterstitial);
                this.totalSolves = typeof parsed.totalSolves === 'number' ? parsed.totalSolves : 0;
                this.solvesSinceLastInterstitial =
                    typeof parsed.solvesSinceLastInterstitial === 'number'
                        ? parsed.solvesSinceLastInterstitial
                        : 0;
                this.lastInterstitialTime =
                    typeof parsed.lastInterstitialTime === 'number' ? parsed.lastInterstitialTime : 0;
            }

            // Load subject unlock progress
            if (storedSubject) {
                const parsed = JSON.parse(storedSubject);
                if (parsed && typeof parsed === 'object') {
                    this.subjectProgress = parsed;
                }
            }
        } catch (e) {
            console.warn('AdService failed to load persisted state:', e);
        }
    }

    dispose() {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        if (this.rewardedRetryTimeout) {
            clearTimeout(this.rewardedRetryTimeout);
            this.rewardedRetryTimeout = null;
        }
        if (this.interstitialRetryTimeout) {
            clearTimeout(this.interstitialRetryTimeout);
            this.interstitialRetryTimeout = null;
        }

        this.removeRewardedListeners();
        this.removeInterstitialListeners();
        this.cancelPendingReward();

        this.isRewardedLoaded = false;
        this.rewardedAd = null;

        this.isInterstitialLoaded = false;
        this.interstitialAd = null;
        this.onInterstitialClosedCallback = null;
    }

    // ==========================================
    // REWARDED ADS
    // ==========================================

    private removeRewardedListeners() {
        this.rewardedUnsubscribers.forEach((unsub) => {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        });
        this.rewardedUnsubscribers = [];
    }

    load() {
        this.loadRewarded();
    }

    loadRewarded() {
        try {
            this.removeRewardedListeners();

            this.rewardedAd = RewardedAd.createForAdRequest(AD_CONFIG.units.rewarded, {
                requestNonPersonalizedAdsOnly: true,
            });

            const unsubLoaded = this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
                this.isRewardedLoaded = true;
            });

            const unsubEarned = this.rewardedAd.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => {
                    this.incrementRewardedDailyCount();
                    if (this.onRewardCallback) {
                        try {
                            this.onRewardCallback();
                        } catch (e) {
                            console.error('Reward callback error:', e);
                        }
                        this.onRewardCallback = null;
                    }
                }
            );

            const unsubClosed = this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
                this.isRewardedLoaded = false;
                this.onRewardCallback = null;
                this.rewardedRetryTimeout = setTimeout(() => this.loadRewarded(), 1000);
            });

            const unsubError = this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('Rewarded ad error:', error);
                this.isRewardedLoaded = false;
                this.rewardedRetryTimeout = setTimeout(() => this.loadRewarded(), 5000);
            });

            this.rewardedUnsubscribers = [unsubLoaded, unsubEarned, unsubClosed, unsubError];
            this.rewardedAd.load();
        } catch (e) {
            console.error('Failed to load rewarded ad:', e);
        }
    }

    /**
     * Show a rewarded ad with hard daily cap guardrail.
     * At 20 views/day, affordances are disabled and a brief reason is presented.
     * Rewards are granted ONLY when the SDK reports EARNED_REWARD.
     */
    show(onReward: () => void, onFallback?: () => void) {
        if (this.isRewardedDailyCapReached()) {
            onFallback?.();
            Alert.alert(
                'Daily Ad Limit Reached',
                `You have reached the daily limit of ${AD_CONFIG.cadence.rewardedDailyCap} rewarded ads. Please check back tomorrow!`,
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            if (this.isRewardedLoaded && this.rewardedAd) {
                this.onRewardCallback = onReward;
                this.rewardedAd.show();
                return;
            }
            this.notifyUnavailable(onFallback);
        } catch (e) {
            console.error('Failed to show rewarded ad:', e);
            this.notifyUnavailable(onFallback);
        }
    }

    private notifyUnavailable(onFallback?: () => void) {
        onFallback?.();
        Alert.alert(
            'Ad Unavailable',
            'We could not load an ad right now. Please check your connection and try again.',
            [{ text: 'OK' }]
        );
        if (!this.rewardedAd) {
            this.rewardedRetryTimeout = setTimeout(() => this.loadRewarded(), 500);
        }
    }

    cancelPendingReward() {
        this.onRewardCallback = null;
    }

    // ==========================================
    // REWARDED DAILY CAP
    // ==========================================

    private checkDateRollover() {
        const today = todayKey();
        if (this.rewardedDailyDate !== today) {
            this.rewardedDailyDate = today;
            this.rewardedDailyCount = 0;
            this.saveDailyState();
        }
    }

    isRewardedDailyCapReached(): boolean {
        this.checkDateRollover();
        return this.rewardedDailyCount >= AD_CONFIG.cadence.rewardedDailyCap;
    }

    getRewardedDailyCount(): number {
        this.checkDateRollover();
        return this.rewardedDailyCount;
    }

    getRemainingRewardedAds(): number {
        this.checkDateRollover();
        return Math.max(0, AD_CONFIG.cadence.rewardedDailyCap - this.rewardedDailyCount);
    }

    private async incrementRewardedDailyCount(): Promise<void> {
        this.checkDateRollover();
        this.rewardedDailyCount += 1;
        await this.saveDailyState();
    }

    private async saveDailyState(): Promise<void> {
        try {
            const data: RewardedDailyState = {
                date: this.rewardedDailyDate,
                count: this.rewardedDailyCount,
            };
            await AsyncStorage.setItem(STORAGE_KEYS.REWARDED_DAILY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save rewarded daily state:', e);
        }
    }

    setRewardedDailyCountForTesting(count: number, dateStr?: string) {
        this.rewardedDailyDate = dateStr || todayKey();
        this.rewardedDailyCount = count;
        this.saveDailyState();
    }

    resetRewardedDailyCountForTesting() {
        this.rewardedDailyDate = todayKey();
        this.rewardedDailyCount = 0;
        this.saveDailyState();
    }

    // ==========================================
    // INTERSTITIAL ADS & CADENCE GUARDRAILS
    // ==========================================

    private removeInterstitialListeners() {
        this.interstitialUnsubscribers.forEach((unsub) => {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        });
        this.interstitialUnsubscribers = [];
    }

    loadInterstitial() {
        try {
            this.removeInterstitialListeners();

            this.interstitialAd = InterstitialAd.createForAdRequest(AD_CONFIG.units.interstitial, {
                requestNonPersonalizedAdsOnly: true,
            });

            const unsubLoaded = this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
                this.isInterstitialLoaded = true;
            });

            const unsubClosed = this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
                this.isInterstitialLoaded = false;
                if (this.onInterstitialClosedCallback) {
                    try {
                        this.onInterstitialClosedCallback();
                    } catch (e) {
                        console.error('Interstitial closed callback error:', e);
                    }
                    this.onInterstitialClosedCallback = null;
                }
                this.interstitialRetryTimeout = setTimeout(() => this.loadInterstitial(), 1000);
            });

            const unsubError = this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('Interstitial ad error:', error);
                this.isInterstitialLoaded = false;
                this.interstitialRetryTimeout = setTimeout(() => this.loadInterstitial(), 5000);
            });

            this.interstitialUnsubscribers = [unsubLoaded, unsubClosed, unsubError];
            this.interstitialAd.load();
        } catch (e) {
            console.error('Failed to load interstitial ad:', e);
        }
    }

    /**
     * Single interstitial gate enforcing all product and economy guardrails:
     * - Show after every 5 solved levels (persisted counter, survives app restart)
     * - NEVER in Blitz Rush mode
     * - NEVER in the Daily Challenge
     * - NEVER while the comprehension/bonus modal is active
     * - At least 90 seconds between interstitials
     * - None during the first 3 solves after install
     * - Always fire AFTER a completed level, never before one starts
     *
     * If any condition fails, silently returns false and does nothing.
     */
    async maybeShowInterstitial(options?: InterstitialGateOptions): Promise<boolean> {
        const mode = options?.mode ?? 'standard';
        const isBonusActive = options?.isBonusActive ?? false;
        const isLevelCompleted = options?.isLevelCompleted ?? true;

        // Guardrail 1: Always fire AFTER a completed level, never before one starts
        if (!isLevelCompleted) {
            return false;
        }

        // Guardrail 2: Never in Blitz Rush mode
        if (mode === 'blitz') {
            return false;
        }

        // Guardrail 3: Never in Daily Challenge
        if (mode === 'daily') {
            return false;
        }

        // Guardrail 4: Never while comprehension / bonus modal is active
        if (isBonusActive) {
            return false;
        }

        // Advance cadence counters for a completed standard level
        this.totalSolves += 1;
        this.solvesSinceLastInterstitial += 1;
        await this.saveInterstitialState();

        // Guardrail 5: None during the first 3 solves after install
        if (this.totalSolves <= AD_CONFIG.cadence.interstitialInitialGraceSolves) {
            return false;
        }

        // Guardrail 6: Show after every 5 solved levels
        if (this.solvesSinceLastInterstitial < AD_CONFIG.cadence.interstitialIntervalSolves) {
            return false;
        }

        // Guardrail 7: At least 90 seconds between interstitials
        const now = Date.now();
        const minCooldownMs = AD_CONFIG.cadence.interstitialCooldownSeconds * 1000;
        if (this.lastInterstitialTime > 0 && now - this.lastInterstitialTime < minCooldownMs) {
            return false;
        }

        // Guardrail 8: If ad SDK is not loaded, silently do nothing (no error, no UI)
        if (!this.isInterstitialLoaded || !this.interstitialAd) {
            return false;
        }

        // All conditions satisfied! Present interstitial
        try {
            this.solvesSinceLastInterstitial = 0;
            this.lastInterstitialTime = now;
            await this.saveInterstitialState();

            if (options?.onAdClosed) {
                this.onInterstitialClosedCallback = options.onAdClosed;
            }

            this.interstitialAd.show();
            return true;
        } catch (e) {
            console.error('Failed to show interstitial ad:', e);
            return false;
        }
    }

    private async saveInterstitialState(): Promise<void> {
        try {
            const data: InterstitialState = {
                totalSolves: this.totalSolves,
                solvesSinceLastInterstitial: this.solvesSinceLastInterstitial,
                lastInterstitialTime: this.lastInterstitialTime,
            };
            await AsyncStorage.setItem(STORAGE_KEYS.INTERSTITIAL_STATE, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save interstitial state:', e);
        }
    }

    getInterstitialSolves(): InterstitialState {
        return {
            totalSolves: this.totalSolves,
            solvesSinceLastInterstitial: this.solvesSinceLastInterstitial,
            lastInterstitialTime: this.lastInterstitialTime,
        };
    }

    setInterstitialStateForTesting(state: Partial<InterstitialState>) {
        if (typeof state.totalSolves === 'number') this.totalSolves = state.totalSolves;
        if (typeof state.solvesSinceLastInterstitial === 'number')
            this.solvesSinceLastInterstitial = state.solvesSinceLastInterstitial;
        if (typeof state.lastInterstitialTime === 'number')
            this.lastInterstitialTime = state.lastInterstitialTime;
        this.saveInterstitialState();
    }

    resetInterstitialCadenceForTesting() {
        this.totalSolves = 0;
        this.solvesSinceLastInterstitial = 0;
        this.lastInterstitialTime = 0;
        this.saveInterstitialState();
    }

    setInterstitialLoadedForTesting(loaded: boolean) {
        this.isInterstitialLoaded = loaded;
        if (loaded && !this.interstitialAd) {
            this.interstitialAd = {
                show: () => {},
                load: () => {},
                addAdEventListener: () => () => {},
            } as unknown as InterstitialAd;
        }
    }

    setRewardedLoadedForTesting(loaded: boolean) {
        this.isRewardedLoaded = loaded;
        if (loaded && !this.rewardedAd) {
            this.rewardedAd = {
                show: () => {},
                load: () => {},
                addAdEventListener: () => () => {},
            } as unknown as RewardedAd;
        }
    }

    simulateEarnedRewardForTesting() {
        this.incrementRewardedDailyCount();
        if (this.onRewardCallback) {
            const cb = this.onRewardCallback;
            this.onRewardCallback = null;
            cb();
        }
    }

    simulateInterstitialCloseForTesting() {
        if (this.onInterstitialClosedCallback) {
            const cb = this.onInterstitialClosedCallback;
            this.onInterstitialClosedCallback = null;
            cb();
        }
    }

    // ==========================================
    // 2-AD SUBJECT UNLOCK PROGRESS
    // ==========================================

    getSubjectAdProgress(subjectId: string): number {
        return this.subjectProgress[subjectId] || 0;
    }

    async getAllSubjectAdProgress(): Promise<Record<string, number>> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    this.subjectProgress = parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to get subject ad progress:', e);
        }
        return { ...this.subjectProgress };
    }

    async incrementSubjectAdProgress(subjectId: string): Promise<number> {
        const next = (this.subjectProgress[subjectId] || 0) + 1;
        this.subjectProgress[subjectId] = next;
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.SUBJECT_PROGRESS,
                JSON.stringify(this.subjectProgress)
            );
        } catch (e) {
            console.warn('Failed to save subject ad progress:', e);
        }
        return next;
    }

    async resetSubjectAdProgress(subjectId: string): Promise<void> {
        delete this.subjectProgress[subjectId];
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.SUBJECT_PROGRESS,
                JSON.stringify(this.subjectProgress)
            );
        } catch (e) {
            console.warn('Failed to reset subject ad progress:', e);
        }
    }

    setSubjectAdProgressForTesting(subjectId: string, progress: number) {
        this.subjectProgress[subjectId] = progress;
        AsyncStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify(this.subjectProgress));
    }
}

export const adService = new AdService();
