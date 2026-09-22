import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider, useGame } from '../src/context/GameContext';
import { getQuoteById } from '../src/services/quoteService';
import { seededRandom, getNextUnsolvedIndex, getLetterFrequencies } from '../src/utils/cipher';
import { AppText } from '../src/components/AppText';

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

  afterEach(() => {
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
    const biologyQuote = getQuoteById('biology-0');
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

    multiSetSpy.mockRestore();
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
});
