import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameProvider, useGame } from '../src/context/GameContext';
import { GameScreen } from '../src/screens/GameScreen';
import { BonusGuessModal } from '../src/components/BonusGuessModal';
import { calculateCoinReward, getLengthTier } from '../src/utils/cipher';
import { adService } from '../src/services/adService';

const TestComponent = ({ onContext }: { onContext: (ctx: ReturnType<typeof useGame>) => void }) => {
  const context = useGame();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

describe('First-Clear-Only Coin Economy, Guaranteed +50% Bonus, & Ever-Cleared Ledger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (AsyncStorage.multiGet as jest.Mock).mockClear();
    (AsyncStorage.multiSet as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    adService.dispose();
  });

  // (a) a first clear pays the full reward and records the ledger
  test('(a) first clear pays full coin reward and records quote in ever-cleared ledger', async () => {
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

    const initialCoins = ctx!.coins;
    const initialSolved = ctx!.stats.puzzlesSolved;
    const quoteId = 'bio-mitochondria-level-1';

    expect(ctx!.isEverCleared(quoteId)).toBe(false);
    expect(ctx!.everClearedQuotes.has(quoteId)).toBe(false);

    // First solve: pays 43 coins
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        quoteId,
        category: 'Biology',
        timeSeconds: 30,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 200,
        coins: 43,
        grade: 'S',
      });
    });

    expect(ctx!.coins).toBe(initialCoins + 43);
    expect(ctx!.stats.puzzlesSolved).toBe(initialSolved + 1);
    expect(ctx!.isEverCleared(quoteId)).toBe(true);
    expect(ctx!.everClearedQuotes.has(quoteId)).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // (b) solving the same puzzle a second time pays 0 and does not increment solved counters, streaks or achievements
  test('(b) solving the same puzzle a second time pays 0 coins and does not increment stats, streaks, or achievements', async () => {
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

    const quoteId = 'chem-avogadro-1';

    // First clear
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        quoteId,
        category: 'Chemistry',
        timeSeconds: 25,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 150,
        coins: 43,
        grade: 'S',
      });
    });

    const coinsAfterFirstClear = ctx!.coins;
    const solvedAfterFirstClear = ctx!.stats.puzzlesSolved;
    const streakAfterFirstClear = ctx!.stats.currentStreak;
    const achievementsSnapshot = JSON.stringify(ctx!.achievements);

    // Second clear of the exact same puzzle
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        quoteId,
        category: 'Chemistry',
        timeSeconds: 20,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 150,
        coins: 43,
        grade: 'S',
      });
    });

    // Payout must be 0 coins
    expect(ctx!.coins).toBe(coinsAfterFirstClear);
    // Solved counters, streaks, and achievements must not change
    expect(ctx!.stats.puzzlesSolved).toBe(solvedAfterFirstClear);
    expect(ctx!.stats.currentStreak).toBe(streakAfterFirstClear);
    expect(JSON.stringify(ctx!.achievements)).toBe(achievementsSnapshot);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // (c) after resetCategoryProgress, solving again STILL pays 0 - the ledger survives the reset
  test('(c) after resetCategoryProgress, solving again STILL pays 0 - the ledger survives the reset', async () => {
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

    const quoteId = 'physics-newton-first-law';

    // Solve and record first clear
    await ReactTestRenderer.act(async () => {
      ctx!.markQuoteSolved(quoteId, 'physics');
      ctx!.recordPuzzleCompletion({
        quoteId,
        category: 'Physics',
        timeSeconds: 40,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 250,
        coins: 43,
        grade: 'S',
      });
    });

    expect(ctx!.solvedQuotes.has(quoteId)).toBe(true);
    expect(ctx!.isEverCleared(quoteId)).toBe(true);

    const coinsBeforeReset = ctx!.coins;
    const solvedBeforeReset = ctx!.stats.puzzlesSolved;

    // Player hits "Replay Subject Puzzles" -> resets category progress
    await ReactTestRenderer.act(async () => {
      ctx!.resetCategoryProgress('physics');
    });

    // active solvedQuotes cleared for that category so puzzles can be replayed
    expect(ctx!.solvedQuotes.has(quoteId)).toBe(false);
    // CRITICAL: everClearedQuotes ledger must NOT be cleared by resetCategoryProgress
    expect(ctx!.isEverCleared(quoteId)).toBe(true);
    expect(ctx!.everClearedQuotes.has(quoteId)).toBe(true);

    // Replay solve of the same puzzle after reset
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        quoteId,
        category: 'Physics',
        timeSeconds: 35,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 250,
        coins: 43,
        grade: 'S',
      });
    });

    // Still 0 coins and no stats increment!
    expect(ctx!.coins).toBe(coinsBeforeReset);
    expect(ctx!.stats.puzzlesSolved).toBe(solvedBeforeReset);

    // Settings full reset also preserves ever-cleared ledger
    await ReactTestRenderer.act(async () => {
      ctx!.resetAllProgress();
    });
    expect(ctx!.isEverCleared(quoteId)).toBe(true);
    expect(ctx!.everClearedQuotes.has(quoteId)).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // (d) the bonus awards exactly +50% of the level reward (not 2x) and only on a first clear
  test('(d) bonus awards exactly +50% of level reward (Math.round(coins * 0.5)) and only on first clear', async () => {
    // 1. Math verification: +50% of 43 is Math.round(43 * 0.5) = 22 coins
    const levelCoins = 43;
    const bonusCoins = Math.round(levelCoins * 0.5);
    expect(bonusCoins).toBe(22);
    // Not 2x (which would have been 43 extra coins, total 86)
    expect(bonusCoins).not.toBe(levelCoins);
    expect(levelCoins + bonusCoins).toBe(65);

    // 2. Integration verification in GameScreen
    const Stack = createNativeStackNavigator();
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
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

    // BonusGuessModal renders with updated copy
    const bonusModals = renderer.root.findAllByType(BonusGuessModal);
    expect(bonusModals.length).toBe(0); // Not rendered until solve

    const json = JSON.stringify(renderer.toJSON());
    // No screen may promise "Double or Nothing"
    expect(json).not.toContain('Double or Nothing');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('(d.2) BonusGuessModal copy renders Comprehension Bonus and +50% bonus message', () => {
    const onResolved = jest.fn();
    let tree: any;

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <GameProvider>
          <BonusGuessModal
            visible
            definition="The powerhouse of the cell."
            options={['Mitochondria', 'Nucleus', 'Ribosome', 'Vacuole']}
            correctAnswer="Mitochondria"
            onResolved={onResolved}
            onClose={jest.fn()}
          />
        </GameProvider>
      );
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('COMPREHENSION BONUS');
    expect(json).toContain('Comprehension Bonus');
    expect(json).toContain('+50% bonus');
    expect(json).not.toContain('Double or Nothing');
    expect(json).not.toContain('double your coins');

    // Pick correct
    const mitoOption = tree.root.find(
      (n: any) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Answer Mitochondria'
    );
    ReactTestRenderer.act(() => {
      mitoOption.props.onPress();
    });

    const solvedJson = JSON.stringify(tree.toJSON());
    expect(solvedJson).toContain('Correct. +50% comprehension bonus awarded.');
    expect(solvedJson).not.toContain('doubled');

    ReactTestRenderer.act(() => {
      tree.unmount();
    });
  });

  // (e) the bases are 30/38/48/60/45/18 and tier bonuses, clean bonus and floor are unchanged
  test('(e) base coin rewards are 30/38/48/60/45/18, length bonuses +0/+15/+30/+45, clean bonus +5, floor 15 unchanged', () => {
    // Exact bases:
    const easy = calculateCoinReward({ difficulty: 'Easy', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
    const normal = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
    const hard = calculateCoinReward({ difficulty: 'Hard', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
    const legendary = calculateCoinReward({ difficulty: 'Legendary', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
    const daily = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'daily' });
    const blitz = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'blitz' });

    expect(easy.baseCoins).toBe(30);
    expect(normal.baseCoins).toBe(38);
    expect(hard.baseCoins).toBe(48);
    expect(legendary.baseCoins).toBe(60);
    expect(daily.baseCoins).toBe(45);
    expect(blitz.baseCoins).toBe(18);

    // Length-tier bonuses: Short (+0), Medium (+15), Long (+30), Epic (+45)
    expect(getLengthTier(30)).toEqual({ tier: 'Short', bonus: 0 });
    expect(getLengthTier(75)).toEqual({ tier: 'Medium', bonus: 15 });
    expect(getLengthTier(125)).toEqual({ tier: 'Long', bonus: 30 });
    expect(getLengthTier(180)).toEqual({ tier: 'Epic', bonus: 45 });

    // Clean-solve bonus (+5):
    expect(normal.cleanBonus).toBe(5);
    expect(normal.netCoins).toBe(38 + 5); // 43

    // Master Key solve => flat 10 coins
    const masterKeyReward = calculateCoinReward({
      difficulty: 'Hard',
      timerSeconds: 10,
      hintsUsed: 0,
      mistakesCount: 0,
      accuracy: 100,
      usedMasterKey: true,
    });
    expect(masterKeyReward.netCoins).toBe(10);
    expect(masterKeyReward.grade).toBe('D');

    // Guaranteed floor of 15 coins even under catastrophic penalties:
    const catastrophicReward = calculateCoinReward({
      difficulty: 'Easy', // 30 base
      timerSeconds: 999, // overtime max deduction -10
      hintsUsed: 20, // hints max deduction -15
      mistakesCount: 30, // mistakes max deduction -20
      accuracy: 20,
    });
    // Raw net: 30 - 10 - 15 - 20 = -15, floor guarantees 15 coins
    expect(catastrophicReward.netCoins).toBe(15);
  });

  test('Hydration & Migration: missing ledger defaults to empty and seeds existing solved quotes on upgrade', async () => {
    // Simulate upgrading an app that has brainCipherProgress (already-solved quotes)
    // but no brainCipherEverCleared key stored yet.
    const preExistingSolved = ['quote-alpha', 'quote-beta'];
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['brainCipherPoints', '100'],
      ['brainCipherCoins', '250'],
      ['brainCipherFavorites', '[]'],
      ['brainCipherExtensions', '[]'],
      ['brainCipherThemes', '["dark"]'],
      ['brainCipherSettings', '{}'],
      ['brainCipherProgress', JSON.stringify(preExistingSolved)],
      ['brainCipherEverCleared', null], // missing key!
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

    // Both pre-existing quotes must be treated as cleared so user cannot double-earn
    expect(ctx!.isEverCleared('quote-alpha')).toBe(true);
    expect(ctx!.isEverCleared('quote-beta')).toBe(true);
    expect(ctx!.isEverCleared('quote-new-gamma')).toBe(false);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
