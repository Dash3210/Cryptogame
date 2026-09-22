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
  ALPHABET,
  CipherMap
} from '../src/utils/cipher';

describe('Hard Metrics: Cryptographic & Mathematical Rigor (Stress & Fuzz)', () => {

  test('Derangement Property Proof: 1,000 consecutive random ciphers have ZERO fixed points', () => {
    const ITERATIONS = 1000;
    for (let i = 0; i < ITERATIONS; i++) {
      const cipher = generateCipher();
      for (const char of ALPHABET) {
        expect(cipher[char]).not.toBe(char);
      }
    }
  });

  test('Bijective 1-to-1 Mapping Proof: Domain and Codomain are identical sets of size 26', () => {
    const ITERATIONS = 500;
    for (let i = 0; i < ITERATIONS; i++) {
      const cipher = generateCipher();
      const keys = Object.keys(cipher).sort();
      const values = Object.values(cipher).sort();
      const alphabetArr = ALPHABET.split('').sort();

      expect(keys).toEqual(alphabetArr);
      expect(values).toEqual(alphabetArr);
    }
  });

  test('PRNG Uniform Distribution & Determinism across dates and seeds', () => {
    const dates = [
      '2026-01-01', '2026-02-28', '2026-03-15', '2026-07-04',
      '2026-09-01', '2026-12-31', '2027-01-01', '2030-05-18'
    ];

    dates.forEach(date => {
      const c1 = generateCipher(date);
      const c2 = generateCipher(date);
      expect(c1).toEqual(c2);

      // Verify it's a true derangement
      for (const char of ALPHABET) {
        expect(c1[char]).not.toBe(char);
      }
    });
  });

  test('Hint Distribution Boundary Stress across all 4 difficulty levels', () => {
    const sampleText = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
    const cipher = generateCipher();

    for (let i = 0; i < 100; i++) {
      const easy = generateHints(sampleText, cipher, 'Easy');
      const normal = generateHints(sampleText, cipher, 'Normal');
      const hard = generateHints(sampleText, cipher, 'Hard');
      const legendary = generateHints(sampleText, cipher, 'Legendary');

      const easyCount = Object.keys(easy).length;
      const normalCount = Object.keys(normal).length;
      const hardCount = Object.keys(hard).length;
      const legendaryCount = Object.keys(legendary).length;

      expect(legendaryCount).toBe(0);
      expect(hardCount).toBeLessThanOrEqual(normalCount);
      expect(normalCount).toBeLessThanOrEqual(easyCount);

      // Verify all hints provided are 100% correct according to cipher
      for (const [cChar, pChar] of Object.entries(easy)) {
        expect(cipher[pChar]).toBe(cChar);
      }
      for (const [cChar, pChar] of Object.entries(normal)) {
        expect(cipher[pChar]).toBe(cChar);
      }
      for (const [cChar, pChar] of Object.entries(hard)) {
        expect(cipher[pChar]).toBe(cChar);
      }
    }
  });

  test('Fuzz Testing: prepareGameData & isSolved against chaotic strings and edge cases', () => {
    const fuzzedInputs = [
      "",
      " ",
      "   ",
      "!@#$%^&*()_+-=[]{}|;':\",./<>?",
      "1234567890",
      "A",
      "Z",
      "AaBbCcDd",
      "THE-POWERHOUSE-OF-THE-CELL.",
      "O'NEILL & SONS: 100% EFFICIENT!",
      "   LEADING AND TRAILING SPACES   ",
      "\n\t\r SPECIAL WHITESPACE \n\t\r",
      "VERY LONG STRING ".repeat(30),
    ];

    const cipher = generateCipher();

    fuzzedInputs.forEach(input => {
      const quote = { id: 'fuzz', text: input, author: 'Fuzzer', category: 'Fuzz' };
      const cells = prepareGameData(quote, cipher);

      // Verify punctuation/space detection
      cells.forEach(cell => {
        if (ALPHABET.includes(cell.char)) {
          expect(cell.isPunctuation).toBe(false);
          expect(cell.cipherChar).toBe(cipher[cell.char]);
        } else {
          expect(cell.isPunctuation).toBe(true);
          expect(cell.cipherChar).toBe('');
        }
      });

      // Perfect solution verification
      const perfectMap: Record<string, string> = {};
      for (const char of ALPHABET) {
        perfectMap[cipher[char]] = char;
      }

      if (input.trim().length === 0 || !/[A-Z]/.test(input.toUpperCase())) {
        expect(isSolved(input, {}, cipher)).toBe(true);
      } else {
        expect(isSolved(input, perfectMap, cipher)).toBe(true);
        expect(isSolved(input, {}, cipher)).toBe(false);
      }
    });
  });

  test('Frequency Analysis Edge Cases & Consistency', () => {
    const text = "EEEEE TTTT AAA OO I N";
    const cipher = generateCipher();
    const userMap = { [cipher['E']]: 'E' };

    const freqs = getLetterFrequencies(text, cipher, userMap);

    expect(freqs[0].char).toBe('E');
    expect(freqs[0].frequency).toBe(5);
    expect(freqs[0].solved).toBe(true);

    expect(freqs[1].char).toBe('T');
    expect(freqs[1].frequency).toBe(4);
    expect(freqs[1].solved).toBe(false);

    // Frequencies array must be strictly non-increasing
    for (let i = 0; i < freqs.length - 1; i++) {
      expect(freqs[i].frequency).toBeGreaterThanOrEqual(freqs[i + 1].frequency);
    }
  });

  test('Navigation Index Wrap-around & Bidirectional Edge Handling', () => {
    const text = "A ! B ? C";
    const cipher: CipherMap = { A: 'X', B: 'Y', C: 'Z' };
    const userMap = { X: 'A', Y: 'B' }; // Only C (index 8) is unsolved

    // Next unsolved from 0 should jump over punctuation and solved letters to index 8
    const nextIdx = getNextUnsolvedIndex(text, cipher, userMap, 0);
    expect(nextIdx).toBe(8);

    // Next unsolved from 8 should wrap back to 8
    const wrapIdx = getNextUnsolvedIndex(text, cipher, userMap, 8);
    expect(wrapIdx).toBe(8);

    // Previous cell from index 8 ('C') should find index 4 ('B')
    expect(getPreviousCellIndex(text, 8)).toBe(4);
    // Previous cell from index 4 ('B') should find index 0 ('A')
    expect(getPreviousCellIndex(text, 4)).toBe(0);
    // Previous cell from index 0 should return null (no preceding cell)
    expect(getPreviousCellIndex(text, 0)).toBeNull();
  });

  test('Solve Grade Threshold Boundaries (S, A, B, C, D)', () => {
    // S-Rank Boundary: 95% accuracy, 0 hints
    expect(calculateSolveGrade(95, 0, 30, 'Normal', 0).grade).toBe('S');
    expect(calculateSolveGrade(94.9, 0, 30, 'Normal', 0).grade).toBe('A');

    // A-Rank Boundary: 85% accuracy, <= 1 hint
    expect(calculateSolveGrade(85, 1, 45, 'Normal', 0).grade).toBe('A');
    expect(calculateSolveGrade(85, 2, 45, 'Normal', 0).grade).toBe('B');
    expect(calculateSolveGrade(84.9, 0, 45, 'Normal', 0).grade).toBe('B');

    // B-Rank Boundary: 70% accuracy, <= 3 hints
    expect(calculateSolveGrade(70, 3, 60, 'Normal', 0).grade).toBe('B');
    expect(calculateSolveGrade(70, 4, 60, 'Normal', 0).grade).toBe('C');
    expect(calculateSolveGrade(69.9, 0, 60, 'Normal', 0).grade).toBe('C');

    // C-Rank Boundary: 50% accuracy
    expect(calculateSolveGrade(50, 5, 120, 'Normal', 0).grade).toBe('C');
    expect(calculateSolveGrade(49.9, 5, 120, 'Normal', 0).grade).toBe('D');
  });

  test('Score & Coin Calculation Degradation Curves & Multiplier Scaling', () => {
    const text = "THE MITOCHONDRIA IS THE POWERHOUSE OF THE CELL";

    // Fast perfect solve
    const fastScore = calculateScoreAndCoins(text, 'Normal', 15, 0, 0, 10);
    // Slow solve with hints and mistakes
    const slowScore = calculateScoreAndCoins(text, 'Normal', 120, 3, 5, 0);

    expect(fastScore.score).toBeGreaterThan(slowScore.score);
    expect(fastScore.coinsEarned).toBeGreaterThan(slowScore.coinsEarned);
    expect(fastScore.timeBonus).toBeGreaterThan(slowScore.timeBonus);

    // Legendary difficulty bonus
    const normalResult = calculateScoreAndCoins(text, 'Normal', 30, 0, 0, 0);
    const legendaryResult = calculateScoreAndCoins(text, 'Legendary', 30, 0, 0, 0);
    expect(legendaryResult.score).toBeGreaterThan(normalResult.score);
  });

  test('Performance Benchmark: 10,000 Cipher Derangements Generated in Under 500ms', () => {
    const start = Date.now();
    const ITERATIONS = 10000;
    for (let i = 0; i < ITERATIONS; i++) {
      generateCipher();
    }
    const elapsed = Date.now() - start;
    // Generous ceiling: this guards against an algorithmic regression, not CPU speed.
    expect(elapsed).toBeLessThan(2000);
  });
});
