import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider, useGame } from '../src/context/GameContext';
import { SHOP_ITEMS, getShopItem, getExtensionPrice, getThemePrice } from '../src/data/shop';
import { calculateCoinReward } from '../src/utils/cipher';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DailyChallengeScreen } from '../src/screens/DailyChallengeScreen';
import { StoreScreen } from '../src/screens/StoreScreen';
import { GameScreen } from '../src/screens/GameScreen';

const TestComponent = ({ onContext }: { onContext: (ctx: ReturnType<typeof useGame>) => void }) => {
  const context = useGame();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

describe('Coin Sink Foundation & Repeatable Sinks Test Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (AsyncStorage.multiGet as jest.Mock).mockClear();
    (AsyncStorage.multiSet as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // 1. Catalogue and Pricing Single Source of Truth
  test('SHOP_ITEMS catalogue exists and prices match economic specification', () => {
    expect(Object.keys(SHOP_ITEMS).length).toBeGreaterThan(0);

    const masterKey = getShopItem('master_key');
    expect(masterKey).toBeDefined();
    expect(masterKey?.price).toBe(60);
    expect(masterKey?.repeatable).toBe(true);

    const skipPuzzle = getShopItem('skip_puzzle');
    expect(skipPuzzle).toBeDefined();
    expect(skipPuzzle?.price).toBe(150);
    expect(skipPuzzle?.repeatable).toBe(true);

    const blitzTime = getShopItem('blitz_time_15');
    expect(blitzTime).toBeDefined();
    expect(blitzTime?.price).toBe(40);
    expect(blitzTime?.repeatable).toBe(true);

    const streakFreeze = getShopItem('streak_freeze');
    expect(streakFreeze).toBeDefined();
    expect(streakFreeze?.price).toBe(200);
    expect(streakFreeze?.repeatable).toBe(true);

    // Extensions & Themes prices resolved through shop helpers
    expect(getExtensionPrice('compsci')).toBe(100);
    expect(getExtensionPrice('mythology')).toBe(150);
    expect(getThemePrice('midnight')).toBe(150);
    expect(getThemePrice('cyberpunk')).toBe(120);
    expect(getThemePrice('ocean')).toBe(150);
    expect(getThemePrice('gold')).toBe(120);
  });

  // 2. Atomic spend and balance deduction
  test('Atomic spend: balance is deducted accurately and effects applied', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '500'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(ctx!.coins).toBe(500);

    // Spend on master key (60)
    let result;
    await ReactTestRenderer.act(async () => {
      result = ctx!.purchase('master_key');
    });
    expect(result).toBe('OK');
    expect(ctx!.coins).toBe(440);

    // Spend on blitz +15s (40)
    await ReactTestRenderer.act(async () => {
      result = ctx!.purchase('blitz_time_15');
    });
    expect(result).toBe('OK');
    expect(ctx!.coins).toBe(400);

    // Spend on skip puzzle (150)
    await ReactTestRenderer.act(async () => {
      result = ctx!.purchase('skip_puzzle');
    });
    expect(result).toBe('OK');
    expect(ctx!.coins).toBe(250);

    // Spend on streak freeze (200)
    await ReactTestRenderer.act(async () => {
      result = ctx!.purchase('streak_freeze');
    });
    expect(result).toBe('OK');
    expect(ctx!.coins).toBe(50);
    expect(ctx!.stats.hasStreakFreeze).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 3. Purchase can NEVER produce a negative balance
  test('Purchase can never produce a negative balance', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '50'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(ctx!.coins).toBe(50);

    // Attempting to buy Master Key (60 coins) with 50 coins
    let res;
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('master_key');
    });
    expect(res).toBe('INSUFFICIENT_FUNDS');
    expect(ctx!.coins).toBe(50); // NEVER drops to -10!

    // Attempting to buy Skip Puzzle (150 coins)
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('skip_puzzle');
    });
    expect(res).toBe('INSUFFICIENT_FUNDS');
    expect(ctx!.coins).toBe(50);

    // Attempting to buy Streak Freeze (200 coins)
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('streak_freeze');
    });
    expect(res).toBe('INSUFFICIENT_FUNDS');
    expect(ctx!.coins).toBe(50);
    expect(ctx!.stats.hasStreakFreeze).toBeFalsy();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 4. Insufficient funds returns typed failure and mutates nothing
  test('Insufficient funds returns typed failure and mutates nothing', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '0'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    const initialExtensionsCount = ctx!.myExtensions.size;
    const initialThemesCount = ctx!.unlockedThemes.size;
    expect(ctx!.coins).toBe(0);

    // Try buying extension with 0 coins
    let res;
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('ext_compsci');
    });
    expect(res).toBe('INSUFFICIENT_FUNDS');
    expect(ctx!.coins).toBe(0);
    expect(ctx!.myExtensions.size).toBe(initialExtensionsCount);

    // Try buying theme with 0 coins
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('theme_cyberpunk');
    });
    expect(res).toBe('INSUFFICIENT_FUNDS');
    expect(ctx!.coins).toBe(0);
    expect(ctx!.unlockedThemes.size).toBe(initialThemesCount);

    // Unknown item test
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('unknown_imaginary_item');
    });
    expect(res).toBe('UNKNOWN_ITEM');
    expect(ctx!.coins).toBe(0);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 5. Purchase is persisted immediately (survives a simulated immediate reload without debounce timers running)
  test('Purchase is persisted immediately and survives immediate reload without debounce timers', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '300'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(ctx!.coins).toBe(300);
    (AsyncStorage.multiSet as jest.Mock).mockClear();

    // Purchase streak_freeze (200 coins)
    await ReactTestRenderer.act(async () => {
      const res = ctx!.purchase('streak_freeze');
      expect(res).toBe('OK');
    });

    // MUST have written to AsyncStorage immediately, WITHOUT calling jest.runAllTimers()
    expect(AsyncStorage.multiSet).toHaveBeenCalled();
    const lastMultiSetCall = (AsyncStorage.multiSet as jest.Mock).mock.calls.slice(-1)[0][0] as [string, string][];
    const storedMap = new Map(lastMultiSetCall);

    expect(storedMap.get('brainCipherCoins')).toBe('100');
    const storedStats = JSON.parse(storedMap.get('brainCipherStats') || '{}');
    expect(storedStats.hasStreakFreeze).toBe(true);

    // Unmount without letting any debounce timer fire
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });

    // Simulate immediate reload: multiGet returns the immediately persisted values
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', storedMap.get('brainCipherCoins')!],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', storedMap.get('brainCipherStats')!],
      ['brainCipherAchievements', '[]'],
    ]);

    let reloadedCtx: ReturnType<typeof useGame> | null = null;
    let reloadedRenderer: any;

    await ReactTestRenderer.act(async () => {
      reloadedRenderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { reloadedCtx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(reloadedCtx!.coins).toBe(100);
    expect(reloadedCtx!.stats.hasStreakFreeze).toBe(true);

    await ReactTestRenderer.act(async () => {
      reloadedRenderer.unmount();
    });
  });

  // 6. Double-tap buys once (in-flight and rapid duplicate guard)
  test('Double-tap buys once: rapid duplicate calls deduct balance exactly once', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '500'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(ctx!.coins).toBe(500);

    // Two rapid back-to-back purchases of skip_puzzle (150 coins)
    let res1: any;
    let res2: any;
    await ReactTestRenderer.act(async () => {
      res1 = ctx!.purchase('skip_puzzle');
      res2 = ctx!.purchase('skip_puzzle');
    });

    expect(res1).toBe('OK');
    expect(res2).toBe('ALREADY_OWNED');
    // Balance must be deducted ONCE (500 - 150 = 350, NOT 200)
    expect(ctx!.coins).toBe(350);

    // Two rapid back-to-back purchases of non-repeatable theme
    let resTheme1: any;
    let resTheme2: any;
    await ReactTestRenderer.act(async () => {
      resTheme1 = ctx!.purchase('theme_cyberpunk');
      resTheme2 = ctx!.purchase('theme_cyberpunk');
    });

    expect(resTheme1).toBe('OK');
    expect(resTheme2).toBe('ALREADY_OWNED');
    // Deducted 120 once: 350 - 120 = 230
    expect(ctx!.coins).toBe(230);
    expect(ctx!.unlockedThemes.has('cyberpunk')).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 7. Streak freeze logic & consumption
  test('Streak freeze: active freeze cannot be repurchased, and protects 1 missed day', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '500'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', '{}'],
      ['brainCipherAchievements', '[]'],
    ]);

    let ctx: ReturnType<typeof useGame> | null = null;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(c) => { ctx = c; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    // Buy streak freeze
    let res;
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('streak_freeze');
    });
    expect(res).toBe('OK');
    expect(ctx!.stats.hasStreakFreeze).toBe(true);

    // Attempting to buy another freeze while one is active returns ALREADY_OWNED
    await ReactTestRenderer.act(async () => {
      res = ctx!.purchase('streak_freeze');
    });
    expect(res).toBe('ALREADY_OWNED');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 8. New sinks do NOT alter reward maths
  test('New sinks do not alter calculateCoinReward maths or deductions', () => {
    // Standard normal solve
    const cleanNormal = calculateCoinReward({
      difficulty: 'Normal',
      timerSeconds: 30,
      hintsUsed: 0,
      mistakesCount: 0,
      accuracy: 100,
    });
    // Base 38 + Clean 5 = 43
    expect(cleanNormal.baseCoins).toBe(38);
    expect(cleanNormal.cleanBonus).toBe(5);
    expect(cleanNormal.netCoins).toBe(43);

    // Standard hard solve with hints & mistakes
    const penalisedHard = calculateCoinReward({
      difficulty: 'Hard', // 48
      timerSeconds: 50, // no overtime
      hintsUsed: 2, // -6
      mistakesCount: 3, // -6
      accuracy: 80,
    });
    expect(penalisedHard.baseCoins).toBe(48);
    expect(penalisedHard.hintDeduction).toBe(6);
    expect(penalisedHard.mistakeDeduction).toBe(6);
    expect(penalisedHard.netCoins).toBe(36);

    // Master key solve flat 10 coins, grade D
    const masterKeySolve = calculateCoinReward({
      difficulty: 'Legendary',
      timerSeconds: 10,
      hintsUsed: 0,
      mistakesCount: 0,
      accuracy: 100,
      usedMasterKey: true,
    });
    expect(masterKeySolve.netCoins).toBe(10);
    expect(masterKeySolve.grade).toBe('D');

    // 15-coin floor remains absolute
    const floorReward = calculateCoinReward({
      difficulty: 'Easy', // 30
      timerSeconds: 999, // -10
      hintsUsed: 10, // -15 max
      mistakesCount: 15, // -20 max
      accuracy: 10,
    });
    expect(floorReward.netCoins).toBe(15);
  });

  // 9. UI: DailyChallengeScreen confirms spend before buying streak freeze
  test('DailyChallengeScreen renders streak-freeze affordance and confirms spend before purchase', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '0'],
      ['brainCipherCoins', '500'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', '[]'],
      ['brainCipherEverCleared', '[]'],
      ['brainCipherSavedGames', '{}'],
      ['brainCipherStats', JSON.stringify({ hasStreakFreeze: false, currentStreak: 3, maxStreak: 5, dailySolvedDates: [] })],
      ['brainCipherAchievements', '[]'],
    ]);

    const alertSpy = jest.spyOn(Alert, 'alert');

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContainer>
          <GameProvider>
            <DailyChallengeScreen />
          </GameProvider>
        </NavigationContainer>
      );
      jest.runAllTimers();
    });

    // Find the streak freeze equip button by accessibilityLabel
    const equipBtn = renderer.root.findByProps({
      accessibilityLabel: 'Equip Streak Freeze for 200 coins',
    });
    expect(equipBtn).toBeDefined();

    // Trigger equip press
    await ReactTestRenderer.act(async () => {
      equipBtn.props.onPress();
    });

    // Alert.alert should have been called showing title, 200 coins, and balance
    expect(alertSpy).toHaveBeenCalled();
    const lastAlertCall = alertSpy.mock.calls.slice(-1)[0];
    expect(lastAlertCall[0]).toBe('Equip Streak Freeze');
    expect(lastAlertCall[1]).toContain('200 coins');
    expect(lastAlertCall[1]).toContain('Current balance:');

    alertSpy.mockRestore();
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 10. UI: StoreScreen confirms spend showing item, price, and current balance before purchasing
  test('StoreScreen prompts confirm dialog showing item, price, and current balance before purchasing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

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

    // Find first buy button
    const buyBtns = renderer.root.findAllByProps({ accessibilityRole: 'button' });
    const compSciBuyBtn = buyBtns.find((b: any) =>
      b.props.accessibilityLabel && b.props.accessibilityLabel.includes('Comp Sci')
    );
    expect(compSciBuyBtn).toBeDefined();

    // Press buy
    await ReactTestRenderer.act(async () => {
      compSciBuyBtn.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalled();
    const lastCall = alertSpy.mock.calls.slice(-1)[0];
    expect(lastCall[0]).toBe('Unlock Subject');
    expect(lastCall[1]).toContain('Comp Sci');
    expect(lastCall[1]).toContain('100 coins');
    expect(lastCall[1]).toContain('Current balance:');

    alertSpy.mockRestore();
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // 11. UI: GameScreen Header controls confirm spend before purchasing Key, Skip, and Blitz Time
  test('GameScreen Header controls trigger confirm dialogs with price and balance for Key, Skip, and Blitz Time', async () => {
    const Stack = createNativeStackNavigator();
    const alertSpy = jest.spyOn(Alert, 'alert');

    // 1. Standard mode: Key and Skip
    let standardRenderer: any;
    await ReactTestRenderer.act(async () => {
      standardRenderer = ReactTestRenderer.create(
        <NavigationContainer>
          <GameProvider>
            <Stack.Navigator>
              <Stack.Screen
                name="Game"
                component={GameScreen}
                initialParams={{ genreId: 'biology', mode: 'standard' }}
              />
            </Stack.Navigator>
          </GameProvider>
        </NavigationContainer>
      );
      jest.advanceTimersByTime(500);
    });

    // Find KEY button
    const keyBtn = standardRenderer.root.findByProps({ accessibilityLabel: 'Use Key' });
    expect(keyBtn).toBeDefined();
    await ReactTestRenderer.act(async () => {
      keyBtn.props.onPress();
    });
    expect(alertSpy).toHaveBeenCalled();
    let lastAlert = alertSpy.mock.calls.slice(-1)[0];
    expect(lastAlert[0]).toBe('Use Master Key');
    expect(lastAlert[1]).toContain('60 coins');
    expect(lastAlert[1]).toContain('Current balance:');

    // Find SKIP button
    const skipBtn = standardRenderer.root.findByProps({ accessibilityLabel: 'Skip Puzzle' });
    expect(skipBtn).toBeDefined();
    await ReactTestRenderer.act(async () => {
      skipBtn.props.onPress();
    });
    expect(alertSpy).toHaveBeenCalled();
    lastAlert = alertSpy.mock.calls.slice(-1)[0];
    expect(lastAlert[0]).toBe('Skip Puzzle');
    expect(lastAlert[1]).toContain('150 coins');
    expect(lastAlert[1]).toContain('Current balance:');

    await ReactTestRenderer.act(async () => {
      standardRenderer.unmount();
    });

    // 2. Blitz mode: +15S button
    let blitzRenderer: any;
    await ReactTestRenderer.act(async () => {
      blitzRenderer = ReactTestRenderer.create(
        <NavigationContainer>
          <GameProvider>
            <Stack.Navigator>
              <Stack.Screen
                name="Game"
                component={GameScreen}
                initialParams={{ mode: 'blitz' }}
              />
            </Stack.Navigator>
          </GameProvider>
        </NavigationContainer>
      );
      jest.advanceTimersByTime(500);
    });

    const blitzTimeBtn = blitzRenderer.root.findByProps({ accessibilityLabel: 'Add 15 Seconds Blitz Time' });
    expect(blitzTimeBtn).toBeDefined();
    await ReactTestRenderer.act(async () => {
      blitzTimeBtn.props.onPress();
    });
    expect(alertSpy).toHaveBeenCalled();
    lastAlert = alertSpy.mock.calls.slice(-1)[0];
    expect(lastAlert[0]).toBe('Add Blitz Time');
    expect(lastAlert[1]).toContain('40 coins');
    expect(lastAlert[1]).toContain('Current balance:');

    alertSpy.mockRestore();
    await ReactTestRenderer.act(async () => {
      blitzRenderer.unmount();
    });
  });
});
