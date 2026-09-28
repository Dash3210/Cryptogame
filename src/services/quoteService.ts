/**
 * BrainCipher - Quote Service
 * 
 * Stateless helper functions for quote management, daily challenges, and blitz rush.
 */

import { QuoteData, Track, Branch, LevelData } from '../types';
import { QUOTE_DB, DAILY_QUOTES, BLITZ_QUOTES, TRACKS, BRANCHES } from '../data/quotes';
import { shuffleArray } from '../utils/cipher';

/**
 * Build a multiple-choice answer set for the post-solve bonus round.
 * Prefers distractors from the same subject, then any subject.
 */
export function getAnswerOptions(category: string, correctAnswer: string, count = 4): string[] {
    const wanted = Math.max(2, count) - 1;
    let sameCategory = (QUOTE_DB[category] || [])
        .map(q => q.author)
        .filter(a => a && a !== correctAnswer);

    if (sameCategory.length === 0) {
        const branches = getBranchesForTrack(category);
        sameCategory = branches
            .flatMap(b => (QUOTE_DB[b.id] || []).map(q => q.author))
            .filter(a => a && a !== correctAnswer);
    }

    const allAnswers = Object.values(QUOTE_DB)
        .flat()
        .map(q => q.author)
        .filter(a => a && a !== correctAnswer);

    const pool = Array.from(new Set(sameCategory.length >= wanted ? sameCategory : allAnswers));
    const distractors = shuffleArray(pool).slice(0, wanted);
    return shuffleArray([correctAnswer, ...distractors]);
}


/**
 * Generate a clean, lowercase, hyphenated slug from a text string (e.g. author name).
 * Runs of non-alphanumeric characters are collapsed to a single hyphen, and
 * leading/trailing hyphens are trimmed.
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Deterministic Puzzle/Level ID Generator
 *
 * ID Scheme:
 * 1. Explicit ID precedence: If `entry.id` is explicitly defined, it is used verbatim.
 * 2. Deterministic fallback: `${category}-${slug(entry.author)}` where slug converts
 *    the author/term to lowercase, collapses any sequence of non-alphanumeric characters
 *    into a single hyphen, and trims leading/trailing hyphens.
 * 3. Collision resolution: When multiple entries within the same category produce the same
 *    slug (or collide with a base ID), subsequent occurrences append `-2`, `-3`, etc.,
 *    strictly in order of their appearance in the category array.
 *
 * Invariant:
 * An entry's ID depends on its content, not its absolute array index.
 * Inserting curriculum content at the start or in the middle of a category will never shift
 * or corrupt pre-existing puzzle IDs or player progress.
 *
 * @param category The category/subject identifier (e.g. 'biology', 'physics')
 * @param entry The puzzle entry object containing author and optional explicit id or text
 * @param indexOrList Optional array index of entry, or the category quotes array
 * @param list Optional category quotes array when indexOrList is provided as an index
 * @returns The deterministic, stable puzzle ID
 */
export function getLevelId(
    category: string,
    entry: { id?: string; author: string; text?: string },
    indexOrList?: number | Array<{ id?: string; author: string; text?: string }>,
    list?: Array<{ id?: string; author: string; text?: string }>
): string {
    if (entry.id && entry.id.trim().length > 0) {
        return entry.id;
    }

    const baseSlug = slugify(entry.author) || 'entry';
    const baseId = `${category}-${baseSlug}`;

    let resolvedIndex: number | undefined;
    let resolvedList: Array<{ id?: string; author: string; text?: string }> | undefined;

    if (typeof indexOrList === 'number') {
        resolvedIndex = indexOrList;
        resolvedList = list ?? QUOTE_DB[category];
    } else if (Array.isArray(indexOrList)) {
        resolvedList = indexOrList;
    } else {
        resolvedList = list ?? QUOTE_DB[category];
    }

    if (!resolvedList || resolvedList.length === 0) {
        return baseId;
    }

    let pos = resolvedIndex;
    if (typeof pos !== 'number' || pos < 0) {
        pos = resolvedList.findIndex(q => q === entry || (q.text === entry.text && q.author === entry.author));
    }

    if (pos <= 0) {
        return baseId;
    }

    let collisionCount = 0;
    for (let i = 0; i < pos; i++) {
        const prior = resolvedList[i];
        if (!prior) continue;
        if (prior.id === baseId || (!prior.id && (slugify(prior.author) || 'entry') === baseSlug)) {
            collisionCount++;
        }
    }

    if (collisionCount > 0) {
        return `${baseId}-${collisionCount + 1}`;
    }

    return baseId;
}

/**
 * Retrieve all branches that belong to a track, sorted in curriculum order.
 */
export function getBranchesForTrack(trackId: string, customBranches: Branch[] = BRANCHES): Branch[] {
    return customBranches
        .filter(branch => branch.tracks.includes(trackId))
        .sort((a, b) => a.order - b.order);
}

/**
 * Retrieve all track IDs that a branch belongs to.
 */
