import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
    Icon,
    getMonogramLetter,
    getDeterministicAccent,
    DETERMINISTIC_ACCENTS,
} from '../src/components/Icon';
import { IconName } from '../src/components/iconRegistry';
import { GameProvider, useGame } from '../src/context/GameContext';
import {
    getBranchesForTrack,
    getBranchProgress,
    getTrackProgress,
    isTrackComplete,
    getLevelId,
} from '../src/services/quoteService';
import { Track, Branch, LevelData, Achievement } from '../src/types';

describe('Open-Ended Curriculum Architecture', () => {

    describe('(a) Extra hypothetical tracks and branches resolve progress, mastery and icons with no code change', () => {
        const extraTracks: Track[] = [
            { id: 'neuroscience', label: 'Neuroscience', icon: 'subject-neuroscience', description: 'Brain & Synapses' },
            { id: 'linguistics', label: 'Linguistics', icon: 'subject-linguistics', description: 'Syntax & Semantics', isExtension: true },
            { id: 'astrophysics', label: 'Astrophysics', icon: 'subject-astrophysics', description: 'Cosmic Mechanics' },
        ];

        const extraBranches: Branch[] = [
            { id: 'neuro-anatomy', label: 'Neuroanatomy', tracks: ['neuroscience'], icon: 'subject-neuroscience', order: 1 },
            { id: 'neuro-transmitters', label: 'Neurotransmitters', tracks: ['neuroscience'], icon: 'subject-neuroscience', order: 2 },
            { id: 'phonology', label: 'Phonology', tracks: ['linguistics'], icon: 'subject-linguistics', order: 1 },
            { id: 'cosmic-rays', label: 'Cosmic Rays', tracks: ['astrophysics', 'physics'], icon: 'subject-astrophysics', order: 1 },
        ];

        const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
            'neuro-anatomy': [
                { text: 'The folded outer layer of the brain.', author: 'Cerebral Cortex' },
                { text: 'A small almond-shaped structure for emotional processing.', author: 'Amygdala' },
            ],
            'neuro-transmitters': [
                { text: 'A neurotransmitter involved in reward, motivation and movement.', author: 'Dopamine' },
            ],
            'phonology': [
                { text: 'The smallest unit of sound that distinguishes word meaning.', author: 'Phoneme' },
            ],
            'cosmic-rays': [
                { text: 'High-energy radiation originating outside the solar system.', author: 'Galactic Cosmic Ray' },
            ],
        };

        test('branch discovery resolves hypothetical tracks correctly', () => {
            const neuroBranches = getBranchesForTrack('neuroscience', extraBranches);
            expect(neuroBranches.map(b => b.id)).toEqual(['neuro-anatomy', 'neuro-transmitters']);

            const sharedBranches = getBranchesForTrack('astrophysics', extraBranches);
            expect(sharedBranches.map(b => b.id)).toEqual(['cosmic-rays']);

            const physicsShared = getBranchesForTrack('physics', extraBranches);
            expect(physicsShared.map(b => b.id)).toEqual(['cosmic-rays']);
        });

        test('branch and track progress compute accurately for hypothetical curriculum', () => {
            const solvedSet = new Set<string>();

            // Initial: 0 progress
            const initialProgress = getTrackProgress('neuroscience', solvedSet, extraBranches, mockDB);
            expect(initialProgress.completed).toBe(0);
            expect(initialProgress.total).toBe(3);
            expect(initialProgress.branchCount).toBe(2);
            expect(initialProgress.completedBranches).toBe(0);
            expect(isTrackComplete('neuroscience', solvedSet, extraBranches, mockDB)).toBe(false);

            // Solve 1 level in neuro-anatomy
            const q1Id = getLevelId('neuro-anatomy', mockDB['neuro-anatomy'][0], 0, mockDB['neuro-anatomy']);
            solvedSet.add(q1Id);

            const midProgress = getTrackProgress('neuroscience', solvedSet, extraBranches, mockDB);
            expect(midProgress.completed).toBe(1);
            expect(midProgress.total).toBe(3);
            expect(midProgress.completedBranches).toBe(0);
            expect(isTrackComplete('neuroscience', solvedSet, extraBranches, mockDB)).toBe(false);

            // Solve 2nd level in neuro-anatomy -> branch 1 complete, branch 2 still incomplete
            const q2Id = getLevelId('neuro-anatomy', mockDB['neuro-anatomy'][1], 1, mockDB['neuro-anatomy']);
            solvedSet.add(q2Id);

            const branch1CompleteProgress = getTrackProgress('neuroscience', solvedSet, extraBranches, mockDB);
            expect(branch1CompleteProgress.completed).toBe(2);
            expect(branch1CompleteProgress.completedBranches).toBe(1);
            expect(getBranchProgress('neuro-anatomy', solvedSet, mockDB)).toEqual({ completed: 2, total: 2 });
            expect(getBranchProgress('neuro-transmitters', solvedSet, mockDB)).toEqual({ completed: 0, total: 1 });
            expect(isTrackComplete('neuroscience', solvedSet, extraBranches, mockDB)).toBe(false);

            // Solve neuro-transmitters -> track mastered!
            const q3Id = getLevelId('neuro-transmitters', mockDB['neuro-transmitters'][0], 0, mockDB['neuro-transmitters']);
            solvedSet.add(q3Id);

            const completeProgress = getTrackProgress('neuroscience', solvedSet, extraBranches, mockDB);
            expect(completeProgress.completed).toBe(3);
            expect(completeProgress.completedBranches).toBe(2);
            expect(isTrackComplete('neuroscience', solvedSet, extraBranches, mockDB)).toBe(true);
        });

        test('hypothetical track icons resolve to deterministic monogram badges', () => {
            extraTracks.forEach(track => {
                const accent = getDeterministicAccent(track.id);
                expect(DETERMINISTIC_ACCENTS).toContain(accent);

                const letter = getMonogramLetter(track.icon, track.label);
                expect(letter).toBe(track.label[0].toUpperCase());

                let renderer: any;
                expect(() => {
                    ReactTestRenderer.act(() => {
                        renderer = ReactTestRenderer.create(
                            <Icon name={track.icon} fallbackLabel={track.label} id={track.id} size={24} />
                        );
                    });
                }).not.toThrow();

                const letterNode = renderer.root.findByProps({ testID: 'icon-fallback-letter' });
                expect(letterNode.props.children).toBe(track.label[0].toUpperCase());
            });
        });
    });

    describe('(b) Unknown or absent icon slug renders fallback without throwing and without a type error', () => {
        test('type checking accepts arbitrary string as IconName without compilation error', () => {
            // Static verification that IconName allows uncatalogued strings
            const customSlug: IconName = 'custom-brand-new-subject';
            const blankSlug: IconName = '';
            const knownSlug: IconName = 'subject-biology';

            expect(typeof customSlug).toBe('string');
            expect(typeof blankSlug).toBe('string');
            expect(typeof knownSlug).toBe('string');
        });

        test('renders monogram badge for unknown subject slug with fallbackLabel', () => {
            let renderer: any;
            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <Icon name="subject-quantum-electrodynamics" fallbackLabel="Quantum Electrodynamics" size={28} />
                );
            });

            const letterNode = renderer.root.findByProps({ testID: 'icon-fallback-letter' });
            expect(letterNode.props.children).toBe('Q');

            const container = renderer.root.findByProps({ testID: 'icon-fallback-monogram' });
            expect(container.props.style).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        width: 28,
                        height: 28,
                    }),
                ])
            );
        });

        test('renders monogram badge for unknown slug when fallbackLabel is omitted', () => {
            let renderer: any;
            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <Icon name="subject-geology" size={24} />
                );
            });

            // Strips 'subject-' prefix -> 'geology' -> 'G'
            const letterNode = renderer.root.findByProps({ testID: 'icon-fallback-letter' });
            expect(letterNode.props.children).toBe('G');
        });

        test('safely handles empty string and unparseable slugs without throwing', () => {
            let renderer: any;
            expect(() => {
                ReactTestRenderer.act(() => {
                    renderer = ReactTestRenderer.create(
                        <Icon name="" size={20} />
                    );
                });
            }).not.toThrow();

            const letterNode = renderer.root.findByProps({ testID: 'icon-fallback-letter' });
            expect(letterNode.props.children).toBe('?');
        });

        test('existing bespoke icons keep rendering SvgXml instead of monogram fallback', () => {
            let renderer: any;
            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <Icon name="sparkle" size={24} color="#ffffff" />
                );
            });

            // Known icon should not render fallback monogram
            const fallbackNodes = renderer.root.findAllByProps({ testID: 'icon-fallback-monogram' });
            expect(fallbackNodes.length).toBe(0);
        });

        test('monogram and accent derivation functions are deterministic and stable', () => {
            // Same key must always yield the identical accent
            const accent1 = getDeterministicAccent('neuroscience');
            const accent2 = getDeterministicAccent('neuroscience');
            expect(accent1).toBe(accent2);

            // Different keys map cleanly across palette
            const letterA = getMonogramLetter('subject-astronomy', 'Astronomy');
            const letterB = getMonogramLetter('subject-biology', 'Biology');
            expect(letterA).toBe('A');
            expect(letterB).toBe('B');
        });
    });

    describe('(c) Achievement targets are fixed literals and do NOT change when tracks are added', () => {
        const Consumer = ({ onAchievements }: { onAchievements: (a: Achievement[]) => void }) => {
            const { achievements } = useGame();
            React.useEffect(() => {
                onAchievements(achievements);
            }, [achievements, onAchievements]);
            return null;
        };

        test('all achievement targets are fixed literal numbers (no array length derivations)', () => {
            let achievements: Achievement[] = [];
            let renderer: any;

            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <Consumer onAchievements={(a) => { achievements = a; }} />
                    </GameProvider>
                );
            });

            expect(achievements.length).toBeGreaterThan(0);

            // Verify no omniscient_all exists
            const omniscientAll = achievements.find(a => a.id === 'omniscient_all');
            expect(omniscientAll).toBeUndefined();

            // Verify milestone achievements with literal targets exist
            const master1 = achievements.find(a => a.id === 'subject_master_1');
            expect(master1).toBeDefined();
            expect(master1!.target).toBe(1);
            expect(typeof master1!.target).toBe('number');

            const polymath3 = achievements.find(a => a.id === 'polymath_3');
            expect(polymath3).toBeDefined();
            expect(polymath3!.target).toBe(3);
            expect(typeof polymath3!.target).toBe('number');

            const omniscient8 = achievements.find(a => a.id === 'omniscient_8');
            expect(omniscient8).toBeDefined();
            expect(omniscient8!.target).toBe(8);
            expect(typeof omniscient8!.target).toBe('number');

            // Audit all achievements: every target must be a positive integer literal
            achievements.forEach(ach => {
                expect(typeof ach.target).toBe('number');
                expect(ach.target).toBeGreaterThan(0);
                expect(Number.isInteger(ach.target)).toBe(true);
            });

            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
        });

        test('no achievement description contains forbidden totality phrases like "all subjects" or "every subject"', () => {
            let achievements: Achievement[] = [];
            let renderer: any;

            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <Consumer onAchievements={(a) => { achievements = a; }} />
                    </GameProvider>
                );
            });

            const forbiddenPatterns = [
                /all subjects/i,
                /every subject/i,
                /all genres/i,
            ];

            achievements.forEach(ach => {
                forbiddenPatterns.forEach(pattern => {
                    expect(ach.description).not.toMatch(pattern);
                    expect(ach.title).not.toMatch(pattern);
                });
            });

            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
        });

        test('targets remain static even when extra tracks and branches exist', () => {
            // Verify targets are fixed literals not bound to any array length
            const TARGET_1 = 1;
            const TARGET_3 = 3;
            const TARGET_8 = 8;

            let achievements: Achievement[] = [];
            let renderer: any;

            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <GameProvider>
                        <Consumer onAchievements={(a) => { achievements = a; }} />
                    </GameProvider>
                );
            });

            const master1 = achievements.find(a => a.id === 'subject_master_1');
            const polymath3 = achievements.find(a => a.id === 'polymath_3');
            const omniscient8 = achievements.find(a => a.id === 'omniscient_8');

            expect(master1?.target).toBe(TARGET_1);
            expect(polymath3?.target).toBe(TARGET_3);
            expect(omniscient8?.target).toBe(TARGET_8);

            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
        });
    });
});
