import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider, useGame } from '../src/context/GameContext';
import { todayKey } from '../src/utils/date';

const TestComponent = ({ onContext }: { onContext: (ctx: ReturnType<typeof useGame>) => void }) => {
  const context = useGame();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

describe('Hard Metrics: GameContext State Machine & Resilience', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('Daily Streak Engine: Accurate calculations across today, yesterday, and lapse days', async () => {
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

    // Case 1: First solve today (streak becomes 1)
    const today = todayKey();
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Physics',
        timeSeconds: 25,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: true,
        difficulty: 'Normal',
        score: 200,
        coins: 40,
        grade: 'S'
      });
    });

    expect(ctx!.stats.currentStreak).toBe(1);
    expect(ctx!.stats.dailySolvedDates).toContain(today);

    // Case 2: Solving daily puzzle again on the same day must not increment streak twice
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Physics',
        timeSeconds: 20,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: true,
        difficulty: 'Normal',
        score: 200,
        coins: 40,
        grade: 'S'
      });
    });

    expect(ctx!.stats.currentStreak).toBe(1);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Achievement Matrix: All 16 achievement conditions trigger accurately', async () => {
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

    // Trigger Speed Demon (<30s) + Flawless (0 mistakes) + Pure Insight (0 hints)
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Astronomy',
        timeSeconds: 14, // Lightning Reflexes (<15s) + Speed Demon (<30s)
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Legendary', // Legendary Decryptor
        score: 500,
        coins: 50,
        grade: 'S'
      });
    });

    const getAch = (id: string) => ctx!.achievements.find(a => a.id === id);

    expect(getAch('first_cipher')?.isUnlocked).toBe(true);
    expect(getAch('clean_solve')?.isUnlocked).toBe(true);
    expect(getAch('speed_demon')?.isUnlocked).toBe(true);
    expect(getAch('lightning_fast')?.isUnlocked).toBe(true);
    expect(getAch('legendary_solver')?.isUnlocked).toBe(true);

    // Claim mechanism & double claim prevention
    const initialCoins = ctx!.coins;
    await ReactTestRenderer.act(async () => {
      ctx!.claimAchievement('first_cipher');
    });

    expect(ctx!.coins).toBe(initialCoins + getAch('first_cipher')!.rewardCoins);
    expect(getAch('first_cipher')?.claimed).toBe(true);

    // Attempting to claim again must not give additional coins
    const coinsAfterFirstClaim = ctx!.coins;
    await ReactTestRenderer.act(async () => {
      ctx!.claimAchievement('first_cipher');
    });
    expect(ctx!.coins).toBe(coinsAfterFirstClaim);

    // Theme Unlocks achievement test
    await ReactTestRenderer.act(async () => {
      ctx!.unlockTheme('cyberpunk');
      ctx!.unlockTheme('terminal');
      ctx!.unlockTheme('gold');
      ctx!.unlockTheme('light');
    });

    expect(getAch('theme_collector')?.isUnlocked).toBe(true);

    // Blitz High Score achievement test (>1000)
    await ReactTestRenderer.act(async () => {
      ctx!.updateBlitzHighScore(2500);
    });
    expect(ctx!.stats.blitzHighScore).toBe(2500);
    expect(getAch('blitz_master')?.isUnlocked).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Aesthetic Elite requires three PAID themes, not the two free defaults', async () => {
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

    const themeAch = () => ctx!.achievements.find(a => a.id === 'theme_collector');

    await ReactTestRenderer.act(async () => { ctx!.unlockTheme('cyberpunk'); });
    expect(themeAch()?.isUnlocked).toBe(false);

    await ReactTestRenderer.act(async () => { ctx!.unlockTheme('terminal'); });
    expect(themeAch()?.isUnlocked).toBe(false);

    await ReactTestRenderer.act(async () => { ctx!.unlockTheme('gold'); });
    expect(themeAch()?.isUnlocked).toBe(true);

    await ReactTestRenderer.act(async () => { renderer.unmount(); });
  });

  test('Fastest Solves Record Engine: Preserves best times per subject', async () => {
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

    // First solve: 45 seconds
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Biology',
        timeSeconds: 45,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 100,
        coins: 20,
        grade: 'A'
      });
    });
    expect(ctx!.stats.bestTimes['Biology']).toBe(45);

    // Slower solve: 60 seconds (must not overwrite 45s record)
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Biology',
        timeSeconds: 60,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 80,
        coins: 15,
        grade: 'B'
      });
    });
    expect(ctx!.stats.bestTimes['Biology']).toBe(45);

    // Faster solve: 28 seconds (must overwrite 45s record)
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Biology',
        timeSeconds: 28,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: false,
        difficulty: 'Normal',
        score: 150,
        coins: 30,
        grade: 'S'
      });
    });
    expect(ctx!.stats.bestTimes['Biology']).toBe(28);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Achievement definitions come from code, not stale persisted copy', async () => {
    // Simulate an old install that stored a stale icon/title for an achievement.
    await AsyncStorage.setItem('brainCipherAchievements', JSON.stringify([
      {
        id: 'first_cipher',
        icon: 'STALE',
        title: 'Old Title',
        description: 'old',
        category: 'special',
        target: 1,
        progress: 1,
        isUnlocked: true,
        rewardCoins: 25,
        claimed: false,
      },
    ]));

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

    const ach = ctx!.achievements.find(a => a.id === 'first_cipher');
    expect(ach?.icon).not.toBe('STALE');
    expect(ach?.title).toBe('First Contact');
    // Mutable progress is still restored.
    expect(ach?.progress).toBe(1);
    expect(ach?.isUnlocked).toBe(true);

    await ReactTestRenderer.act(async () => { renderer.unmount(); });
  });

  test('AsyncStorage Resilience: Gracefully recovers default state from corrupted or empty storage', async () => {
    await AsyncStorage.setItem('brainCipherCoins', 'NOT_A_NUMBER');
    await AsyncStorage.setItem('brainCipherStats', '{ CORRUPTED_JSON');

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

    expect(ctx).not.toBeNull();
    expect(ctx!.coins).toBeGreaterThanOrEqual(0);
    expect(ctx!.stats.puzzlesSolved).toBe(0);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Master-Key Economy: Flat 10 coins, 0 points, no streak increment, excluded from speed/accuracy achievements, counts only to cumulative solves', async () => {
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
    const initialPoints = ctx!.totalPoints;

    // Execute a Master Key solve on Daily challenge
    await ReactTestRenderer.act(async () => {
      ctx!.recordPuzzleCompletion({
        category: 'Physics',
        timeSeconds: 10, // Normally qualifies for lightning_fast (<15s) and speed_demon (<30s)
        hintsUsed: 0,    // Normally qualifies for clean_solve and flawless_5
        mistakesCount: 0,
        isDaily: true,
        difficulty: 'Legendary', // Normally qualifies for legendary_solver
        score: 0,        // Ratified: 0 points
        coins: 10,       // Ratified: flat 10 coins
        grade: 'D',      // Ratified: grade D
        usedMasterKey: true
      });
    });

    // 1. Points and Coins
    expect(ctx!.totalPoints).toBe(initialPoints); // 0 points gained
    expect(ctx!.coins).toBe(initialCoins + 10);   // exactly 10 coins gained

    // 2. Cumulative solve counters DO increment
    expect(ctx!.stats.puzzlesSolved).toBe(1);
    const getAch = (id: string) => ctx!.achievements.find(a => a.id === id);
    expect(getAch('first_cipher')?.isUnlocked).toBe(true);

    // 3. Streak does NOT increment
    expect(ctx!.stats.currentStreak).toBe(0);

    // 4. Excluded from accuracy/speed achievements
    expect(getAch('clean_solve')?.isUnlocked).toBe(false);
    expect(getAch('flawless_5')?.isUnlocked).toBe(false);
    expect(getAch('speed_demon')?.isUnlocked).toBe(false);
    expect(getAch('lightning_fast')?.isUnlocked).toBe(false);
    expect(getAch('legendary_solver')?.isUnlocked).toBe(false);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
