import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from '../src/context/GameContext';
import { LibraryScreen } from '../src/screens/LibraryScreen';
import { DAILY_QUOTES, BRANCHES, QUOTE_DB } from '../src/data/quotes';
import { getBranchesForTrack, getBranchProgress } from '../src/services/quoteService';

describe('Public Domain Compliance & Branch Invariants', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('DAILY_QUOTES Public Domain Invariant', () => {
        test('DAILY_QUOTES has exactly 20 quotes', () => {
            expect(DAILY_QUOTES.length).toBe(20);
        });

        test('EVERY DAILY_QUOTES entry has a non-empty source and a year <= 1930', () => {
            DAILY_QUOTES.forEach((quote) => {
                expect(quote.text).toBeDefined();
                expect(typeof quote.text).toBe('string');
                expect(quote.text.trim().length).toBeGreaterThan(0);

                expect(quote.author).toBeDefined();
                expect(typeof quote.author).toBe('string');
                expect(quote.author.trim().length).toBeGreaterThan(0);

                expect(quote.source).toBeDefined();
                expect(typeof quote.source).toBe('string');
                expect(quote.source.trim().length).toBeGreaterThan(0);

                expect(typeof quote.year).toBe('number');
                expect(Number.isInteger(quote.year)).toBe(true);
                expect(quote.year).toBeLessThanOrEqual(1930);
            });
        });

        test('all DAILY_QUOTES entries are unique without duplicate texts', () => {
            const texts = DAILY_QUOTES.map(q => q.text);
            const uniqueTexts = new Set(texts);
            expect(uniqueTexts.size).toBe(DAILY_QUOTES.length);
        });
    });

    describe('Physics Branch Structure Registration', () => {
        const expectedBranches = [
            { id: 'scientific-foundations', tracks: ['physics', 'chemistry', 'biology', 'astronomy'], order: 0 },
            { id: 'physics-mechanics', tracks: ['physics'], order: 1 },
            { id: 'physics-fluids', tracks: ['physics'], order: 2 },
            { id: 'physics-thermodynamics', tracks: ['physics'], order: 3 },
            { id: 'physics-waves-sound', tracks: ['physics'], order: 4 },
            { id: 'physics-electromagnetism', tracks: ['physics'], order: 5 },
            { id: 'physics-optics', tracks: ['physics'], order: 6 },
            { id: 'physics-modern', tracks: ['physics'], order: 7 },
            { id: 'physics-nuclear-particle', tracks: ['physics'], order: 8 },
        ];

        test.each(expectedBranches)('branch $id is registered with correct tracks and order $order', ({ id, tracks, order }) => {
            const branch = BRANCHES.find(b => b.id === id);
            expect(branch).toBeDefined();
            expect(branch!.tracks).toEqual(tracks);
            expect(branch!.order).toBe(order);
            expect(branch!.label).toBeDefined();
            expect(branch!.label.length).toBeGreaterThan(0);
            expect(branch!.description).toBeDefined();
            expect(branch!.icon).toBeDefined();
        });

        test('empty physics branches have zero levels in QUOTE_DB and are empty', () => {
            expectedBranches.forEach(({ id }) => {
                expect(QUOTE_DB[id]?.length ?? 0).toBe(0);
                const progress = getBranchProgress(id, new Set());
                expect(progress.total).toBe(0);
            });
        });
    });

    describe('Zero-Level Branch Filtering (Requirement 1)', () => {
        test('branches with zero levels are filtered out from playable list for a track', () => {
            const physicsBranches = getBranchesForTrack('physics');
            // Physics track has registered branches, but only branches with > 0 levels should be playable
            const activeBranches = physicsBranches.filter(b => getBranchProgress(b.id, new Set()).total > 0);
            expect(activeBranches.length).toBe(1);
            expect(activeBranches[0].id).toBe('physics');
            expect(activeBranches[0].label).toBe('Physics');

            // Empty branches must not be in active branches
            const emptyIds = [
                'scientific-foundations',
                'physics-mechanics',
                'physics-fluids',
                'physics-thermodynamics',
                'physics-waves-sound',
                'physics-electromagnetism',
                'physics-optics',
                'physics-modern',
                'physics-nuclear-particle'
            ];
            emptyIds.forEach(id => {
                expect(activeBranches.some(b => b.id === id)).toBe(false);
            });
        });

        test('LibraryScreen does not render zero-level branches or branch available soon cards', async () => {
            let renderer: any;
            await ReactTestRenderer.act(async () => {
                renderer = ReactTestRenderer.create(
                    <NavigationContainer>
                        <GameProvider>
                            <LibraryScreen />
                        </GameProvider>
                    </NavigationContainer>
                );
                jest.runAllTimers();
            });

            const json = JSON.stringify(renderer.toJSON());

            // Zero-level branch descriptions and labels must NOT be rendered
            expect(json).not.toContain('Motion, Forces, Energy');
            expect(json).not.toContain('Fluid Dynamics');
            expect(json).not.toContain('Heat, Temperature');
            expect(json).not.toContain('Scientific Inquiry');
            expect(json).not.toContain('branch, available soon');

            await ReactTestRenderer.act(async () => {
                renderer.unmount();
            });
        });
    });
});
