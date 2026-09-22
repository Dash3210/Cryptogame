import {
  generateCipher,
  generateHints,
  prepareGameData,
  isSolved,
  getLetterFrequencies,
  getNextUnsolvedIndex,
  getPreviousCellIndex,
  calculateSolveGrade,
  calculateScoreAndCoins,
  getComboMultiplier,
  ALPHABET
} from '../src/utils/cipher';

import {
  getNextQuote,
  isGenreComplete,
  getGenreProgress,
  getDailyQuote,
  getRandomBlitzQuote,
} from '../src/services/quoteService';

import { QUOTE_DB } from '../src/data/quotes';

describe('Cipher Algorithms & Math Engine', () => {

  test('generateCipher produces a valid 1-to-1 bijection for all 26 letters', () => {
    const cipher = generateCipher();
    const keys = Object.keys(cipher);
    const values = Object.values(cipher);

    expect(keys.length).toBe(26);
    expect(new Set(keys).size).toBe(26);
    expect(new Set(values).size).toBe(26);

    for (const char of ALPHABET) {
      expect(cipher[char]).toBeDefined();
      expect(ALPHABET).toContain(cipher[char]);
    }
  });

  test('generateCipher ensures a derangement where no letter maps to itself', () => {
    for (let testRun = 0; testRun < 20; testRun++) {
      const cipher = generateCipher();
      for (const char of ALPHABET) {
        expect(cipher[char]).not.toBe(char);
      }
    }
  });

  test('seededRandom produces deterministic results for identical seeds', () => {
    const seed = '2026-09-01';
    const cipher1 = generateCipher(seed);
    const cipher2 = generateCipher(seed);

    expect(cipher1).toEqual(cipher2);
  });

  test('generateHints provides proper starter hint percentages by difficulty', () => {
    const quote = "THE POWERHOUSE OF THE CELL";
    const cipher = generateCipher();

    const easyHints = generateHints(quote, cipher, 'Easy');
    const normalHints = generateHints(quote, cipher, 'Normal');
    const hardHints = generateHints(quote, cipher, 'Hard');
    const legendaryHints = generateHints(quote, cipher, 'Legendary');

    expect(Object.keys(easyHints).length).toBeGreaterThanOrEqual(Object.keys(normalHints).length);
    expect(Object.keys(normalHints).length).toBeGreaterThanOrEqual(Object.keys(hardHints).length);
    expect(Object.keys(legendaryHints).length).toBe(0);
  });

  test('prepareGameData correctly categorizes alphabetic and punctuation cells', () => {
    const quoteData = { id: 'test-1', text: "HELLO, WORLD!", author: "Greeting", category: "Test" };
    const cipher = generateCipher();
    const cells = prepareGameData(quoteData, cipher);

    expect(cells.length).toBe(13);
    expect(cells[0].char).toBe('H');
    expect(cells[0].isPunctuation).toBe(false);
    expect(cells[0].cipherChar).toBe(cipher['H']);

    // Check comma and space
    expect(cells[5].char).toBe(',');
    expect(cells[5].isPunctuation).toBe(true);
    expect(cells[5].cipherChar).toBe('');

    expect(cells[6].char).toBe(' ');
    expect(cells[6].isPunctuation).toBe(true);
  });

  test('isSolved accurately verifies solved state', () => {
    const text = "CAT";
    const cipher = { C: 'X', A: 'Y', T: 'Z' };

    const solvedUserMap = { X: 'C', Y: 'A', Z: 'T' };
    expect(isSolved(text, solvedUserMap, cipher)).toBe(true);

    const partialUserMap = { X: 'C', Y: 'A' };
    expect(isSolved(text, partialUserMap, cipher)).toBe(false);

    const wrongUserMap = { X: 'C', Y: 'B', Z: 'T' };
    expect(isSolved(text, wrongUserMap, cipher)).toBe(false);
  });

  test('getLetterFrequencies accurately counts cipher occurrences and sorts descending', () => {
    const text = "ABBA";
    const cipher = { A: 'Z', B: 'X' };
    const userMap = { Z: 'A' };

    const freqs = getLetterFrequencies(text, cipher, userMap);

    expect(freqs.length).toBe(2);
    expect(freqs[0].frequency).toBe(2);
    expect(freqs[1].frequency).toBe(2);

    const zItem = freqs.find(f => f.cipherChar === 'Z');
    expect(zItem?.solved).toBe(true);

    const xItem = freqs.find(f => f.cipherChar === 'X');
    expect(xItem?.solved).toBe(false);
  });

  test('getNextUnsolvedIndex navigates to the next empty/incorrect cell with wrap-around', () => {
    const text = "ABC";
    const cipher = { A: 'X', B: 'Y', C: 'Z' };
    const userMap = { X: 'A', Z: 'C' }; // only B (index 1) is unsolved

    const nextIdx = getNextUnsolvedIndex(text, cipher, userMap, 0);
    expect(nextIdx).toBe(1);

    const wrapIdx = getNextUnsolvedIndex(text, cipher, userMap, 2);
    expect(wrapIdx).toBe(1);
  });

  test('getPreviousCellIndex finds the preceding alphabetic cell', () => {
    const text = "A, B";
    expect(getPreviousCellIndex(text, 3)).toBe(0); // Index 3 is 'B', previous alpha is 'A' at index 0
  });

  test('calculateSolveGrade assigns S-Rank for clean fast solves', () => {
    const gradeS = calculateSolveGrade(98, 0, 20, 'Normal', 0);
    expect(gradeS.grade).toBe('S');
    expect(gradeS.stars).toBe(3);

    const gradeA = calculateSolveGrade(88, 1, 40, 'Normal', 1);
    expect(gradeA.grade).toBe('A');

    const gradeB = calculateSolveGrade(75, 2, 60, 'Normal', 3);
    expect(gradeB.grade).toBe('B');
  });

  test('calculateScoreAndCoins grants fair scores, coins, and combo bonuses', () => {
    const quote = "THE STUDY OF LIVING ORGANISMS";
    const result = calculateScoreAndCoins(quote, 'Normal', 30, 0, 0, 5);

    expect(result.score).toBeGreaterThan(0);
    expect(result.coinsEarned).toBeGreaterThanOrEqual(25);
    expect(result.timeBonus).toBeGreaterThanOrEqual(0);
  });

  test('getComboMultiplier tiers match the advertised ladder and cap at 2.5x', () => {
    expect(getComboMultiplier(0)).toBe(1.0);
    expect(getComboMultiplier(1)).toBe(1.2);
    expect(getComboMultiplier(3)).toBe(1.5);
    expect(getComboMultiplier(6)).toBe(2.0);
    expect(getComboMultiplier(10)).toBe(2.5);
    expect(getComboMultiplier(999)).toBe(2.5);
  });

  test('combo multiplier actually raises the points score', () => {
    const noCombo = calculateScoreAndCoins('X', 'Normal', 30, 0, 0, 0);
    const fullCombo = calculateScoreAndCoins('X', 'Normal', 30, 0, 0, 10);
    expect(fullCombo.score).toBe(Math.round(noCombo.score * 2.5));
  });
});

