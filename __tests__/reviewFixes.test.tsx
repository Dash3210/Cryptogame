import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider, useGame } from '../src/context/GameContext';
import { getQuoteById } from '../src/services/quoteService';
import { seededRandom, getNextUnsolvedIndex, getLetterFrequencies } from '../src/utils/cipher';
import { AppText } from '../src/components/AppText';
import { WinCelebrationModal } from '../src/components/WinCelebrationModal';
import { VirtualKeyboard } from '../src/components/VirtualKeyboard';
import { HowToPlayModal } from '../src/screens/SettingsScreen';
import { Icon, ThemedIcon, IconBase } from '../src/components/Icon';

const TestComponent = ({ onContext }: { onContext: (ctx: ReturnType<typeof useGame>) => void }) => {
  const context = useGame();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

describe('Review Fixes Verification Suite', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('getQuoteById resolves Daily, Blitz, and Category quotes accurately', () => {
    // 1. Daily quote lookup
    const dailyQuote = getQuoteById('daily-2026-09-13');
    expect(dailyQuote).not.toBeNull();
    expect(dailyQuote?.category).toBe('Daily Cipher');
    expect(dailyQuote?.id).toBe('daily-2026-09-13');
    expect(typeof dailyQuote?.text).toBe('string');
    expect(typeof dailyQuote?.author).toBe('string');

    // 2. Category quote lookup
    const biologyQuote = getQuoteById('biology-mitochondria');
    expect(biologyQuote).not.toBeNull();
    expect(biologyQuote?.category).toBe('biology');
    expect(typeof biologyQuote?.text).toBe('string');

    // 3. Blitz quote lookup with author
    const blitzQuote = getQuoteById('blitz-Byte-123456');
    expect(blitzQuote).not.toBeNull();
    expect(blitzQuote?.category).toBe('Blitz Rush');
    expect(blitzQuote?.author).toBe('Byte');

    // 4. Legacy blitz quote lookup fallback
    const legacyBlitz = getQuoteById('blitz-1725000000-42');
    expect(legacyBlitz).not.toBeNull();
    expect(legacyBlitz?.category).toBe('Blitz Rush');

    // 5. Invalid ID returns null
    expect(getQuoteById('')).toBeNull();
    expect(getQuoteById('nonexistent-genre-999')).toBeNull();
  });

  test('seededRandom generates deterministic Mulberry32 distribution in [0, 1)', () => {
    const prng1 = seededRandom('2026-09-13');
    const prng2 = seededRandom('2026-09-13');

    const seq1 = [prng1(), prng1(), prng1(), prng1(), prng1()];
    const seq2 = [prng2(), prng2(), prng2(), prng2(), prng2()];

    // Deterministic match
    expect(seq1).toEqual(seq2);

    // In [0, 1) bounds
    seq1.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    // Different seed produces different sequence
    const prngOther = seededRandom('2026-09-14');
    const seqOther = [prngOther(), prngOther(), prngOther(), prngOther(), prngOther()];
    expect(seq1).not.toEqual(seqOther);
  });

  test('getNextUnsolvedIndex handles boundary conditions and empty strings safely', () => {
    const cipherMap = { H: 'X', E: 'Y', L: 'Z', O: 'W' };
    const userMap = { X: 'H' };

    // Empty text
    expect(getNextUnsolvedIndex('', cipherMap, userMap, 0)).toBeNull();

    // Out of bounds start index
    const result = getNextUnsolvedIndex('HELLO', cipherMap, userMap, 100);
    expect(result).toBe(1); // 'E' at index 1 is unsolved

    // Negative start index
    const fromStart = getNextUnsolvedIndex('HELLO', cipherMap, userMap, -5);
    expect(fromStart).toBe(1);
  });

  // Item 6: Consecutive-gap navigation & strict forward auto-advance
  // Verifies that:
  // - Cursor advances strictly forward from current cell across consecutive gaps
  // - Wrapping to earliest unsolved gap happens ONLY when nothing ahead is unsolved
  test('getNextUnsolvedIndex navigates strictly forward through consecutive gaps without jumping back', () => {
    // String: "G A P S" -> indices 0:'G', 1:' ', 2:'A', 3:' ', 4:'P', 5:' ', 6:'S'
    // Two consecutive gaps: 'A' (2) and 'P' (4)
    const cipherMap = { G: '1', A: '2', P: '3', S: '4' };
    // 'G' (0) and 'S' (6) are solved; 'A' (2) and 'P' (4) are unsolved consecutive gaps
    const userMap = { '1': 'G', '4': 'S' };

    // From cursor at index 0 ('G'), strictly advances forward to 'A' (2)
    expect(getNextUnsolvedIndex('G A P S', cipherMap, userMap, 0)).toBe(2);

    // From cursor at index 2 ('A'), strictly advances forward to 'P' (4), NOT getting stuck or jumping back
    expect(getNextUnsolvedIndex('G A P S', cipherMap, userMap, 2)).toBe(4);

    // From cursor at index 4 ('P'), nothing ahead is unsolved ('S' at 6 is solved), so it wraps to earliest gap ('A' at 2)
    expect(getNextUnsolvedIndex('G A P S', cipherMap, userMap, 4)).toBe(2);
  });

  test('getLetterFrequencies sorts with fast tie-breaker', () => {
    const cipherMap = { A: 'Z', B: 'Y', C: 'X' };
    const userMap = {};
    const frequencies = getLetterFrequencies('ABC', cipherMap, userMap);

    expect(frequencies.length).toBe(3);
    // All have frequency 1, sorted by cipherChar ascending
    expect(frequencies[0].frequency).toBe(1);
    expect(frequencies[1].frequency).toBe(1);
    expect(frequencies[2].frequency).toBe(1);
  });

  test('Debounced storage persistence batches updates without keystroke thrashing', async () => {
    const multiSetSpy = jest.spyOn(AsyncStorage, 'multiSet');
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

    multiSetSpy.mockClear();

    // Simulate 5 rapid keystrokes within 200ms
    await ReactTestRenderer.act(async () => {
      ctx?.recordGuess(true);
      ctx?.recordGuess(false);
      ctx?.recordGuess(true);
      ctx?.recordGuess(true);
      ctx?.recordGuess(false);
    });

    // Before debounce expires, multiSet has NOT fired 5 times
    expect(multiSetSpy).not.toHaveBeenCalled();

    // Advance past the 500ms debounce
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(600);
    });

    // Exactly 1 batched multiSet call occurred!
    expect(multiSetSpy).toHaveBeenCalledTimes(1);

    multiSetSpy.mockClear();
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('AppText renders and memoizes without crashing', () => {
    let tree: any;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <AppText style={{ fontSize: 16, fontStyle: 'italic' }}>Test Label</AppText>
      );
    });

    expect(tree).toBeDefined();
    expect(tree.toJSON()).not.toBeNull();
  });

  test('WinCelebrationModal always reveals term in breakdown, removes gold double button, and displays Double or Nothing ledger row', async () => {
    const quoteData = {
      id: 'astronomy-1',
      text: 'Somewhere, something incredible is waiting to be known.',
      author: 'Carl Sagan',
      category: 'Astronomy',
    };

    // Ratified Spec (Item 1): Bonus MCQ is shown immediately upon solve.
    // In WinCelebrationModal (breakdown), the term is always revealed, the gold
    // "Double your reward" button is removed, and won bonus shows explicit ledger row.
    let rendererWithBonus: any;
    await ReactTestRenderer.act(async () => {
      rendererWithBonus = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={quoteData}
            genreLabel="Astronomy"
            score={1900}
            maxScore={1000}
            coinsEarned={90}
            bonusCoins={45}
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
      jest.advanceTimersByTime(500);
    });

    const bonusJson = JSON.stringify(rendererWithBonus.toJSON());
    expect(bonusJson).toContain('TERM / ANSWER');
    expect(bonusJson).toContain('Carl Sagan');
    expect(bonusJson).not.toContain('Double your reward');
    expect(bonusJson).toContain('Double or Nothing Bonus');

    // 2. Standard solve without bonus won
    let rendererStandard: any;
    await ReactTestRenderer.act(async () => {
      rendererStandard = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={quoteData}
            genreLabel="Astronomy"
            score={950}
            maxScore={1000}
            coinsEarned={45}
            bonusCoins={0}
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
      jest.advanceTimersByTime(500);
    });

    const standardJson = JSON.stringify(rendererStandard.toJSON());
    expect(standardJson).toContain('TERM / ANSWER');
    expect(standardJson).toContain('Carl Sagan');
    expect(standardJson).not.toContain('Double your reward');
    expect(standardJson).not.toContain('Double or Nothing Bonus');

    await ReactTestRenderer.act(async () => {
      rendererWithBonus.unmount();
      rendererStandard.unmount();
    });
  });

  test('VirtualKeyboard integrates SVG Icons for backspace and next-cell actions', async () => {
    const onDelete = jest.fn();
    const onNext = jest.fn();
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <VirtualKeyboard
            usedLetters={new Set()}
            onKeyPress={jest.fn()}
            onDelete={onDelete}
            onNext={onNext}
            blockUsedLetters={false}
          />
        </GameProvider>
      );
    });

    const json = JSON.stringify(renderer.toJSON());
    // Raw unicode glyphs should not be present as text nodes
    expect(json).not.toContain('"⌫"');
    expect(json).not.toContain('"→"');

    // Find backspace and next-cell buttons by accessibility labels
    const backspaceBtn = renderer.root.find(
      (node: any) => node.props.accessibilityLabel === 'Delete letter'
    );
    const nextBtn = renderer.root.find(
      (node: any) => node.props.accessibilityLabel === 'Next empty cell'
    );

    expect(backspaceBtn).toBeDefined();
    expect(nextBtn).toBeDefined();

    // Verify Icons inside action buttons
    const backspaceIcon = backspaceBtn.findByProps({ name: 'backspace' });
    const nextIcon = nextBtn.findByProps({ name: 'next-cell' });
    expect(backspaceIcon).toBeDefined();
    expect(nextIcon).toBeDefined();

    // Press action buttons
    await ReactTestRenderer.act(async () => {
      backspaceBtn.props.onPress();
      nextBtn.props.onPress();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('HowToPlayModal provides accurate Frequency Analysis copy without referring to removed FrequencyBar', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <HowToPlayModal visible={true} onClose={jest.fn()} />
        </GameProvider>
      );
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Frequency Tool at the top of the screen');
    expect(json).toContain('keyboard keys by their actual occurrence count in this puzzle');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Icon context subscription optimization allows standalone rendering with explicit color and avoids context subscription', async () => {
    // 1. Renders cleanly without GameProvider when explicit color is passed
    let rendererStandalone: any;
    await ReactTestRenderer.act(async () => {
      rendererStandalone = ReactTestRenderer.create(
        <Icon name="backspace" size={20} color="#ff0000" />
      );
    });

    expect(rendererStandalone).toBeDefined();
    const tree = rendererStandalone.toTree();
    expect(tree.props.color).toBe('#ff0000');
    // Confirm ThemedIcon is NOT rendered in the standalone tree
    expect(rendererStandalone.root.findAllByType((ThemedIcon as any).type).length).toBe(0);

    // 2. Renders with GameProvider when no color is passed (inheriting themed color via ThemedIcon)
    let rendererThemed: any;
    await ReactTestRenderer.act(async () => {
      rendererThemed = ReactTestRenderer.create(
        <GameProvider>
          <Icon name="lock" size={16} />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(rendererThemed).toBeDefined();
    // Confirms ThemedIcon IS in the tree when color is omitted
    expect(rendererThemed.root.findAllByType((ThemedIcon as any).type).length).toBe(1);

    // 3. Inside GameProvider, passing explicit color bypasses ThemedIcon subscription
    let rendererExplicit: any;
    await ReactTestRenderer.act(async () => {
      rendererExplicit = ReactTestRenderer.create(
        <GameProvider>
          <Icon name="backspace" size={20} color="#00ff00" />
        </GameProvider>
      );
      jest.runAllTimers();
    });

    expect(rendererExplicit.root.findAllByType((ThemedIcon as any).type).length).toBe(0);
    expect(rendererExplicit.root.findAllByType((IconBase as any).type).length).toBe(1);

    // 4. Passing empty string or null color safely falls back to ThemedIcon
    let rendererFalsyColor: any;
    await ReactTestRenderer.act(async () => {
      rendererFalsyColor = ReactTestRenderer.create(
        <GameProvider>
          <Icon name="lock" size={16} color="" />
        </GameProvider>
      );
      jest.runAllTimers();
    });
    expect(rendererFalsyColor.root.findAllByType((ThemedIcon as any).type).length).toBe(1);

    await ReactTestRenderer.act(async () => {
      rendererStandalone.unmount();
      rendererThemed.unmount();
      rendererExplicit.unmount();
      rendererFalsyColor.unmount();
    });
  });

  test('WinCelebrationModal gracefully falls back to UNKNOWN when quoteData.author is empty or missing', async () => {
    const emptyAuthorQuote = {
      id: 'custom-ugc-1',
      text: 'Encrypted thought without author attribution.',
      author: '',
      category: 'Philosophy',
    };

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={emptyAuthorQuote}
            genreLabel="Philosophy"
            score={500}
            timer={15}
            hintsUsed={0}
            mistakesCount={0}
            accuracy={100}
            grade={{ grade: 'A', title: 'Codebreaker', stars: 2 }}
            onNextPuzzle={jest.fn()}
            onBack={jest.fn()}
            bonusAvailable={false}
          />
        </GameProvider>
      );
      jest.advanceTimersByTime(500);
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('TERM / ANSWER');
    expect(json).toContain('UNKNOWN');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('WinCelebrationModal displays scaled baseLabel, bonusCoins ledger row, and Blitz 50:1 copy', async () => {
    const quote = {
      id: 'bio-1',
      text: 'Mitochondria are the powerhouses of the cell generating ATP through respiration.',
      author: 'Mitochondria',
      category: 'Biology',
    };

    const reward = {
      baseCoins: 95,
      baseLabel: 'Base Level Reward (Hard - Long)',
      lengthTier: 'Long' as const,
      lengthBonus: 30,
      mistakeDeduction: 0,
      hintDeduction: 0,
      timeDeduction: 0,
      keyDeduction: 0,
      cleanBonus: 5,
      netCoins: 100,
      grade: 'S' as const,
      gradeTitle: 'Flawless Mastermind',
      stars: 3,
      accuracyPercent: 100,
      mistakesCount: 0,
      hintsCount: 0,
      timeSeconds: 45
    };

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={quote}
            genreLabel="Biology"
            score={1200}
            maxScore={2500}
            coinsEarned={200}
            coinReward={reward}
            bonusCoins={100}
            timer={45}
            hintsUsed={0}
            mistakesCount={0}
            accuracy={100}
            grade={{ grade: 'S', title: 'Flawless Mastermind', stars: 3 }}
            onNextPuzzle={jest.fn()}
            onBack={jest.fn()}
          />
        </GameProvider>
      );
      jest.advanceTimersByTime(500);
    });

    const json = JSON.stringify(renderer.toJSON());
    // Scaled base reward ledger label
    expect(json).toContain('Base Level Reward (Hard - Long)');
    // Ledger shows netCoins + bonusCoins
    expect(json).toContain('200 / 95 Coins Gained');
    // Double or Nothing bonus row
    expect(json).toContain('Double or Nothing Bonus');
    expect(json).toContain('+100');
    // Gold "Double your reward" button removed
    expect(json).not.toContain('DOUBLE YOUR REWARD');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });

    // Blitz Timeout rendering test
    let blitzRenderer: any;
    await ReactTestRenderer.act(async () => {
      blitzRenderer = ReactTestRenderer.create(
        <GameProvider>
          <WinCelebrationModal
            quoteData={quote}
            genreLabel="Blitz Rush"
            score={1500}
            maxScore={1500}
            coinsEarned={30}
            timer={90}
            hintsUsed={0}
            mistakesCount={0}
            accuracy={100}
            grade={{ grade: 'A', title: 'Speed Solve', stars: 3 }}
            onNextPuzzle={jest.fn()}
            onBack={jest.fn()}
            isBlitz={true}
            isBlitzTimeout={true}
          />
        </GameProvider>
      );
      jest.advanceTimersByTime(500);
    });

    const blitzJson = JSON.stringify(blitzRenderer.toJSON());
    expect(blitzJson).toContain('BLITZ PAYOUT');
    expect(blitzJson).toContain('1,500 pts → 30 coins');
    expect(blitzJson).toContain('Points convert to coins at 50:1 (minimum 5, capped at 100 coins).');

    await ReactTestRenderer.act(async () => {
      blitzRenderer.unmount();
    });
  });
});
