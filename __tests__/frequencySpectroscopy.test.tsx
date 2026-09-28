import {
    SPRING_PRESETS,
    ENGLISH_LETTER_FREQUENCIES,
    ENGLISH_FREQUENCY_RANK,
} from '../src/utils/physics';
import {
    calculateBoardHintWeight,
    getBoardHintWeights,
} from '../src/utils/cipher';

describe('Board frequency hints (Item 4)', () => {
    test('ENGLISH_LETTER_FREQUENCIES contains all 26 uppercase letters with E highest', () => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        alphabet.forEach(letter => {
            expect(ENGLISH_LETTER_FREQUENCIES[letter]).toBeDefined();
            expect(ENGLISH_LETTER_FREQUENCIES[letter]).toBeGreaterThan(0);
        });
        expect(ENGLISH_LETTER_FREQUENCIES.E).toBe(12.7);
        const max = Math.max(...Object.values(ENGLISH_LETTER_FREQUENCIES));
        expect(ENGLISH_LETTER_FREQUENCIES.E).toBe(max);
    });

    test('ENGLISH_FREQUENCY_RANK has 26 letters and starts with ETAOIN', () => {
        expect(ENGLISH_FREQUENCY_RANK.length).toBe(26);
        expect(ENGLISH_FREQUENCY_RANK.slice(0, 6)).toEqual(['E', 'T', 'A', 'O', 'I', 'N']);
    });

    /**
     * Item (4) rule: Keyboard frequency hints must reflect THIS board, not English averages.
     * Required:
     * - Shade ONLY letters the player has already decoded, using this board's real counts.
     * - hintWeight(k) = (count of k in quoteData.text) / (max letter count in quoteData.text),
     *   but ONLY when k is decoded; otherwise exactly 0.
     * - A decoded letter with count 0 must stay completely unlit (no N in board means N is never bright).
     * - Undecoded keys render neutral (weight 0) so nothing leaks.
     */
    test('calculateBoardHintWeight shades ONLY decoded letters using current board counts', () => {
        const text = 'EEETT'; // E appears 3 times (max), T appears 2 times, N does not appear (count 0)
        const cipherMap = { E: 'X', T: 'Y', N: 'Z' };

        // 1. When nothing is decoded yet, all weights must be exactly 0 (nothing leaks)
        expect(calculateBoardHintWeight('E', text, cipherMap, {})).toBe(0);
        expect(calculateBoardHintWeight('T', text, cipherMap, {})).toBe(0);
        expect(calculateBoardHintWeight('N', text, cipherMap, {})).toBe(0);

        // 2. When E is decoded (userMap maps X -> E), E receives weight 3 / 3 = 1.0
        // Undecoded T must remain exactly 0
        const userMapE = { X: 'E' };
        expect(calculateBoardHintWeight('E', text, cipherMap, userMapE)).toBeCloseTo(1.0, 5);
        expect(calculateBoardHintWeight('e', text, cipherMap, userMapE)).toBeCloseTo(1.0, 5);
        expect(calculateBoardHintWeight('T', text, cipherMap, userMapE)).toBe(0);

        // 3. When both E and T are decoded, E = 3/3 = 1.0, T = 2/3 ≈ 0.6667
        const userMapBoth = { X: 'E', Y: 'T' };
        expect(calculateBoardHintWeight('E', text, cipherMap, userMapBoth)).toBeCloseTo(1.0, 5);
        expect(calculateBoardHintWeight('T', text, cipherMap, userMapBoth)).toBeCloseTo(2 / 3, 5);

        // 4. A letter with count 0 in the board stays completely unlit (0), even if decoded
        const userMapWithN = { ...userMapBoth, Z: 'N' };
        expect(calculateBoardHintWeight('N', text, cipherMap, userMapWithN)).toBe(0);

        // 5. Weights are always in [0, 1]
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            const w = calculateBoardHintWeight(letter, text, cipherMap, userMapBoth);
            expect(w).toBeGreaterThanOrEqual(0);
            expect(w).toBeLessThanOrEqual(1);
        });

        // 6. Unknown / non-letter input is safe (0)
        expect(calculateBoardHintWeight('1', text, cipherMap, userMapBoth)).toBe(0);
        expect(calculateBoardHintWeight('!', text, cipherMap, userMapBoth)).toBe(0);
    });

    test('getBoardHintWeights computes weights for all decoded letters on board', () => {
        const text = 'HELLO WORLD';
        // Counts: L: 3 (max), O: 2, H: 1, E: 1, W: 1, R: 1, D: 1
        const cipherMap = { H: 'A', E: 'B', L: 'C', O: 'D', W: 'E', R: 'F', D: 'G' };
        const userMap = { C: 'L', D: 'O' }; // decoded L and O only

        const weights = getBoardHintWeights(text, cipherMap, userMap);
        expect(weights.L).toBeCloseTo(3 / 3, 5);
        expect(weights.O).toBeCloseTo(2 / 3, 5);
        expect(weights.H).toBeUndefined(); // undecoded
        expect(weights.E).toBeUndefined(); // undecoded
        expect(weights.Z).toBeUndefined(); // not in text
    });

    test('SPRING_PRESETS includes spectral snap and pulse presets', () => {
        expect(SPRING_PRESETS.SPECTRAL_SNAP.tension).toBe(320);
        expect(SPRING_PRESETS.SPECTRAL_SNAP.friction).toBe(20);
        expect(SPRING_PRESETS.SPECTRAL_SNAP.useNativeDriver).toBe(true);

        expect(SPRING_PRESETS.SPECTRAL_PULSE.tension).toBe(240);
        expect(SPRING_PRESETS.SPECTRAL_PULSE.friction).toBe(12);
        expect(SPRING_PRESETS.SPECTRAL_PULSE.useNativeDriver).toBe(true);
    });
});