export function getTracksForBranch(branchId: string, customBranches: Branch[] = BRANCHES): string[] {
    const branch = customBranches.find(b => b.id === branchId);
    return branch ? branch.tracks : [];
}

/**
 * Find branch metadata by ID.
 */
export function getBranchById(branchId: string, customBranches: Branch[] = BRANCHES): Branch | undefined {
    return customBranches.find(b => b.id === branchId);
}

/**
 * Find track metadata by ID.
 */
export function getTrackById(trackId: string, customTracks: Track[] = TRACKS): Track | undefined {
    return customTracks.find(t => t.id === trackId);
}

/**
 * Retrieve progress stats for an individual curriculum branch.
 */
export function getBranchProgress(
    branchId: string,
    solvedIds: Set<string>,
    db: Record<string, Omit<LevelData, 'category'>[]> = QUOTE_DB
): { completed: number; total: number } {
    const branchQuotes = db[branchId];
    if (!branchQuotes || branchQuotes.length === 0) {
        return { completed: 0, total: 0 };
    }

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const total = branchQuotes.length;
    let completed = 0;

    for (let i = 0; i < total; i++) {
        const id = getLevelId(branchId, branchQuotes[i], i, branchQuotes);
        if (safeSet.has(id)) {
            completed++;
        }
    }

    return { completed, total };
}

/**
 * Check if all quotes in an individual branch have been completed.
 */
export function isBranchComplete(
    branchId: string,
    solvedIds: Set<string>,
    db: Record<string, Omit<LevelData, 'category'>[]> = QUOTE_DB
): boolean {
    const branchQuotes = db[branchId];
    if (!branchQuotes || branchQuotes.length === 0) return false;

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const total = branchQuotes.length;

    for (let i = 0; i < total; i++) {
        const id = getLevelId(branchId, branchQuotes[i], i, branchQuotes);
        if (!safeSet.has(id)) {
            return false;
        }
    }

    return true;
}

/**
 * Retrieve progress stats across all branches belonging to a track.
 * Shared branches count toward EVERY track they belong to.
 */
export function getTrackProgress(
    trackId: string,
    solvedIds: Set<string>,
    customBranches: Branch[] = BRANCHES,
    db: Record<string, Omit<LevelData, 'category'>[]> = QUOTE_DB
): { completed: number; total: number; branchCount: number; completedBranches: number } {
    const branches = getBranchesForTrack(trackId, customBranches);
    let totalCompleted = 0;
    let totalQuotes = 0;
    let completedBranches = 0;

    for (const branch of branches) {
        const branchProgress = getBranchProgress(branch.id, solvedIds, db);
        totalCompleted += branchProgress.completed;
        totalQuotes += branchProgress.total;
        if (branchProgress.total > 0 && branchProgress.completed >= branchProgress.total) {
            completedBranches++;
        }
    }

    return {
        completed: totalCompleted,
        total: totalQuotes,
        branchCount: branches.length,
        completedBranches
    };
}

/**
 * Check if a track is mastered.
 * A track is mastered when ALL of its playable branches are complete.
 */
export function isTrackComplete(
    trackId: string,
    solvedIds: Set<string>,
    customBranches: Branch[] = BRANCHES,
    db: Record<string, Omit<LevelData, 'category'>[]> = QUOTE_DB
): boolean {
    const branches = getBranchesForTrack(trackId, customBranches);
    if (branches.length === 0) return false;

    const playableBranches = branches.filter(b => (db[b.id]?.length ?? 0) > 0);
    if (playableBranches.length === 0) return false;

    return playableBranches.every(b => isBranchComplete(b.id, solvedIds, db));
}

/**
 * Retrieve all stable puzzle IDs for a given branch or track in curriculum order.
 */
export function getCategoryQuoteIds(category: string): string[] {
    const categoryQuotes = QUOTE_DB[category];
    if (categoryQuotes && categoryQuotes.length > 0) {
        return categoryQuotes.map((q, idx) => getLevelId(category, q, idx, categoryQuotes));
    }
    const branches = getBranchesForTrack(category);
    if (branches.length > 0) {
        return branches.flatMap(b => {
            const bQuotes = QUOTE_DB[b.id] || [];
            return bQuotes.map((q, idx) => getLevelId(b.id, q, idx, bQuotes));
        });
    }
    return [];
}

/**
 * Get the next available quote for a branch (or track's first available branch) sequentially.
 */
