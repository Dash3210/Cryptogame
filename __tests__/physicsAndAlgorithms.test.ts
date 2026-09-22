import {
    SPRING_PRESETS,
    triggerTactileHaptic,
    calculateWaveDelay,
    generateEnigmaShareCard
} from '../src/utils/physics';

import {
    generateCaesarCipher,
    generateAtbashCipher,
    generateAffineCipher,
    encodePuzzleToUrl,
    decodePuzzleFromUrl,
    stringToBase64Url,
    base64UrlToString,
    calculateAccuracy,
    calculateSolveGrade,
    ALPHABET,
} from '../src/utils/cipher';

import { Vibration } from 'react-native';

describe('Physics, Tactile, and Advanced Cipher Algorithms', () => {

    describe('Physics Springs & Tactile Haptics', () => {
        test('SPRING_PRESETS have valid tension, friction and useNativeDriver enabled', () => {
            const presets = [
                SPRING_PRESETS.KEY_DOWN,
                SPRING_PRESETS.KEY_REBOUND,
                SPRING_PRESETS.CELL_INPUT_POP,
                SPRING_PRESETS.RIPPLE_NODE,
                SPRING_PRESETS.MAGNETIC_LOCK,
                SPRING_PRESETS.MODAL_SPRING,
            ];

            presets.forEach(p => {
                expect(p.tension).toBeGreaterThan(50);
                expect(p.friction).toBeGreaterThan(0);
                expect(p.useNativeDriver).toBe(true);
            });
        });

        test('triggerTactileHaptic executes Vibration.vibrate with correct durations', () => {
            const vibrateSpy = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

            triggerTactileHaptic('key_down', true);
            expect(vibrateSpy).toHaveBeenCalledWith(10);

            triggerTactileHaptic('ripple', true);
            expect(vibrateSpy).toHaveBeenCalledWith(6);

            triggerTactileHaptic('word_complete', true);
            expect(vibrateSpy).toHaveBeenCalledWith([0, 18, 40, 24]);

            triggerTactileHaptic('victory', true);
            expect(vibrateSpy).toHaveBeenCalledWith([0, 30, 60, 45, 75, 60]);

            triggerTactileHaptic('light', true);
            expect(vibrateSpy).toHaveBeenCalledWith(12);

            triggerTactileHaptic('key_down', false);
            // Shouldn't be called when haptics are disabled
            expect(vibrateSpy).toHaveBeenCalledTimes(5);

            vibrateSpy.mockRestore();
        });

        test('calculateWaveDelay computes Euclidean distance delays capped at 280ms', () => {
            // Same cell: 0 delay
            expect(calculateWaveDelay(5, 5, 10)).toBe(0);

            // Adjacent cell: ~35ms
            const adjDelay = calculateWaveDelay(0, 1, 10);
            expect(adjDelay).toBe(35);

            // Far cell: capped at 280ms
            const farDelay = calculateWaveDelay(0, 99, 10);
            expect(farDelay).toBeLessThanOrEqual(280);
            expect(farDelay).toBe(280);
        });

        test('generateEnigmaShareCard produces spoiler-free score card with emoji matrix', () => {
            const card = generateEnigmaShareCard({
                quoteText: 'Mitochondria is the powerhouse',
                userMap: { 'A': 'M', 'B': 'I', 'C': 'T' },
                cipherMap: { 'M': 'A', 'I': 'B', 'T': 'C' },
                timeSeconds: 75,
                grade: 'S',
                accuracy: 100,
                category: 'Biology',
                dateStr: '2026-09-15',
            });

            expect(card).toContain('BrainCipher Daily #2026-09-15');
            expect(card).toContain('⏱️ 1:15');
            expect(card).toContain('🎯 100%');
            expect(card).toContain('🏆 Grade S');
            expect(card).toContain('🟩');
            expect(card).toContain('https://braincipher.app');
        });

        test('generateEnigmaShareCard produces a rectangular 5-wide emoji grid', () => {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const cipherMap: Record<string, string> = {};
            const userMap: Record<string, string> = {};
            for (let i = 0; i < 26; i++) {
                cipherMap[alphabet[i]] = alphabet[(i + 7) % 26];
                userMap[cipherMap[alphabet[i]]] = alphabet[i];
            }

            const card = generateEnigmaShareCard({
                quoteText: 'THE POWERHOUSE OF THE CELL RESPONSIBLE FOR GENERATING ENERGY',
                userMap,
                cipherMap,
                timeSeconds: 42,
                grade: 'S',
                accuracy: 100,
                category: 'Biology',
            });

            const isGridRow = (line: string) =>
                line.length > 0 &&
                [...line].every(ch => ch === '🟩' || ch === '🟥' || ch === '⬛');
            const gridRows = card.split('\n').filter(isGridRow);
            expect(gridRows.length).toBeGreaterThan(0);
            // Every row must be exactly 5 blocks wide (the old bug produced 5/1/5/1).
            gridRows.forEach(row => expect([...row].length).toBe(5));
        });
    });

    describe('Multi-Algorithm Ciphers', () => {
        test('generateCaesarCipher correctly shifts letters by given offset', () => {
            const rot3 = generateCaesarCipher(3);
            expect(rot3['A']).toBe('D');
            expect(rot3['B']).toBe('E');
            expect(rot3['X']).toBe('A');
            expect(rot3['Y']).toBe('B');
            expect(rot3['Z']).toBe('C');

            // Must be bijective (26 distinct values)
            expect(new Set(Object.values(rot3)).size).toBe(26);
        });

        test('generateAtbashCipher correctly inverts the alphabet symmetrically', () => {
            const atbash = generateAtbashCipher();
            expect(atbash['A']).toBe('Z');
            expect(atbash['Z']).toBe('A');
            expect(atbash['B']).toBe('Y');
            expect(atbash['M']).toBe('N');
            expect(atbash['N']).toBe('M');

            // Atbash is an involution: applying it twice recovers the original
            for (const char of ALPHABET) {
                const enc = atbash[char];
                expect(atbash[enc]).toBe(char);
                expect(char).not.toBe(enc); // No fixed points in 26-letter alphabet
            }
        });

        test('generateAffineCipher produces valid 26-character substitution', () => {
            const affine = generateAffineCipher(5, 8);
            expect(Object.keys(affine).length).toBe(26);
            expect(new Set(Object.values(affine)).size).toBe(26);

            for (const char of ALPHABET) {
                expect(affine[char]).toBeDefined();
            }
        });
    });

    describe('UGC Puzzle Serialization', () => {
        test('stringToBase64Url and base64UrlToString roundtrip correctly with Unicode', () => {
            const original = 'E = mc² — "Special Relativity" 🚀 100%';
            const encoded = stringToBase64Url(original);
            expect(encoded).not.toContain('+');
            expect(encoded).not.toContain('/');
            expect(encoded).not.toContain('=');

            const decoded = base64UrlToString(encoded);
            expect(decoded).toBe(original);
        });

        test('encodePuzzleToUrl and decodePuzzleFromUrl serialize and restore valid QuoteData', () => {
            const puzzle = {
                id: 'custom-1',
                text: 'The fundamental force holding quarks together',
                author: 'STRONG INTERACTION',
                category: 'Particle Physics',
                difficulty: 'Hard' as const,
            };

            const urlToken = encodePuzzleToUrl(puzzle);
            expect(urlToken.length).toBeGreaterThan(10);

            const restored = decodePuzzleFromUrl(urlToken);
            expect(restored).not.toBeNull();
            expect(restored?.text).toBe(puzzle.text);
            expect(restored?.author).toBe(puzzle.author);
            expect(restored?.category).toBe(puzzle.category);
            expect(restored?.difficulty).toBe('Hard');
        });

        test('decodePuzzleFromUrl safely returns null on malformed or empty data', () => {
            expect(decodePuzzleFromUrl('')).toBeNull();
            expect(decodePuzzleFromUrl('invalid-data-$$$')).toBeNull();
            expect(decodePuzzleFromUrl(stringToBase64Url(JSON.stringify({ t: '' })))).toBeNull();
        });
    });

    describe('Accuracy & Solve Grade Invariant Enforcement', () => {
        test('0 correct and 4 mistakes yields exactly 0% accuracy (not 100%)', () => {
            const acc = calculateAccuracy(0, 0, 4);
            expect(acc).toBe(0);
        });

        test('0 correct and 0 mistakes in empty state yields 100%', () => {
            const acc = calculateAccuracy(0, 0, 0);
            expect(acc).toBe(100);
        });

        test('10 correct and 0 mistakes yields 100%', () => {
            const acc = calculateAccuracy(10, 10, 0);
            expect(acc).toBe(100);
        });

        test('mistakesCount > 0 strictly caps accuracy at <= 99%, never 100%', () => {
            // Even if correctCount == totalCount, if there are mistakes, accuracy cannot be 100%
            const acc = calculateAccuracy(100, 100, 1);
            expect(acc).toBeLessThan(100);
            expect(acc).toBe(99);
        });

        test('0 correct and 4 mistakes with grade calculator gives Grade D (never Grade A)', () => {
            const acc = calculateAccuracy(0, 0, 4);
            const grade = calculateSolveGrade(acc, 0, 0, 'Normal', 4);
            expect(grade.grade).toBe('D');
            expect(grade.stars).toBe(1);
            expect(grade.title).toBe('Cipher Apprentice');
        });

        test('Flawless solve (0 hints, 0 mistakes, >=95% accuracy) yields Grade S', () => {
            const acc = calculateAccuracy(20, 20, 0);
            const grade = calculateSolveGrade(acc, 0, 45, 'Hard', 0);
            expect(grade.grade).toBe('S');
            expect(grade.stars).toBe(3);
            expect(grade.title).toBe('Flawless Mastermind');
        });

        test('Expert solve with 1 hint and 2 mistakes yields Grade A', () => {
            const acc = calculateAccuracy(18, 20, 2);
            const grade = calculateSolveGrade(acc, 1, 60, 'Normal', 2);
            expect(grade.grade).toBe('A');
            expect(grade.stars).toBe(3);
        });
    });
});
