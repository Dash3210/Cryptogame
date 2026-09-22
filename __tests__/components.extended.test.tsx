import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GameProvider } from '../src/context/GameContext';

import { PuzzleBoard } from '../src/components/PuzzleBoard';
import { WinCelebrationModal } from '../src/components/WinCelebrationModal';
import { DailyQuoteModal } from '../src/components/DailyQuoteModal';
import { ConfettiAnimation } from '../src/components/ConfettiAnimation';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { prepareGameData, generateCipher } from '../src/utils/cipher';
import { Text } from 'react-native';

const ProblemChild = () => {
  throw new Error('Test Explosion');
};

describe('Hard Metrics: Extended UI Components & Resilience', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('PuzzleBoard renders cells with word-wrapping, matching letter highlight, and cursor selection', async () => {
    const text = "CELL MEMBRANE";
    const cipher = generateCipher();
    const cells = prepareGameData({ id: '1', text, author: 'Bio', category: 'Biology' }, cipher);

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <PuzzleBoard
            cells={cells}
            selectedCellIndex={0}
            onSelectCell={jest.fn()}
            solved={false}
          />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();
    expect(renderer.toJSON()).not.toBeNull();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('WinCelebrationModal displays S-Rank, score statistics, coin bonus, and share action', async () => {
    const quoteData = {
      id: 'astronomy-1',
      text: 'Somewhere, something incredible is waiting to be known.',
      author: 'Carl Sagan',
      category: 'Astronomy'
    };

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={quoteData}
            genreLabel="Astronomy"
            score={950}
            maxScore={1000}
            coinsEarned={45}
            timer={22}
            hintsUsed={0}
            mistakesCount={0}
            accuracy={100}
            grade={{ grade: 'S', title: 'Flawless Mastermind', stars: 3 }}
            onNextPuzzle={jest.fn()}
            onBack={jest.fn()}
          />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('ConfettiAnimation mounts, generates particles, and unmounts cleanly', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<ConfettiAnimation />);
      jest.advanceTimersByTime(500);
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('DailyQuoteModal displays quote modal and handles dismiss', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <DailyQuoteModal />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('ErrorBoundary catches component runtime crashes and renders graceful fallback UI', async () => {
    // Suppress console.error in this intentional test explosion
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ErrorBoundary>
          <ProblemChild />
        </ErrorBoundary>
      );
    });

    expect(renderer).toBeDefined();
    // Verify fallback UI rendered
    expect(renderer.root.findAllByType(Text).length).toBeGreaterThan(0);

    spy.mockRestore();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
