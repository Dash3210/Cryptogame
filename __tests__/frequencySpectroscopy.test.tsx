import {
    SPRING_PRESETS,
    ENGLISH_LETTER_FREQUENCIES,
    ENGLISH_FREQUENCY_RANK,
    englishFrequencyWeight,
} from '../src/utils/physics';

describe('English frequency hints', () => {
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

    test('englishFrequencyWeight normalises E to 1 and rare letters toward 0', () => {
        expect(englishFrequencyWeight('E')).toBeCloseTo(1, 5);
        expect(englishFrequencyWeight('e')).toBeCloseTo(1, 5);
        expect(englishFrequencyWeight('Z')).toBeLessThan(0.05);
        expect(englishFrequencyWeight('Q')).toBeLessThan(0.05);
        // Always inside [0, 1]
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            const w = englishFrequencyWeight(letter);
            expect(w).toBeGreaterThanOrEqual(0);
            expect(w).toBeLessThanOrEqual(1);
        });
        // Unknown input is safe
        expect(englishFrequencyWeight('1')).toBe(0);
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