export function getNextQuote(category: string, solvedIds: Set<string>): QuoteData | null {
    let branchId = category;
    let categoryQuotes = QUOTE_DB[branchId];

    if (!categoryQuotes || categoryQuotes.length === 0) {
        const branches = getBranchesForTrack(category);
        const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
        for (const branch of branches) {
            const bQuotes = QUOTE_DB[branch.id];
            if (bQuotes && bQuotes.length > 0) {
                const hasUnsolved = bQuotes.some((q, idx) => !safeSet.has(getLevelId(branch.id, q, idx, bQuotes)));
                if (hasUnsolved) {
                    branchId = branch.id;
                    categoryQuotes = bQuotes;
                    break;
                }
            }
        }
    }

    if (!categoryQuotes || categoryQuotes.length === 0) {
        return null;
    }

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const availableQuotes = categoryQuotes
        .map((q, idx) => ({ ...q, id: getLevelId(branchId, q, idx, categoryQuotes) }))
        .filter(q => !safeSet.has(q.id));

    if (availableQuotes.length === 0) {
        return null;
    }

    const selected = availableQuotes[0];

    return {
        ...selected,
        category: branchId
    };
}

/**
 * Check if a genre/subject or branch has been completed.
 * If category is a track, verifies track mastery (all branches complete).
 * Otherwise verifies branch completion.
 */
export function isGenreComplete(category: string, solvedIds: Set<string>): boolean {
    const isTrack = TRACKS.some(t => t.id === category);
    if (isTrack) {
        return isTrackComplete(category, solvedIds);
    }
    return isBranchComplete(category, solvedIds);
}

/**
 * Get progress stats for a specific track or branch.
 */
export function getGenreProgress(category: string, solvedIds: Set<string>): {
    completed: number;
    total: number;
} {
    const isTrack = TRACKS.some(t => t.id === category);
    if (isTrack) {
        const tp = getTrackProgress(category, solvedIds);
        return { completed: tp.completed, total: tp.total };
    }
    return getBranchProgress(category, solvedIds);
}

/**
 * Get progress stats for all tracks and branches.
 */
export function getAllGenresProgress(solvedIds: Set<string>): Record<string, {
    completed: number;
    total: number;
}> {
    const progress: Record<string, { completed: number; total: number }> = {};

    for (const track of TRACKS) {
        const tp = getTrackProgress(track.id, solvedIds);
        progress[track.id] = { completed: tp.completed, total: tp.total };
    }

    for (const branch of BRANCHES) {
        if (!progress[branch.id]) {
            progress[branch.id] = getBranchProgress(branch.id, solvedIds);
        }
    }

    return progress;
}


/**
 * Get daily challenge quote for a specific date (YYYY-MM-DD)
 */
export function getDailyQuote(dateStr: string): QuoteData {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = (hash * 31 + dateStr.charCodeAt(i));
    }
    const index = Math.abs(hash) % DAILY_QUOTES.length;
    const item = DAILY_QUOTES[index];
    return {
        id: `daily-${dateStr}`,
        text: item.text,
        author: item.author,
        category: 'Daily Cipher'
    };
}

/**
 * Universal lookup for quotes across categories, daily challenges, and blitz quotes
 */
export function getQuoteById(id: string): QuoteData | null {
    if (!id) return null;

    if (id.startsWith('daily-')) {
        const dateStr = id.replace('daily-', '');
        return getDailyQuote(dateStr);
    }

    if (id.startsWith('blitz-')) {
        const match = BLITZ_QUOTES.find(q => id.includes(q.author));
        if (match) {
            return {
                id,
                text: match.text,
                author: match.author,
                category: 'Blitz Rush'
            };
        }
        // Deterministic fallback for legacy blitz IDs without embedded author name
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = (hash * 31 + id.charCodeAt(i));
        }
        const fallback = BLITZ_QUOTES[Math.abs(hash) % BLITZ_QUOTES.length];
        if (fallback) {
            return {
                id,
                text: fallback.text,
                author: fallback.author,
                category: 'Blitz Rush'
            };
        }
    }

    // Direct lookup: check if id matches a quote in QUOTE_DB
    // Fast path: if ID starts with a known category prefix
    for (const category of Object.keys(QUOTE_DB)) {
        if (id.startsWith(`${category}-`)) {
            const quotes = QUOTE_DB[category];
            for (let idx = 0; idx < quotes.length; idx++) {
                const item = quotes[idx];
                const quoteId = getLevelId(category, item, idx, quotes);
                if (quoteId === id) {
                    return {
                        ...item,
                        id: quoteId,
                        category
                    };
                }
            }
        }
    }

    // Fallback: check all categories for explicit ID or full match
    for (const [category, quotes] of Object.entries(QUOTE_DB)) {
        for (let idx = 0; idx < quotes.length; idx++) {
            const item = quotes[idx];
            const quoteId = getLevelId(category, item, idx, quotes);
            if (quoteId === id) {
                return {
                    ...item,
                    id: quoteId,
                    category
                };
            }
        }
    }

    return null;
}

/**
 * Get a random blitz puzzle from the blitz or standard pool
 */
export function getRandomBlitzQuote(excludeAuthors: string[] = []): QuoteData {
    const available = BLITZ_QUOTES.filter(q => !excludeAuthors.includes(q.author));
    const pool = available.length > 0 ? available : BLITZ_QUOTES;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return {
        id: `blitz-${selected.author}-${Date.now()}`,
        text: selected.text,
        author: selected.author,
        category: 'Blitz Rush'
    };
}
