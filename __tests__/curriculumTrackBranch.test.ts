import {
    getBranchesForTrack,
    getTracksForBranch,
    getBranchById,
    getTrackById,
    getBranchProgress,
    isBranchComplete,
    getTrackProgress,
    isTrackComplete,
    getCategoryQuoteIds,
    getNextQuote,
    getLevelId,
    getGenreProgress,
    isGenreComplete
} from '../src/services/quoteService';
import { TRACKS, BRANCHES, SUBJECTS, EXTENSIONS, QUOTE_DB } from '../src/data/quotes';
import { Branch, LevelData, Track } from '../src/types';

describe('Curriculum Track -> Branch Content Model', () => {

    describe('Data Integrity & Architecture Mapping', () => {
        test('TRACKS contains all core subjects and extensions including lexicon', () => {
            const expectedTrackIds = [
                'biology', 'physics', 'chemistry', 'astronomy',
                'geography', 'history', 'literature', 'lexicon',
                'compsci', 'anatomy', 'music', 'economics', 'mythology'
            ];

            const trackIds = TRACKS.map(t => t.id);
            expectedTrackIds.forEach(id => {
                expect(trackIds).toContain(id);
            });
            expect(TRACKS.length).toBe(SUBJECTS.length + EXTENSIONS.length);
        });

        test('BRANCHES conforms to the branch schema and initial migration mapping', () => {
            BRANCHES.forEach(branch => {
                expect(typeof branch.id).toBe('string');
                expect(branch.id.length).toBeGreaterThan(0);
                expect(typeof branch.label).toBe('string');
                expect(Array.isArray(branch.tracks)).toBe(true);
                expect(branch.tracks.length).toBeGreaterThan(0);
                expect(typeof branch.order).toBe('number');
            });

            // Initial migration: each existing category maps to an initial branch of the same id owned by the same track
            const coreSubjectIds = ['biology', 'physics', 'chemistry', 'astronomy', 'geography', 'history', 'literature', 'lexicon'];
            coreSubjectIds.forEach(catId => {
                const branch = BRANCHES.find(b => b.id === catId);
                expect(branch).toBeDefined();
                expect(branch!.tracks).toContain(catId);
            });

            const extensionIds = ['compsci', 'anatomy', 'music', 'economics', 'mythology'];
            extensionIds.forEach(extId => {
                const branch = BRANCHES.find(b => b.id === extId);
                expect(branch).toBeDefined();
                expect(branch!.tracks).toContain(extId);
            });
        });

        test('QUOTE_DB stays keyed strictly by branch id', () => {
            const branchIds = new Set(BRANCHES.map(b => b.id));
            Object.keys(QUOTE_DB).forEach(key => {
                expect(branchIds.has(key)).toBe(true);
            });
        });

        test('getBranchById and getTrackById find metadata correctly', () => {
            const bioTrack = getTrackById('biology');
            expect(bioTrack).toBeDefined();
            expect(bioTrack!.label).toBe('Biology');

            const physicsBranch = getBranchById('physics');
            expect(physicsBranch).toBeDefined();
            expect(physicsBranch!.tracks).toContain('physics');

            const allTracks: Track[] = TRACKS;
            expect(allTracks.length).toBeGreaterThan(0);
        });

        test('getCategoryQuoteIds retrieves IDs for both branch and track identifiers', () => {
            const bioBranchIds = getCategoryQuoteIds('biology');
            expect(bioBranchIds.length).toBe(QUOTE_DB['biology'].length);
            expect(bioBranchIds[0]).toBe('biology-mitochondria');
        });
    });


    describe('(a) Reachability: A branch listed under multiple tracks is reachable from all of them', () => {
        test('biochemistry is reachable from both biology and chemistry tracks', () => {
            const bioBranches = getBranchesForTrack('biology');
            const chemBranches = getBranchesForTrack('chemistry');

            const biochemInBio = bioBranches.find(b => b.id === 'biochemistry');
            const biochemInChem = chemBranches.find(b => b.id === 'biochemistry');

            expect(biochemInBio).toBeDefined();
            expect(biochemInChem).toBeDefined();
            expect(biochemInBio!.id).toBe(biochemInChem!.id);
            expect(biochemInBio!.label).toBe('Biochemistry');

            const tracksForBiochem = getTracksForBranch('biochemistry');
            expect(tracksForBiochem).toContain('biology');
            expect(tracksForBiochem).toContain('chemistry');
        });

        test('custom multi-track branch is reachable from all listed tracks and respects curriculum order', () => {
            const customBranches: Branch[] = [
                { id: 'mechanics', label: 'Mechanics', tracks: ['physics'], order: 1 },
                { id: 'biophysics', label: 'Biophysics', tracks: ['physics', 'biology'], order: 2 },
                { id: 'optics', label: 'Optics', tracks: ['physics'], order: 3 },
                { id: 'cell-bio', label: 'Cell Biology', tracks: ['biology'], order: 1 },
            ];

            const physicsCurriculum = getBranchesForTrack('physics', customBranches);
            const bioCurriculum = getBranchesForTrack('biology', customBranches);

            // Reachable from both
            expect(physicsCurriculum.map(b => b.id)).toEqual(['mechanics', 'biophysics', 'optics']);
            expect(bioCurriculum.map(b => b.id)).toEqual(['cell-bio', 'biophysics']);

            // Both point to the exact same shared branch instance
            const physShared = physicsCurriculum.find(b => b.id === 'biophysics');
            const bioShared = bioCurriculum.find(b => b.id === 'biophysics');
            expect(physShared).toBe(bioShared);
        });

        test('progress in a shared branch updates track progress across all its parent tracks', () => {
            const customBranches: Branch[] = [
                { id: 'bio-core', label: 'Core Biology', tracks: ['biology'], order: 1 },
                { id: 'biochem', label: 'Biochemistry', tracks: ['biology', 'chemistry'], order: 2 },
                { id: 'chem-core', label: 'Core Chemistry', tracks: ['chemistry'], order: 1 },
            ];

            const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
                'bio-core': [
                    { text: 'A basic cell structure definition.', author: 'Membrane' }
                ],
                'chem-core': [
                    { text: 'A substance that donates hydrogen ions.', author: 'Acid' }
                ],
                'biochem': [
                    { text: 'The universal metabolic pathway converting glucose to pyruvate.', author: 'Glycolysis' }
                ]
            };

            const solvedSet = new Set<string>();

            // Initial: 0 solved in all
            expect(getTrackProgress('biology', solvedSet, customBranches, mockDB).completed).toBe(0);
            expect(getTrackProgress('chemistry', solvedSet, customBranches, mockDB).completed).toBe(0);

            // Solve the single quote in the shared branch
            const biochemQuoteId = getLevelId('biochem', mockDB['biochem'][0], 0, mockDB['biochem']);
            solvedSet.add(biochemQuoteId);

            // Both biology and chemistry immediately reflect completion of the shared branch level
            const bioProgress = getTrackProgress('biology', solvedSet, customBranches, mockDB);
            const chemProgress = getTrackProgress('chemistry', solvedSet, customBranches, mockDB);

            expect(bioProgress.completed).toBe(1);
            expect(bioProgress.total).toBe(2);

            expect(chemProgress.completed).toBe(1);
            expect(chemProgress.total).toBe(2);
        });
    });

    describe('(b) Single Ownership: Shared branch levels exist once and are never duplicated', () => {
        test('every quote in QUOTE_DB belongs to exactly one branch key', () => {
            const allBranchKeys = Object.keys(QUOTE_DB);
            const branchKeySet = new Set(allBranchKeys);

            // Keys are distinct
            expect(branchKeySet.size).toBe(allBranchKeys.length);

            // Verify quote IDs generated for each branch have the branchId prefix
            for (const [branchId, quotes] of Object.entries(QUOTE_DB)) {
                quotes.forEach((q, idx) => {
                    const id = getLevelId(branchId, q, idx, quotes);
                    expect(id.startsWith(`${branchId}-`)).toBe(true);
                });
            }
        });

        test('accessing a shared branch from multiple tracks yields identical level IDs without duplication', () => {
            const customBranches: Branch[] = [
                { id: 'shared-branch', label: 'Shared Branch', tracks: ['trackA', 'trackB'], order: 1 }
            ];

            const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
                'shared-branch': [
                    { text: 'Unique definition authored once in content database.', author: 'UniqueAnswer' }
                ]
            };

            // Reachable from trackA and trackB
            const branchesA = getBranchesForTrack('trackA', customBranches);
            const branchesB = getBranchesForTrack('trackB', customBranches);

            expect(branchesA[0].id).toBe('shared-branch');
            expect(branchesB[0].id).toBe('shared-branch');

            // Both resolve the exact same levels in the exact same single DB key
            const quoteA = mockDB[branchesA[0].id][0];
            const quoteB = mockDB[branchesB[0].id][0];

            expect(quoteA).toBe(quoteB);

            const idA = getLevelId(branchesA[0].id, quoteA, 0, mockDB[branchesA[0].id]);
            const idB = getLevelId(branchesB[0].id, quoteB, 0, mockDB[branchesB[0].id]);

            expect(idA).toBe('shared-branch-uniqueanswer');
            expect(idB).toBe('shared-branch-uniqueanswer');
            expect(idA).toBe(idB);
        });

        test('level order inside a branch is preserved in array order', () => {
            const physicsQuotes = QUOTE_DB['physics'];
            expect(physicsQuotes.length).toBeGreaterThanOrEqual(10);

            const solvedSet = new Set<string>();
            const first = getNextQuote('physics', solvedSet);
            expect(first).not.toBeNull();
            expect(first!.author).toBe(physicsQuotes[0].author);

            solvedSet.add(first!.id);
            const second = getNextQuote('physics', solvedSet);
            expect(second).not.toBeNull();
            expect(second!.author).toBe(physicsQuotes[1].author);
        });
    });

    describe('(c) Track Mastery: Requires ALL of that track branches to be complete', () => {
        test('track with multiple branches is mastered only when every playable branch is 100% complete', () => {
            const customBranches: Branch[] = [
                { id: 'branch-1', label: 'Branch 1', tracks: ['multi-track'], order: 1 },
                { id: 'branch-2', label: 'Branch 2', tracks: ['multi-track'], order: 2 },
            ];

            const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
                'branch-1': [
                    { text: 'Level 1 of branch 1', author: 'Answer One' },
                    { text: 'Level 2 of branch 1', author: 'Answer Two' },
                ],
                'branch-2': [
                    { text: 'Level 1 of branch 2', author: 'Answer Three' },
                    { text: 'Level 2 of branch 2', author: 'Answer Four' },
                ],
            };

            const solved = new Set<string>();

            // Phase 0: 0/4 solved -> Track is incomplete
            expect(isTrackComplete('multi-track', solved, customBranches, mockDB)).toBe(false);

            // Phase 1: Branch 1 partially solved (1/2) -> Track is incomplete
            solved.add(getLevelId('branch-1', mockDB['branch-1'][0], 0, mockDB['branch-1']));
            expect(isBranchComplete('branch-1', solved, mockDB)).toBe(false);
            expect(isTrackComplete('multi-track', solved, customBranches, mockDB)).toBe(false);

            // Phase 2: Branch 1 fully solved (2/2), but Branch 2 has 0/2 solved -> Track is STILL incomplete!
            solved.add(getLevelId('branch-1', mockDB['branch-1'][1], 1, mockDB['branch-1']));
            expect(isBranchComplete('branch-1', solved, mockDB)).toBe(true);
            expect(isBranchComplete('branch-2', solved, mockDB)).toBe(false);
            expect(isTrackComplete('multi-track', solved, customBranches, mockDB)).toBe(false);

            // Phase 3: Branch 2 partially solved (1/2) -> Track is STILL incomplete!
            solved.add(getLevelId('branch-2', mockDB['branch-2'][0], 0, mockDB['branch-2']));
            expect(isBranchComplete('branch-2', solved, mockDB)).toBe(false);
            expect(isTrackComplete('multi-track', solved, customBranches, mockDB)).toBe(false);

            // Phase 4: Branch 2 fully solved (2/2) -> ALL branches complete -> Track is MASTERED!
            solved.add(getLevelId('branch-2', mockDB['branch-2'][1], 1, mockDB['branch-2']));
            expect(isBranchComplete('branch-2', solved, mockDB)).toBe(true);
            expect(isTrackComplete('multi-track', solved, customBranches, mockDB)).toBe(true);
        });

        test('a shared branch completion contributes to both tracks, but each track still requires its other branches', () => {
            const customBranches: Branch[] = [
                { id: 'pure-bio', label: 'Pure Biology', tracks: ['biology'], order: 1 },
                { id: 'biochem-shared', label: 'Biochemistry', tracks: ['biology', 'chemistry'], order: 2 },
                { id: 'pure-chem', label: 'Pure Chemistry', tracks: ['chemistry'], order: 1 },
            ];

            const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
                'pure-bio': [{ text: 'Cell biology definition', author: 'Mitosis' }],
                'biochem-shared': [{ text: 'Biochemical cycle definition', author: 'Krebs' }],
                'pure-chem': [{ text: 'Chemical structure definition', author: 'Benzene' }],
            };

            const solved = new Set<string>();

            // Solve shared branch
            solved.add(getLevelId('biochem-shared', mockDB['biochem-shared'][0], 0, mockDB['biochem-shared']));
            expect(isBranchComplete('biochem-shared', solved, mockDB)).toBe(true);

            // Neither track is mastered yet because their unshared branch is incomplete
            expect(isTrackComplete('biology', solved, customBranches, mockDB)).toBe(false);
            expect(isTrackComplete('chemistry', solved, customBranches, mockDB)).toBe(false);

            // Complete pure-bio -> Biology is now complete, Chemistry is still incomplete
            solved.add(getLevelId('pure-bio', mockDB['pure-bio'][0], 0, mockDB['pure-bio']));
            expect(isTrackComplete('biology', solved, customBranches, mockDB)).toBe(true);
            expect(isTrackComplete('chemistry', solved, customBranches, mockDB)).toBe(false);

            // Complete pure-chem -> Both tracks are now complete
            solved.add(getLevelId('pure-chem', mockDB['pure-chem'][0], 0, mockDB['pure-chem']));
            expect(isTrackComplete('chemistry', solved, customBranches, mockDB)).toBe(true);
        });

        test('track with zero levels across all branches cannot be mastered', () => {
            const customBranches: Branch[] = [
                { id: 'empty-branch', label: 'Empty Branch', tracks: ['empty-track'], order: 1 },
            ];
            const mockDB: Record<string, Omit<LevelData, 'category'>[]> = {
                'empty-branch': []
            };

            expect(isTrackComplete('empty-track', new Set(), customBranches, mockDB)).toBe(false);
            expect(getBranchProgress('empty-branch', new Set(), mockDB)).toEqual({ completed: 0, total: 0 });
            expect(getTrackProgress('empty-track', new Set(), customBranches, mockDB)).toEqual({
                completed: 0,
                total: 0,
                branchCount: 1,
                completedBranches: 0
            });
        });

        test('backward-compatible isGenreComplete and getGenreProgress route to track or branch', () => {
            const solvedSet = new Set<string>();
            const bioQuotes = QUOTE_DB['biology'];
            expect(isGenreComplete('biology', solvedSet)).toBe(false);

            // Complete biology
            bioQuotes.forEach((q, idx) => {
                solvedSet.add(getLevelId('biology', q, idx, bioQuotes));
            });

            expect(isGenreComplete('biology', solvedSet)).toBe(true);
            const progress = getGenreProgress('biology', solvedSet);
            expect(progress.completed).toBe(bioQuotes.length);
            expect(progress.total).toBe(bioQuotes.length);
        });
    });
});
