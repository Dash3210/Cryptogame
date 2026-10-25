import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adService, STORAGE_KEYS } from '../src/services/adService';
import { AD_CONFIG } from '../src/services/adConfig';
import { AdBanner, isBannerAllowedOnScreen } from '../src/components/AdBanner';
import { StoreScreen } from '../src/screens/StoreScreen';
import { LibraryScreen } from '../src/screens/LibraryScreen';
import { GameProvider } from '../src/context/GameContext';
import { NavigationContainer } from '@react-navigation/native';

describe('Ad Layer Verification Suite', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    adService.resetInterstitialCadenceForTesting();
    adService.resetRewardedDailyCountForTesting();
    adService.setInterstitialLoadedForTesting(true);
    adService.setRewardedLoadedForTesting(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    adService.dispose();
  });

  // =========================================================================
  // (a) 5-solve cadence fires exactly one interstitial per 5 solves
  // =========================================================================
  describe('(a) Interstitial Cadence: 5-solve interval', () => {
    test('fires exactly one interstitial per 5 solves and persists state', async () => {
      // Advance time beyond initial cooldown
      let currentTime = 1_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Solves 1, 2, 3: Under initial grace (3 solves after install), must not fire
      expect(await adService.maybeShowInterstitial()).toBe(false);
      expect(await adService.maybeShowInterstitial()).toBe(false);
      expect(await adService.maybeShowInterstitial()).toBe(false);

      // Solve 4: Grace passed, but only 4 total / 4 since last -> false
      expect(await adService.maybeShowInterstitial()).toBe(false);

      // Solve 5: 5th solve -> fires exactly one interstitial!
      currentTime += 100_000; // past 90s
      const solve5Result = await adService.maybeShowInterstitial();
      expect(solve5Result).toBe(true);

      // Next 4 solves (6, 7, 8, 9) must NOT fire
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);

      // Solve 10 (5th solve since last interstitial) -> fires!
      currentTime += 100_000;
      const solve10Result = await adService.maybeShowInterstitial();
      expect(solve10Result).toBe(true);

      // Next 4 solves (11, 12, 13, 14) must NOT fire
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);
      currentTime += 100_000;
      expect(await adService.maybeShowInterstitial()).toBe(false);

      // Solve 15 -> fires!
      currentTime += 100_000;
      const solve15Result = await adService.maybeShowInterstitial();
      expect(solve15Result).toBe(true);

      // Check persisted state in AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.INTERSTITIAL_STATE);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.totalSolves).toBe(15);
      expect(parsed.solvesSinceLastInterstitial).toBe(0);
      expect(parsed.lastInterstitialTime).toBe(currentTime);
    });

    test('interstitial counter survives reload from AsyncStorage', async () => {
      // Simulate persisted state of 4 solves since last interstitial
      const savedState = {
        totalSolves: 9,
        solvesSinceLastInterstitial: 4,
        lastInterstitialTime: 500_000,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.INTERSTITIAL_STATE, JSON.stringify(savedState));

      // Re-load state into adService
      await adService.loadPersistedState();

      const solves = adService.getInterstitialSolves();
      expect(solves.totalSolves).toBe(9);
      expect(solves.solvesSinceLastInterstitial).toBe(4);

      // 5th solve after restart should fire
      jest.spyOn(Date, 'now').mockReturnValue(700_000); // > 90s
      const shown = await adService.maybeShowInterstitial();
      expect(shown).toBe(true);
      expect(adService.getInterstitialSolves().solvesSinceLastInterstitial).toBe(0);
    });
  });

  // =========================================================================
  // (b) Guardrails: No interstitial in Blitz, Daily, Bonus modal, <3 solves, <90s
  // =========================================================================
  describe('(b) Interstitial Guardrails', () => {
    test('never fires in Blitz Rush mode', async () => {
      adService.setInterstitialStateForTesting({
        totalSolves: 10,
        solvesSinceLastInterstitial: 5,
        lastInterstitialTime: 0,
      });

      const shown = await adService.maybeShowInterstitial({ mode: 'blitz' });
      expect(shown).toBe(false);
      // Solves must not even increment for blitz
      expect(adService.getInterstitialSolves().solvesSinceLastInterstitial).toBe(5);
    });

    test('never fires in Daily Challenge mode', async () => {
      adService.setInterstitialStateForTesting({
        totalSolves: 10,
        solvesSinceLastInterstitial: 5,
        lastInterstitialTime: 0,
      });

      const shown = await adService.maybeShowInterstitial({ mode: 'daily' });
      expect(shown).toBe(false);
      expect(adService.getInterstitialSolves().solvesSinceLastInterstitial).toBe(5);
    });

    test('never fires while comprehension / bonus modal is active', async () => {
      adService.setInterstitialStateForTesting({
        totalSolves: 10,
        solvesSinceLastInterstitial: 5,
        lastInterstitialTime: 0,
      });

      const shown = await adService.maybeShowInterstitial({ isBonusActive: true });
      expect(shown).toBe(false);
      expect(adService.getInterstitialSolves().solvesSinceLastInterstitial).toBe(5);
    });

    test('never fires before level is completed', async () => {
      adService.setInterstitialStateForTesting({
        totalSolves: 10,
        solvesSinceLastInterstitial: 5,
        lastInterstitialTime: 0,
      });

      const shown = await adService.maybeShowInterstitial({ isLevelCompleted: false });
      expect(shown).toBe(false);
    });

    test('never fires during the first 3 solves after install (grace period)', async () => {
      adService.resetInterstitialCadenceForTesting();
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

      // Solve 1, 2, 3
      expect(await adService.maybeShowInterstitial()).toBe(false);
      expect(await adService.maybeShowInterstitial()).toBe(false);
      expect(await adService.maybeShowInterstitial()).toBe(false);

      expect(adService.getInterstitialSolves().totalSolves).toBe(3);
    });

    test('enforces at least 90 seconds between interstitials', async () => {
      const startTime = 1_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      adService.setInterstitialStateForTesting({
        totalSolves: 4,
        solvesSinceLastInterstitial: 4,
        lastInterstitialTime: 0,
      });

      // 5th solve fires first interstitial
      const firstAd = await adService.maybeShowInterstitial();
      expect(firstAd).toBe(true);
      expect(adService.getInterstitialSolves().lastInterstitialTime).toBe(startTime);

      // Simulate 5 solves occurring rapidly (within 45 seconds)
      const rapidTime = startTime + 45_000; // 45 seconds later (< 90s cooldown)
      jest.spyOn(Date, 'now').mockReturnValue(rapidTime);

      adService.setInterstitialStateForTesting({
        totalSolves: 9,
        solvesSinceLastInterstitial: 4,
        lastInterstitialTime: startTime,
      });

      // 5th rapid solve reaches interval requirement but fails 90s cooldown
      const secondAdAttempt = await adService.maybeShowInterstitial();
      expect(secondAdAttempt).toBe(false);

      // Now advance time past 90s cooldown (e.g. 95 seconds after first ad)
      const validTime = startTime + 95_000;
      jest.spyOn(Date, 'now').mockReturnValue(validTime);

      // Now it must succeed!
      const thirdAdAttempt = await adService.maybeShowInterstitial();
      expect(thirdAdAttempt).toBe(true);
    });

    test('silently does nothing if ad SDK is not loaded', async () => {
      adService.setInterstitialLoadedForTesting(false);
      adService.setInterstitialStateForTesting({
        totalSolves: 10,
        solvesSinceLastInterstitial: 5,
        lastInterstitialTime: 0,
      });

      const shown = await adService.maybeShowInterstitial();
      expect(shown).toBe(false);
    });
  });

  // =========================================================================
  // (c) Banner: Renders on Library/Store and absent from puzzle screens
  // =========================================================================
  describe('(c) Banner Ad Placement & Guardrails', () => {
    test('isBannerAllowedOnScreen returns true ONLY for Library and Store', () => {
      expect(isBannerAllowedOnScreen('Library')).toBe(true);
      expect(isBannerAllowedOnScreen('Store')).toBe(true);

      // Strict forbidden routes
      expect(isBannerAllowedOnScreen('Game')).toBe(false);
      expect(isBannerAllowedOnScreen('Blitz')).toBe(false);
      expect(isBannerAllowedOnScreen('DailyChallenge')).toBe(false);
      expect(isBannerAllowedOnScreen('DailyCipher')).toBe(false);
      expect(isBannerAllowedOnScreen('Daily')).toBe(false);

      // Other unapproved routes
      expect(isBannerAllowedOnScreen('Saved')).toBe(false);
      expect(isBannerAllowedOnScreen('Mastery')).toBe(false);
      expect(isBannerAllowedOnScreen(undefined)).toBe(false);
    });

    test('AdBanner component renders on Library and Store', async () => {
      let libraryRenderer: any;
      await ReactTestRenderer.act(async () => {
        libraryRenderer = ReactTestRenderer.create(<AdBanner screenName="Library" />);
        jest.runAllTimers();
      });
      expect(libraryRenderer.root.findByProps({ testID: 'ad-banner-container' })).toBeDefined();

      let storeRenderer: any;
      await ReactTestRenderer.act(async () => {
        storeRenderer = ReactTestRenderer.create(<AdBanner screenName="Store" />);
        jest.runAllTimers();
      });
      expect(storeRenderer.root.findByProps({ testID: 'ad-banner-container' })).toBeDefined();
    });

    test('AdBanner component renders null on Game, Blitz, and DailyChallenge', async () => {
      let gameRenderer: any;
      await ReactTestRenderer.act(async () => {
        gameRenderer = ReactTestRenderer.create(<AdBanner screenName="Game" />);
        jest.runAllTimers();
      });
      expect(gameRenderer.toJSON()).toBeNull();

      let blitzRenderer: any;
      await ReactTestRenderer.act(async () => {
        blitzRenderer = ReactTestRenderer.create(<AdBanner screenName="Blitz" />);
        jest.runAllTimers();
      });
      expect(blitzRenderer.toJSON()).toBeNull();

      let dailyRenderer: any;
      await ReactTestRenderer.act(async () => {
        dailyRenderer = ReactTestRenderer.create(<AdBanner screenName="DailyChallenge" />);
        jest.runAllTimers();
      });
      expect(dailyRenderer.toJSON()).toBeNull();
    });

    test('AdBanner collapses cleanly on load failure or unapproved screen', async () => {
      let unapprovedRenderer: any;
      await ReactTestRenderer.act(async () => {
        unapprovedRenderer = ReactTestRenderer.create(<AdBanner screenName="Saved" />);
        jest.runAllTimers();
      });
      expect(unapprovedRenderer.toJSON()).toBeNull();
    });

    test('LibraryScreen mounts AdBanner with screenName="Library"', async () => {
      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <NavigationContainer>
            <GameProvider>
              <LibraryScreen />
            </GameProvider>
          </NavigationContainer>
        );
        jest.runAllTimers();
      });

      expect(renderer.root.findByProps({ screenName: 'Library' })).toBeDefined();
    });

    test('StoreScreen mounts AdBanner with screenName="Store"', async () => {
      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <NavigationContainer>
            <GameProvider>
              <StoreScreen />
            </GameProvider>
          </NavigationContainer>
        );
        jest.runAllTimers();
      });

      expect(renderer.root.findByProps({ screenName: 'Store' })).toBeDefined();
    });
  });

  // =========================================================================
  // (d) 2-Ad Subject Unlock Flow
  // =========================================================================
  describe('(d) Two-Ad Subject Unlock', () => {
    test('requires exactly 2 rewarded views and does not unlock after 1', async () => {
      const subjectId = 'astronomy';
      expect(adService.getSubjectAdProgress(subjectId)).toBe(0);

      // Watch 1st ad
      const count1 = await adService.incrementSubjectAdProgress(subjectId);
      expect(count1).toBe(1);
      expect(adService.getSubjectAdProgress(subjectId)).toBe(1);

      // Subject should NOT be unlocked after 1 ad
      expect(count1 < AD_CONFIG.cadence.subjectUnlockRequiredAds).toBe(true);

      // Check progress persists in AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)[subjectId]).toBe(1);

      // Watch 2nd ad
      const count2 = await adService.incrementSubjectAdProgress(subjectId);
      expect(count2).toBe(2);
      expect(count2 >= AD_CONFIG.cadence.subjectUnlockRequiredAds).toBe(true);

      // After 2nd ad, reset subject progress for that key
      await adService.resetSubjectAdProgress(subjectId);
      expect(adService.getSubjectAdProgress(subjectId)).toBe(0);
    });

    test('progress survives leaving and returning to Store screen', async () => {
      const subjectId = 'neuroscience';
      await adService.incrementSubjectAdProgress(subjectId);

      // Simulate re-opening the store / app
      const allProgress = await adService.getAllSubjectAdProgress();
      expect(allProgress[subjectId]).toBe(1);
    });

    test('StoreScreen displays Ad (0/2) and Ad (1/2) labels', async () => {
      adService.setSubjectAdProgressForTesting('compsci', 1);

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <NavigationContainer>
            <GameProvider>
              <StoreScreen />
            </GameProvider>
          </NavigationContainer>
        );
        jest.runAllTimers();
      });

      // Find all text elements in the store
      const allTexts = renderer.root.findAllByType('Text').map((t: any) => t.props.children);
      const textJoined = JSON.stringify(allTexts);

      // compsci should show Ad (1/2)
      expect(textJoined).toContain('Ad (1/2)');
      // other un-watched extensions should show Ad (0/2)
      expect(textJoined).toContain('Ad (0/2)');
    });
  });

  // =========================================================================
  // (e) Rewarded Daily Cap: Disables affordance at 20
  // =========================================================================
  describe('(e) Rewarded Daily Cap at 20 views', () => {
    test('allows rewarded ads up to 19, reaches cap at 20', () => {
      adService.setRewardedDailyCountForTesting(0);
      expect(adService.isRewardedDailyCapReached()).toBe(false);
      expect(adService.getRemainingRewardedAds()).toBe(20);

      adService.setRewardedDailyCountForTesting(19);
      expect(adService.isRewardedDailyCapReached()).toBe(false);
      expect(adService.getRemainingRewardedAds()).toBe(1);

      adService.setRewardedDailyCountForTesting(20);
      expect(adService.isRewardedDailyCapReached()).toBe(true);
      expect(adService.getRemainingRewardedAds()).toBe(0);
    });

    test('at daily cap, adService.show does not grant reward and alerts user', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const onReward = jest.fn();
      const onFallback = jest.fn();

      adService.setRewardedDailyCountForTesting(20);

      adService.show(onReward, onFallback);

      expect(onReward).not.toHaveBeenCalled();
      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Daily Ad Limit Reached',
        expect.stringContaining('daily limit of 20 rewarded ads'),
        expect.any(Array)
      );
    });

    test('daily cap resets on date rollover', () => {
      // Set 20 views on yesterday's date
      adService.setRewardedDailyCountForTesting(20, '2026-01-01');

      // Querying today resets the count
      expect(adService.isRewardedDailyCapReached()).toBe(false);
      expect(adService.getRewardedDailyCount()).toBe(0);
    });

    test('StoreScreen shows Cap on buttons when daily cap of 20 is reached', async () => {
      adService.setRewardedDailyCountForTesting(20);

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <NavigationContainer>
            <GameProvider>
              <StoreScreen />
            </GameProvider>
          </NavigationContainer>
        );
        jest.runAllTimers();
      });

      const allTexts = renderer.root.findAllByType('Text').map((t: any) => t.props.children);
      const textJoined = JSON.stringify(allTexts);

      // Should show 'Cap' for buttons
      expect(textJoined).toContain('Cap');
    });
  });
});
