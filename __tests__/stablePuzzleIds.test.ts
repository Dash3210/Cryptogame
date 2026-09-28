import {
  slugify,
  getLevelId,
  getNextQuote,
  isGenreComplete,
  getGenreProgress,
  getCategoryQuoteIds,
  getQuoteById
} from '../src/services/quoteService';
import { QUOTE_DB } from '../src/data/quotes';
import { LevelData } from '../src/types';

describe('Stable Puzzle IDs & Curriculum Insertion Invariant', () => {

  describe('Slug generation', () => {
    test('converts author to lowercase, collapses non-alphanumeric runs to a single hyphen, and trims hyphens', () => {
      expect(slugify('Mitochondria')).toBe('mitochondria');
      expect(slugify('Kinetic Energy')).toBe('kinetic-energy');
      expect(slugify('Black Hole')).toBe('black-hole');
      expect(slugify('Edsger W. Dijkstra')).toBe('edsger-w-dijkstra');
      expect(slugify('  ---Hello,   World!!---  ')).toBe('hello-world');
      expect(slugify('What? (100%)')).toBe('what-100');
      expect(slugify('COVID-19')).toBe('covid-19');
    });
  });

  describe('Invariant: insertion does not shift pre-existing IDs', () => {
    test('proves pre-existing IDs do not change when inserting at START and separately at MIDDLE', () => {
      const category = 'biology';
      const baseCategoryQuotes = [...QUOTE_DB[category]];
      expect(baseCategoryQuotes.length).toBeGreaterThan(5);

      // 1. Take a category array and record every id
      const initialIds = baseCategoryQuotes.map((entry, idx) =>
        getLevelId(category, entry, idx, baseCategoryQuotes)
      );

      // Verify initial IDs are non-empty and unique
      expect(new Set(initialIds).size).toBe(initialIds.length);
      expect(initialIds[0]).toBe('biology-mitochondria');

      // 2. Insert a new entry at the START
      const startEntry: Omit<LevelData, 'category'> = {
        text: 'A cellular structure that packages proteins into membrane-bound vesicles inside the cell.',
        author: 'Golgi Complex'
      };
      const listWithStart = [startEntry, ...baseCategoryQuotes];

      // New entry gets deterministic slug ID
      const startEntryId = getLevelId(category, startEntry, 0, listWithStart);
      expect(startEntryId).toBe('biology-golgi-complex');

      // Assert that NO pre-existing entry's id changed after start insertion
      baseCategoryQuotes.forEach((entry, originalIdx) => {
        const idAfterStartInsertion = getLevelId(category, entry, originalIdx + 1, listWithStart);
        expect(idAfterStartInsertion).toBe(initialIds[originalIdx]);

        // Also works when resolving without explicit index parameter
        const idResolvedWithoutIndex = getLevelId(category, entry, listWithStart);
        expect(idResolvedWithoutIndex).toBe(initialIds[originalIdx]);
      });

      // 3. Insert a new entry at the MIDDLE
      const midEntry: Omit<LevelData, 'category'> = {
        text: 'Plastid containing chlorophyll where photosynthesis occurs in plant cells.',
        author: 'Chloroplast'
      };
      const midIndex = Math.floor(baseCategoryQuotes.length / 2);
      const listWithMiddle = [
        ...baseCategoryQuotes.slice(0, midIndex),
        midEntry,
        ...baseCategoryQuotes.slice(midIndex)
      ];

      // Middle entry gets deterministic slug ID
      const midEntryId = getLevelId(category, midEntry, midIndex, listWithMiddle);
      expect(midEntryId).toBe('biology-chloroplast');

      // Assert that NO pre-existing entry's id changed after middle insertion
      baseCategoryQuotes.forEach((entry, originalIdx) => {
        const newIdx = originalIdx < midIndex ? originalIdx : originalIdx + 1;
        const idAfterMiddleInsertion = getLevelId(category, entry, newIdx, listWithMiddle);
        expect(idAfterMiddleInsertion).toBe(initialIds[originalIdx]);

        const idResolvedWithoutIndex = getLevelId(category, entry, listWithMiddle);
        expect(idResolvedWithoutIndex).toBe(initialIds[originalIdx]);
      });
    });
  });

  describe('Slug collision handling', () => {
    test('a slug collision gets the deterministic -2, -3 suffix in order of appearance', () => {
      const category = 'biology';
      const duplicateList: Array<Omit<LevelData, 'category'>> = [
        { text: 'First gene concept definition.', author: 'Gene' },
        { text: 'Second advanced gene regulation definition.', author: 'Gene' },
        { text: 'Third specialized gene expression definition.', author: 'Gene' }
      ];

      const id0 = getLevelId(category, duplicateList[0], 0, duplicateList);
      const id1 = getLevelId(category, duplicateList[1], 1, duplicateList);
      const id2 = getLevelId(category, duplicateList[2], 2, duplicateList);

      expect(id0).toBe('biology-gene');
      expect(id1).toBe('biology-gene-2');
      expect(id2).toBe('biology-gene-3');

      // Invariant hold for collisions when unrelated entry is inserted at START
      const listWithUnrelatedStart = [
        { text: 'Ribosome protein factory definition.', author: 'Ribosome' },
        ...duplicateList
      ];
      expect(getLevelId(category, duplicateList[0], 1, listWithUnrelatedStart)).toBe('biology-gene');
      expect(getLevelId(category, duplicateList[1], 2, listWithUnrelatedStart)).toBe('biology-gene-2');
      expect(getLevelId(category, duplicateList[2], 3, listWithUnrelatedStart)).toBe('biology-gene-3');

      // Invariant hold for collisions when unrelated entry is inserted at MIDDLE
      const listWithUnrelatedMid = [
        duplicateList[0],
        { text: 'Membrane boundary definition.', author: 'Membrane' },
        duplicateList[1],
        duplicateList[2]
      ];
      expect(getLevelId(category, duplicateList[0], 0, listWithUnrelatedMid)).toBe('biology-gene');
      expect(getLevelId(category, duplicateList[1], 2, listWithUnrelatedMid)).toBe('biology-gene-2');
      expect(getLevelId(category, duplicateList[2], 3, listWithUnrelatedMid)).toBe('biology-gene-3');
    });
  });

  describe('Explicit ID precedence', () => {
    test('an explicit id wins over the fallback', () => {
      const explicitEntry: Omit<LevelData, 'category'> = {
        id: 'curriculum-ch3-sec2-001',
        text: 'A specialized DNA sequence governing inheritance.',
        author: 'Gene'
      };

      const id = getLevelId('biology', explicitEntry);
      expect(id).toBe('curriculum-ch3-sec2-001');

      // Explicit ID wins even in the presence of array position or collisions
      const list = [
        { text: 'Normal entry', author: 'Gene' },
        explicitEntry,
        { text: 'Subsequent entry', author: 'Gene' }
      ];

      expect(getLevelId('biology', list[0], 0, list)).toBe('biology-gene');
      expect(getLevelId('biology', list[1], 1, list)).toBe('curriculum-ch3-sec2-001');
      expect(getLevelId('biology', list[2], 2, list)).toBe('biology-gene-2');
    });
  });

  describe('Progress and achievement helpers work end-to-end', () => {
    test('getQuoteById resolves correctly with slugified IDs containing hyphens', () => {
      // Authors with hyphens in slug (multi-word terms)
      const kineticEnergy = getQuoteById('physics-kinetic-energy');
      expect(kineticEnergy).not.toBeNull();
      expect(kineticEnergy?.author).toBe('Kinetic Energy');
      expect(kineticEnergy?.category).toBe('physics');

      const blackHole = getQuoteById('physics-black-hole');
      expect(blackHole).not.toBeNull();
      expect(blackHole?.author).toBe('Black Hole');
      expect(blackHole?.category).toBe('physics');
    });

    test('getNextQuote, getGenreProgress, and isGenreComplete function accurately with stable IDs', () => {
      const category = 'physics';
      const allPhysicsIds = getCategoryQuoteIds(category);
      expect(allPhysicsIds.length).toBeGreaterThan(0);

      // Fresh player has 0 progress
      const solvedSet = new Set<string>();
      expect(isGenreComplete(category, solvedSet)).toBe(false);
      expect(getGenreProgress(category, solvedSet)).toEqual({
        completed: 0,
        total: allPhysicsIds.length
      });

      // First quote is served
      const q1 = getNextQuote(category, solvedSet);
      expect(q1).not.toBeNull();
      expect(q1?.id).toBe(allPhysicsIds[0]);

      // Player solves first 3 quotes
      for (let i = 0; i < 3; i++) {
        solvedSet.add(allPhysicsIds[i]);
      }

      const qNext = getNextQuote(category, solvedSet);
      expect(qNext?.id).toBe(allPhysicsIds[3]);
      expect(getGenreProgress(category, solvedSet)).toEqual({
        completed: 3,
        total: allPhysicsIds.length
      });
      expect(isGenreComplete(category, solvedSet)).toBe(false);

      // Player completes all
      allPhysicsIds.forEach(id => solvedSet.add(id));
      expect(isGenreComplete(category, solvedSet)).toBe(true);
      expect(getGenreProgress(category, solvedSet)).toEqual({
        completed: allPhysicsIds.length,
        total: allPhysicsIds.length
      });
      expect(getNextQuote(category, solvedSet)).toBeNull();
    });

    test('player progress is preserved when new quotes are added to a category', () => {
      const category = 'chemistry';
      const originalQuotes = QUOTE_DB[category];
      const originalIds = getCategoryQuoteIds(category);

      // Player solved the first 2 quotes
      const solvedSet = new Set<string>([originalIds[0], originalIds[1]]);

      // Simulate inserting a new curriculum entry in the middle of chemistry
      const newEntry: Omit<LevelData, 'category'> = {
        text: 'The spontaneous disintegration of unstable atomic nuclei accompanied by emission of radiation.',
        author: 'Radioactivity'
      };
      const midPos = 1;
      const modifiedQuotes = [
        originalQuotes[0],
        newEntry,
        ...originalQuotes.slice(midPos)
      ];

      // Map IDs of modified array
      const modifiedIds = modifiedQuotes.map((q, idx) => getLevelId(category, q, idx, modifiedQuotes));

      // The pre-existing quotes that player already solved MUST still be in solvedSet!
      expect(solvedSet.has(modifiedIds[0])).toBe(true); // original quote 0
      expect(solvedSet.has(modifiedIds[1])).toBe(false); // newly inserted quote is unsolved
      expect(solvedSet.has(modifiedIds[2])).toBe(true); // original quote 1 shifted from idx 1 to idx 2, but its ID did NOT change!
    });
  });

});
