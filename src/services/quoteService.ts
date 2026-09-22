/**
 * BrainCipher - Quote Service
 * 
 * Stateless helper functions for quote management, daily challenges, and blitz rush.
 */

import { QuoteData } from '../types';
import { QUOTE_DB, DAILY_QUOTES, BLITZ_QUOTES } from '../data/quotes';

/**
 * Get the next available quote for a category (sequential)
 */
export function getNextQuote(category: string, solvedIds: Set<string>): QuoteData | null {
    const categoryQuotes = QUOTE_DB[category];

    if (!categoryQuotes || categoryQuotes.length === 0) {
        return null;
    }

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const availableQuotes = categoryQuotes
        .map((q, idx) => ({ ...q, id: `${category}-${idx}` }))
        .filter(q => !safeSet.has(q.id));

    if (availableQuotes.length === 0) {
        return null; // Genre completed
    }

    // Pick the first available quote to maintain linear progression
    const selected = availableQuotes[0];

    return {
        ...selected,
        category
    };
}

/**
 * Check if all quotes in a genre have been completed
 */
export function isGenreComplete(category: string, solvedIds: Set<string>): boolean {
    const categoryQuotes = QUOTE_DB[category];
    if (!categoryQuotes || categoryQuotes.length === 0) return false;

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const totalCount = categoryQuotes.length;
    let usedCount = 0;

    for (let i = 0; i < totalCount; i++) {
        if (safeSet.has(`${category}-${i}`)) {
            usedCount++;
        }
    }

    return usedCount === totalCount;
}

/**
 * Get progress stats for a specific genre
 */
export function getGenreProgress(category: string, solvedIds: Set<string>): {
    completed: number;
    total: number;
} {
    const categoryQuotes = QUOTE_DB[category];
    if (!categoryQuotes) return { completed: 0, total: 0 };

    const safeSet = (solvedIds instanceof Set) ? solvedIds : new Set(Array.isArray(solvedIds) ? solvedIds : []);
    const totalCount = categoryQuotes.length;
    let completedCount = 0;

    for (let i = 0; i < totalCount; i++) {
        if (safeSet.has(`${category}-${i}`)) {
            completedCount++;
        }
    }

    return { completed: completedCount, total: totalCount };
}

/**
 * Get progress stats for all genres
 */
export function getAllGenresProgress(solvedIds: Set<string>): Record<string, {
    completed: number;
    total: number;
}> {
    const progress: Record<string, { completed: number; total: number }> = {};

    Object.keys(QUOTE_DB).forEach(category => {
        progress[category] = getGenreProgress(category, solvedIds);
    });

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

    const lastDash = id.lastIndexOf('-');
    if (lastDash !== -1) {
        const category = id.substring(0, lastDash);
        const suffix = id.substring(lastDash + 1);
        const index = parseInt(suffix, 10);

        if (!isNaN(index) && QUOTE_DB[category]?.[index]) {
            const item = QUOTE_DB[category][index];
            return {
                id,
                text: item.text,
                author: item.author,
                category
            };
        }
    }

    // Fallback search across all categories
    for (const [category, quotes] of Object.entries(QUOTE_DB)) {
        const found = quotes.find(q => id.includes(q.author) || `${category}-${q.author}` === id);
        if (found) {
            return {
                id,
                text: found.text,
                author: found.author,
                category
            };
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
