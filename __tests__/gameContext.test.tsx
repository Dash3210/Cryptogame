import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GameProvider, useGame } from '../src/context/GameContext';

const TestComponent = ({ onContext }: { onContext: (ctx: ReturnType<typeof useGame>) => void }) => {
  const context = useGame();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

describe('GameContext & Economy Engine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('GameProvider provides initial economy, rank, and theme values', async () => {
    let capturedContext: ReturnType<typeof useGame> | null = null;

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(ctx) => { capturedContext = ctx; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!.coins).toBeGreaterThanOrEqual(0);
    expect(capturedContext!.rank).toBeDefined();
    expect(capturedContext!.rankTitle).toBeDefined();
    expect(capturedContext!.colors).toBeDefined();
  });

  test('addCoins, spendCoins, and theme unlocks update context correctly', async () => {
    let capturedContext: ReturnType<typeof useGame> | null = null;

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(ctx) => { capturedContext = ctx; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    await ReactTestRenderer.act(async () => {
      capturedContext!.addCoins(100);
    });
    expect(capturedContext!.coins).toBeGreaterThanOrEqual(100);

    let spent = false;
    await ReactTestRenderer.act(async () => {
      spent = capturedContext!.spendCoins(50);
    });
    expect(spent).toBe(true);

    await ReactTestRenderer.act(async () => {
      capturedContext!.unlockTheme('cyberpunk');
    });
    expect(capturedContext!.unlockedThemes.has('cyberpunk')).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('recordPuzzleCompletion awards points, coins, and checks achievements', async () => {
    let capturedContext: ReturnType<typeof useGame> | null = null;

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <TestComponent onContext={(ctx) => { capturedContext = ctx; }} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    await ReactTestRenderer.act(async () => {
      capturedContext!.recordPuzzleCompletion({
        category: 'Biology',
        timeSeconds: 22,
        hintsUsed: 0,
        mistakesCount: 0,
        isDaily: true,
        difficulty: 'Normal',
        score: 150,
        coins: 30,
        grade: 'S'
      });
    });

    expect(capturedContext!.totalPoints).toBeGreaterThanOrEqual(150);
    expect(capturedContext!.stats.puzzlesSolved).toBe(1);
    expect(capturedContext!.stats.currentStreak).toBe(1);

    const firstAch = capturedContext!.achievements.find(a => a.id === 'first_cipher');
    expect(firstAch?.isUnlocked).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
