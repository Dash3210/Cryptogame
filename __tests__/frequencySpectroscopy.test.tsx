import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Vibration, AccessibilityInfo } from 'react-native';
import { GameProvider } from '../src/context/GameContext';
import { FrequencyBar } from '../src/components/FrequencyBar';
import {
    SPRING_PRESETS,
    ENGLISH_LETTER_FREQUENCIES,
    ENGLISH_FREQUENCY_RANK,
} from '../src/utils/physics';

describe('Spectroscopic Frequency Resonance Bar Test Suite', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('English Baseline & Physics Constants', () => {
        test('ENGLISH_LETTER_FREQUENCIES contains all 26 uppercase alphabet letters', () => {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            alphabet.forEach(letter => {
                expect(ENGLISH_LETTER_FREQUENCIES[letter]).toBeDefined();
                expect(ENGLISH_LETTER_FREQUENCIES[letter]).toBeGreaterThan(0);
            });
            // Verify 'E' is the highest English frequency
            expect(ENGLISH_LETTER_FREQUENCIES['E']).toBe(12.7);
        });

        test('ENGLISH_FREQUENCY_RANK has 26 letters and starts with ETAOIN', () => {
            expect(ENGLISH_FREQUENCY_RANK.length).toBe(26);
            expect(ENGLISH_FREQUENCY_RANK.slice(0, 6)).toEqual(['E', 'T', 'A', 'O', 'I', 'N']);
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

    describe('FrequencyBar Component Rendering & Interaction', () => {
        const mockFrequencies = [
            { char: 'E', cipherChar: 'Z', frequency: 12, solved: false },
            { char: 'T', cipherChar: 'Q', frequency: 8, solved: true },
            { char: 'A', cipherChar: 'K', frequency: 5, solved: false },
        ];

        test('renders null safely when frequencies array is empty or undefined', async () => {
            let renderer: any;
            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <FrequencyBar
                            frequencies={[]}
                            selectedCipherChar={null}
                            onSelectCipherChar={jest.fn()}
                        />
                    </GameProvider>
                );
            });

            expect(renderer.toJSON()).toBeNull();
        });

        test('renders header title, peak frequency, and spectral chips with ETAOIN benchmarks', async () => {
            const onSelect = jest.fn();
            let renderer: any;

            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <FrequencyBar
                            frequencies={mockFrequencies}
                            selectedCipherChar="Z"
                            onSelectCipherChar={onSelect}
                        />
                    </GameProvider>
                );
            });

            const treeStr = JSON.stringify(renderer.toJSON());
            expect(treeStr).toContain('LETTER FREQUENCY');
            expect(treeStr).toContain('PEAK: ');
            expect(treeStr).toContain('English average');
            // Check ETAOIN benchmark tokens
            expect(treeStr).toContain('"~"');
            expect(treeStr).toContain('"E"');
            expect(treeStr).toContain('"T"');
            // Solved indicator for Q -> T
            expect(treeStr).toContain('→');
        });

        test('pressing a spectral chip triggers haptic feedback and invokes onSelectCipherChar', async () => {
            const onSelect = jest.fn();
            let renderer: any;

            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <FrequencyBar
                            frequencies={mockFrequencies}
                            selectedCipherChar={null}
                            onSelectCipherChar={onSelect}
                        />
                    </GameProvider>
                );
            });

            const root = renderer.root;
            const pressables = root.findAll(
                (node: any) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function'
            );
            expect(pressables.length).toBe(3);

            // Press the first chip ('Z')
            await ReactTestRenderer.act(async () => {
                pressables[0].props.onPress();
            });

            expect(onSelect).toHaveBeenCalledWith('Z');
            expect(Vibration.vibrate).toHaveBeenCalledWith(6); // ripple haptic duration

            // Verify accessibilityState and accessibilityLabel
            expect(pressables[0].props.accessibilityState).toEqual({ selected: false });
            expect(pressables[1].props.accessibilityLabel).toContain('decoded as T');
        });

        test('rare English letters with <1% frequency format gracefully as <1% instead of 0%', async () => {
            const rareFrequencies = [
                ...mockFrequencies,
                ...Array.from({ length: 20 }, (_, i) => ({
                    char: String.fromCharCode(65 + i),
                    cipherChar: `X${i}`,
                    frequency: 1,
                    solved: false,
                })),
                { char: 'Z', cipherChar: 'W', frequency: 1, solved: false }, // rank 23+ (Z ~0.07%)
            ];

            let renderer: any;
            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <FrequencyBar
                            frequencies={rareFrequencies}
                            selectedCipherChar="W"
                            onSelectCipherChar={jest.fn()}
                        />
                    </GameProvider>
                );
            });

            const treeStr = JSON.stringify(renderer.toJSON());
            expect(treeStr).toContain('<1%');
        });

        test('handles reduced motion mode without throwing errors', async () => {
            jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

            let renderer: any;
            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <FrequencyBar
                            frequencies={mockFrequencies}
                            selectedCipherChar="Q"
                            onSelectCipherChar={jest.fn()}
                        />
                    </GameProvider>
                );
            });

            expect(renderer).toBeDefined();
        });
    });
});