describe('Quote Service & Content Database', () => {

  test('All quote categories in database have valid non-empty quotes and answers', () => {
    for (const [, quotes] of Object.entries(QUOTE_DB)) {
      expect(quotes.length).toBeGreaterThanOrEqual(10);
      for (const q of quotes) {
        expect(q.text.length).toBeGreaterThan(10);
        expect(q.author.length).toBeGreaterThan(0);
      }
    }
  });

  test('getNextQuote retrieves sequential quotes and detects completion', () => {
    const solvedSet = new Set<string>();
    const first = getNextQuote('biology', solvedSet);
    expect(first).not.toBeNull();
    expect(first?.id).toBe('biology-0');

    solvedSet.add('biology-0');
    const second = getNextQuote('biology', solvedSet);
    expect(second?.id).toBe('biology-1');
  });

  test('getGenreProgress and isGenreComplete work accurately', () => {
    const totalBio = QUOTE_DB['biology'].length;
    const solvedSet = new Set<string>();

    for (let i = 0; i < totalBio; i++) {
      solvedSet.add(`biology-${i}`);
    }

    expect(isGenreComplete('biology', solvedSet)).toBe(true);
    const progress = getGenreProgress('biology', solvedSet);
    expect(progress.completed).toBe(totalBio);
    expect(progress.total).toBe(totalBio);
  });

  test('getDailyQuote returns deterministic daily quotes for given dates', () => {
    const q1 = getDailyQuote('2026-09-01');
    const q2 = getDailyQuote('2026-09-01');
    expect(q1.text).toBe(q2.text);
    expect(q1.author).toBe(q2.author);
  });

  test('getRandomBlitzQuote returns a valid bite-sized puzzle', () => {
    const blitz = getRandomBlitzQuote();
    expect(blitz.text.length).toBeGreaterThan(0);
    expect(blitz.author.length).toBeGreaterThan(0);
    expect(blitz.category).toBe('Blitz Rush');
  });
});
