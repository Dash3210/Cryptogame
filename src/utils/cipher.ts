import { QuoteData, CellData, Difficulty, SolveGrade, LetterFrequency, CoinRewardBreakdown, GameMode, LengthTier, DynamicScoringParams, DynamicScoringResult } from '../types';

export type CipherMap = Record<string, string>;

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
}

/**
 * Deterministic pseudo-random number generator from seed string (e.g. date '2026-09-01')
 */
export function seededRandom(seedStr: string): () => number {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return function () {
        let t = (a += 0x6D2B79F5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generate a complete derangement (no letter mapping to itself)
 */
export function generateCipher(seed?: string): Record<string, string> {
    const letters = ALPHABET.split('');
    const randomFn = seed ? seededRandom(seed) : Math.random;

    let shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(randomFn() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }

    const cipherMap: Record<string, string> = {};
    for (let i = 0; i < letters.length; i++) {
        cipherMap[letters[i]] = shuffled[i];
    }

    // Ensure derangement (no letter maps to itself)
    for (let i = 0; i < letters.length; i++) {
        if (letters[i] === cipherMap[letters[i]]) {
            const swapIndex = (i + 1) % letters.length;
            const temp = cipherMap[letters[i]];
            cipherMap[letters[i]] = cipherMap[letters[swapIndex]];
            cipherMap[letters[swapIndex]] = temp;
        }
    }

    // Final safety check
    for (let i = 0; i < letters.length; i++) {
        if (letters[i] === cipherMap[letters[i]]) {
            const swapIndex = (i + 2) % letters.length;
            const temp = cipherMap[letters[i]];
            cipherMap[letters[i]] = cipherMap[letters[swapIndex]];
            cipherMap[letters[swapIndex]] = temp;
        }
    }

    return cipherMap;
}

/**
 * Generate starter hints based on chosen difficulty
 */
export function generateHints(
    quote: string,
    cipherMap: Record<string, string>,
    difficulty: Difficulty
): Record<string, string> {
    const uniqueChars = Array.from(
        new Set(quote.toUpperCase().replace(/[^A-Z]/g, '').split(''))
    );

    let percentage = 0.25;

    switch (difficulty) {
        case 'Easy': percentage = 0.45; break;
        case 'Normal': percentage = 0.25; break;
        case 'Hard': percentage = 0.10; break;
        case 'Legendary': percentage = 0.0; break;
    }

    const numHints = Math.max(
        difficulty === 'Legendary' ? 0 : (uniqueChars.length > 0 ? 1 : 0),
        Math.floor(uniqueChars.length * percentage)
    );
    const shuffled = shuffleArray(uniqueChars);
    const selectedChars = shuffled.slice(0, numHints);

    const initialUserMap: Record<string, string> = {};
    selectedChars.forEach(realChar => {
        const cipherChar = cipherMap[realChar];
        if (cipherChar) {
            initialUserMap[cipherChar] = realChar;
        }
    });
    return initialUserMap;
}

/**
 * Prepare cells for PuzzleBoard
 */
export function prepareGameData(
    quoteData: QuoteData,
    cipherMap: Record<string, string>
): CellData[] {
    const upperQuote = quoteData.text.toUpperCase();
    return upperQuote.split('').map((char, index) => {
        const isAlpha = /[A-Z]/.test(char);
        return {
            id: `cell-${index}`,
            char: char,
            cipherChar: isAlpha ? cipherMap[char] || '' : '',
            userChar: null,
            isPunctuation: !isAlpha
        };
    });
}

/**
 * Check if the entire puzzle is solved accurately
 */
export function isSolved(
    original: string,
    userMap: Record<string, string>,
    cipherMap: Record<string, string>
): boolean {
    const upperOriginal = original.toUpperCase();

    for (const char of upperOriginal) {
        if (/[A-Z]/.test(char)) {
            const cipher = cipherMap[char];
            const userGuess = userMap[cipher];
            if (userGuess !== char) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Calculate letter frequency table for cryptogram pro gamers
 */
export function getLetterFrequencies(
    text: string,
    cipherMap: Record<string, string>,
    userMap: Record<string, string>
): LetterFrequency[] {
    const upperText = text.toUpperCase();
    const counts: Record<string, number> = {};
    const cipherToReal: Record<string, string> = {};

    for (const [real, cipher] of Object.entries(cipherMap)) {
        cipherToReal[cipher] = real;
    }

    for (const char of upperText) {
        if (/[A-Z]/.test(char)) {
            const cipher = cipherMap[char];
            if (cipher) {
                counts[cipher] = (counts[cipher] || 0) + 1;
            }
        }
    }

    const list: LetterFrequency[] = Object.keys(counts).map(cipherChar => {
        const realChar = cipherToReal[cipherChar] || '';
        const userVal = userMap[cipherChar];
        return {
            char: realChar,
            cipherChar,
            frequency: counts[cipherChar],
            solved: userVal === realChar
        };
    });

    // Sort by frequency descending with fast ASCII tie-breaker
    return list.sort((a, b) => b.frequency - a.frequency || (a.cipherChar < b.cipherChar ? -1 : a.cipherChar > b.cipherChar ? 1 : 0));
}

/**
 * Calculate dynamic board letter frequency hint weights in [0, 1].
 * Rule:
 *   hintWeight(k) = (count of k in text) / (max letter count in text),
 *   ONLY when k is decoded (a known cipher->plain mapping produces k);
 *   otherwise exactly 0.
 * A decoded letter with count 0 stays completely unlit (weight = 0).
 * Undecoded keys receive weight 0 so nothing leaks.
 */
export function getBoardHintWeights(
    text: string,
    cipherMap: Record<string, string>,
    userMap: Record<string, string>
): Record<string, number> {
    const list = getLetterFrequencies(text, cipherMap, userMap);
    if (list.length === 0) return {};

    const maxCount = Math.max(...list.map(item => item.frequency));
    if (maxCount <= 0) return {};

    const weights: Record<string, number> = {};
    for (const item of list) {
        if (item.solved && item.frequency > 0) {
            weights[item.char] = item.frequency / maxCount;
        }
    }
    return weights;
}

/**
 * Calculate the frequency hint weight for a single plaintext key k on this board.
 * Returns in [0, 1]. Returns 0 if undecoded, count 0, or not in text.
 */
export function calculateBoardHintWeight(
    k: string,
    text: string,
    cipherMap: Record<string, string>,
    userMap: Record<string, string>
): number {
    const upperK = k.toUpperCase();
    if (!/[A-Z]/.test(upperK)) return 0;
    const weights = getBoardHintWeights(text, cipherMap, userMap);
    return weights[upperK] ?? 0;
}

/**
 * Strict forward index-based traversal to find next unsolved cell.
 * Behaviour:
 * - "Next" and correct-letter auto-advance move STRICTLY FORWARD from the current cell, skipping non-letters.
 * - Wrap to the earliest unsolved gap ONLY when nothing ahead is unsolved.
 */
export function getNextUnsolvedIndex(
    text: string,
    cipherMap: Record<string, string>,
    userMap: Record<string, string>,
    startIndex: number
): number | null {
    const upperText = text.toUpperCase();
    const len = upperText.length;
    if (len === 0) return null;

    const isIndexUnsolved = (idx: number): boolean => {
        const char = upperText[idx];
        if (!char || !/[A-Z]/.test(char)) return false;
        const cipher = cipherMap[char];
        if (!cipher) return false;
        const userGuess = userMap[cipher];
        return userGuess !== char;
    };

    const safeStart = Math.max(-1, startIndex);

    // 1. Scan STRICTLY FORWARD from safeStart + 1, skipping non-letters
    for (let i = safeStart + 1; i < len; i++) {
        if (isIndexUnsolved(i)) return i;
    }

    // 2. Wrap to the earliest unsolved gap ONLY when nothing ahead is unsolved
    const wrapLimit = Math.min(safeStart, len - 1);
    for (let i = 0; i <= wrapLimit; i++) {
        if (isIndexUnsolved(i)) return i;
    }

    return null;
}

/**
 * Find previous cell for intuitive backspace navigation
 */
export function getPreviousCellIndex(
    text: string,
    startIndex: number
): number | null {
    const upperText = text.toUpperCase();
    for (let i = startIndex - 1; i >= 0; i--) {
        if (/[A-Z]/.test(upperText[i])) {
            return i;
        }
    }
    return null;
}

/**
 * Calculate accurate solve accuracy percentage with strict mistake bounds.
 * Invariant: If mistakesCount > 0, accuracy can NEVER be 100%.
 */
export function calculateAccuracy(
    correctCount: number,
    totalCount: number,
    mistakesCount: number
): number {
    const effectiveTotal = Math.max(totalCount, correctCount + mistakesCount);
    if (effectiveTotal === 0) {
        return mistakesCount === 0 ? 100 : 0;
    }
    if (correctCount === 0 && mistakesCount > 0) {
        return 0;
    }
    const raw = Math.round((Math.max(0, correctCount) / effectiveTotal) * 100);
    // Strict invariant: Any mistake prevents 100% accuracy
    if (mistakesCount > 0 && raw >= 100) {
        return Math.max(0, Math.min(99, Math.round(((effectiveTotal - mistakesCount) / effectiveTotal) * 100)));
    }
    return Math.max(0, Math.min(100, raw));
}

/**
 * Calculate S / A / B / C / D Solve Grade
 */
export function calculateSolveGrade(
    accuracy: number, // 0 - 100
    hintsUsed: number,
    timeSeconds: number,
    difficulty: Difficulty,
    mistakesCount: number,
    usedMasterKey?: boolean
): { grade: SolveGrade; title: string; stars: number } {
    if (usedMasterKey) {
        return { grade: 'D', title: 'Cipher Apprentice', stars: 1 };
    }
    const isSpeedBonus = timeSeconds > 0 && timeSeconds < (difficulty === 'Legendary' ? 60 : 30);
    if (hintsUsed === 0 && mistakesCount === 0 && accuracy >= 95) {
        return { grade: 'S', title: isSpeedBonus ? 'Flawless Speed Demon' : 'Flawless Mastermind', stars: 3 };
    }
    if (hintsUsed <= 1 && mistakesCount <= 2 && accuracy >= 85) {
        return { grade: 'A', title: 'Expert Codebreaker', stars: 3 };
    }
    if (hintsUsed <= 3 && mistakesCount <= 5 && accuracy >= 70) {
        return { grade: 'B', title: 'Sharp Decryptor', stars: 2 };
    }
    if (accuracy >= 50) {
        return { grade: 'C', title: 'Determined Solver', stars: 1 };
    }
    return { grade: 'D', title: 'Cipher Apprentice', stars: 1 };
}

/**
 * Determine puzzle length tier and associated coin bonus:
 * Short (<60 alpha): +0
 * Medium (60-100 alpha): +15
 * Long (101-150 alpha): +30
 * Epic (>150 alpha): +45
 */
export function getLengthTier(alphaCount: number): { tier: LengthTier; bonus: number } {
    if (alphaCount > 150) return { tier: 'Epic', bonus: 45 };
    if (alphaCount >= 101) return { tier: 'Long', bonus: 30 };
    if (alphaCount >= 60) return { tier: 'Medium', bonus: 15 };
    return { tier: 'Short', bonus: 0 };
}

/**
 * Transparent Itemized Coins Economy Calculator
 * Eliminates legacy dual score/coins ambiguity.
 * Rewards level completion with an itemized breakdown:
 * e.g. "Base Level Reward (Normal - Medium): +65"
 */
export function calculateCoinReward(params: {
    difficulty: Difficulty;
    timerSeconds: number;
    hintsUsed: number;
    mistakesCount: number;
    accuracy: number;
    usedMasterKey?: boolean;
    mode?: GameMode;
    quoteText?: string;
    alphaCount?: number;
}): CoinRewardBreakdown {
    const {
        difficulty,
        timerSeconds,
        hintsUsed,
        mistakesCount,
        accuracy,
        usedMasterKey = false,
        mode = 'standard',
        quoteText,
        alphaCount: explicitAlpha
    } = params;

    let alphaCount = explicitAlpha;
    if (alphaCount === undefined) {
        alphaCount = quoteText ? (quoteText.toUpperCase().match(/[A-Z]/g) || []).length : 0;
    }

    const { tier: lengthTier, bonus: lengthBonus } = getLengthTier(alphaCount);

    // Base difficulty coins
    let difficultyBase = 38;
    if (mode === 'daily') {
        difficultyBase = 45;
    } else if (mode === 'blitz') {
        difficultyBase = 18;
    } else {
        switch (difficulty) {
            case 'Easy': difficultyBase = 30; break;
            case 'Normal': difficultyBase = 38; break;
            case 'Hard': difficultyBase = 48; break;
            case 'Legendary': difficultyBase = 60; break;
        }
    }

    const baseCoins = difficultyBase + lengthBonus;
    const diffName = mode === 'daily' ? 'Daily' : mode === 'blitz' ? 'Blitz' : difficulty;
    const baseLabel = `Base Level Reward (${diffName} - ${lengthTier})`;

    // Par Time Limits in seconds
    let parTime = 90;
    switch (difficulty) {
        case 'Easy': parTime = 90; break;
        case 'Normal': parTime = 120; break;
        case 'Hard': parTime = 180; break;
        case 'Legendary': parTime = 240; break;
    }

    // Itemized Deductions
    // -2 coins per mistake (capped at 20 coins max deduction)
    const mistakeDeduction = Math.min(20, mistakesCount * 2);

    // -3 coins per hint used (capped at 15 coins max deduction)
    const hintDeduction = Math.min(15, hintsUsed * 3);

    // Time deduction: -1 coin per 20 seconds overtime past par time (capped at 10 coins)
    const overtime = Math.max(0, timerSeconds - parTime);
    const timeDeduction = Math.min(10, Math.floor(overtime / 20));

    // Master Key solve => flat 10 coins, 0 points, grade D, no bonus
    if (usedMasterKey) {
        return {
            baseCoins,
            baseLabel,
            lengthTier,
            lengthBonus,
            mistakeDeduction: 0,
            hintDeduction: 0,
            timeDeduction: 0,
            keyDeduction: Math.max(0, baseCoins - 10),
            cleanBonus: 0,
            netCoins: 10,
            grade: 'D',
            gradeTitle: 'Cipher Apprentice',
            stars: 1,
            accuracyPercent: accuracy,
            mistakesCount,
            hintsCount: hintsUsed,
            timeSeconds: timerSeconds
        };
    }

    // Clean Solve / Perfection bonus: +5 coins if 0 mistakes, 0 hints, and no key used
    const cleanBonus = (mistakesCount === 0 && hintsUsed === 0) ? 5 : 0;

    // Calculate Net Coins with a guaranteed floor of 15 coins (effort always recognized)
    const rawNet = baseCoins - mistakeDeduction - hintDeduction - timeDeduction + cleanBonus;
    const netCoins = Math.max(15, rawNet);

    const gradeInfo = calculateSolveGrade(
        accuracy,
        hintsUsed,
        timerSeconds,
        difficulty,
        mistakesCount,
        usedMasterKey
    );

    return {
        baseCoins,
        baseLabel,
        lengthTier,
        lengthBonus,
        mistakeDeduction,
        hintDeduction,
        timeDeduction,
        keyDeduction: 0,
        cleanBonus,
        netCoins,
        grade: gradeInfo.grade,
        gradeTitle: gradeInfo.title,
        stars: gradeInfo.stars,
        accuracyPercent: accuracy,
        mistakesCount,
        hintsCount: hintsUsed,
        timeSeconds: timerSeconds
    };
}

/**
 * Combo multiplier tiers. Shared by the in-game HUD, standard scoring and Blitz
 * scoring so the number the player sees is the number that is actually applied.
 * Up to 2.5x, matching the How-to-Play copy.
 */
export function getComboMultiplier(comboCount: number): number {
    if (comboCount >= 10) return 2.5;
    if (comboCount >= 6) return 2.0;
    if (comboCount >= 3) return 1.5;
    if (comboCount >= 1) return 1.2;
    return 1.0;
}

/**
 * Dynamic Scoring Calculator
 * Points scale with gaps and difficulty (short quotes score low).
 * Length + difficulty scaled grace window (no time loss within it, then smooth decay capped at 50% max).
 * Point magnitudes comparable (hundreds to low thousands). Consistent maxScore.
 */
export function calculateDynamicPoints(params: DynamicScoringParams): DynamicScoringResult {
    const {
        quoteText,
        alphaCount: explicitAlpha,
        difficulty = 'Normal',
        timerSeconds,
        hintsUsed,
        mistakesCount,
        accuracy = 100,
        comboMax = 0,
        usedMasterKey = false,
        mode = 'standard'
    } = params;

    let alpha = explicitAlpha;
    if (alpha === undefined) {
        alpha = quoteText !== undefined ? (quoteText.toUpperCase().match(/[A-Z]/g) || []).length : 50;
    }
    const effectiveAlpha = Math.max(1, alpha);

    const diffKey = mode === 'daily' ? 'Daily' : mode === 'blitz' ? 'Blitz' : difficulty;

    let gapRatio = 0.75;
    let diffMultiplier = 1.0;
    let baseGrace = 90;

    switch (diffKey) {
        case 'Easy':
            gapRatio = 0.55;
            diffMultiplier = 0.8;
            baseGrace = 60;
            break;
        case 'Normal':
            gapRatio = 0.75;
            diffMultiplier = 1.0;
            baseGrace = 90;
            break;
        case 'Hard':
            gapRatio = 0.90;
            diffMultiplier = 1.25;
            baseGrace = 120;
            break;
        case 'Legendary':
            gapRatio = 1.00;
            diffMultiplier = 1.5;
            baseGrace = 150;
            break;
        case 'Daily':
            gapRatio = 0.75;
            diffMultiplier = 1.1;
            baseGrace = 90;
            break;
        case 'Blitz':
            gapRatio = 0.55;
            diffMultiplier = 0.9;
            baseGrace = 45;
            break;
    }

    const basePoints = Math.round(
        Math.max(1, Math.round(effectiveAlpha * gapRatio)) * 10 * diffMultiplier
    );

    const graceSeconds = baseGrace + Math.round(effectiveAlpha * 0.75);
    const overtime = Math.max(0, timerSeconds - graceSeconds);
    const timeLossPercent = overtime > 0
        ? Math.min(50, Math.round((overtime / Math.max(120, graceSeconds)) * 50))
        : 0;
    const timeFactor = 1.0 - (timeLossPercent / 100);

    const accuracyFactor = Math.max(0.5, accuracy / 100);
    const cleanMultiplier = (hintsUsed === 0 && mistakesCount === 0) ? 1.1 : 1.0;
    const comboMultiplier = getComboMultiplier(comboMax);

    if (usedMasterKey) {
        const theoreticalMax = Math.round(basePoints * 1.1 * 2.5);
        return {
            score: 0,
            maxScore: theoreticalMax,
            basePoints,
            graceSeconds,
            timeLossPercent: 0,
            timeFactor: 1.0,
            accuracyFactor,
            cleanMultiplier: 1.0,
            comboMultiplier: 1.0
        };
    }

    const pointsWithoutCombo = Math.round(basePoints * timeFactor * accuracyFactor * cleanMultiplier);
    const score = Math.max(10, Math.round(pointsWithoutCombo * comboMultiplier));
    const maxScore = Math.max(score, Math.round(basePoints * 1.1 * 2.5));

    return {
        score,
        maxScore,
        basePoints,
        graceSeconds,
        timeLossPercent,
        timeFactor,
        accuracyFactor,
        cleanMultiplier,
        comboMultiplier
    };
}

/**
 * Dynamic Score and Coin rewards calculator (backward-compatible adapter).
 * `comboMax` applies a real multiplier to the points score (see getComboMultiplier)
 * and `accuracy` is honoured by the grade, so this can no longer report a
 * flawless grade for a mistake-riddled solve.
 */
export function calculateScoreAndCoins(
    quoteText: string,
    difficulty: Difficulty,
    timerSeconds: number,
    hintsUsed: number,
    mistakesCount: number,
    comboMax: number,
    accuracy = 100,
    usedMasterKey = false,
    mode?: GameMode
): { score: number; maxScore: number; coinsEarned: number; timeBonus: number } {
    const reward = calculateCoinReward({
        difficulty,
        timerSeconds,
        hintsUsed,
        mistakesCount,
        accuracy,
        usedMasterKey,
        quoteText,
        mode
    });
    const scoring = calculateDynamicPoints({
        quoteText,
        difficulty,
        timerSeconds,
        hintsUsed,
        mistakesCount,
        accuracy,
        comboMax,
        usedMasterKey,
        mode
    });
    const timeBonus = !usedMasterKey && scoring.timeLossPercent === 0
        ? reward.cleanBonus * 5 + (timerSeconds <= scoring.graceSeconds ? 10 : 0)
        : 0;

    return {
        score: scoring.score,
        maxScore: scoring.maxScore,
        coinsEarned: reward.netCoins,
        timeBonus
    };
}

/**
 * Convert Blitz Rush score points to coins at a 50:1 ratio,
 * with a guaranteed minimum of 5 coins and capped at 100 coins.
 */
export function convertBlitzPointsToCoins(points: number): number {
    if (!Number.isFinite(points) || points <= 0) return 5;
    return Math.min(100, Math.max(5, Math.round(points / 50)));
}

/**
 * Generate a Caesar shift cipher
 * @param shift Number of positions to rotate (1-25)
 */
export function generateCaesarCipher(shift = 3): Record<string, string> {
    const normalizedShift = ((shift % 26) + 26) % 26 || 3;
    const cipherMap: Record<string, string> = {};
    for (let i = 0; i < 26; i++) {
        const sourceChar = ALPHABET[i];
        const targetChar = ALPHABET[(i + normalizedShift) % 26];
        cipherMap[sourceChar] = targetChar;
    }
    return cipherMap;
}

/**
 * Generate an Atbash reverse-alphabet cipher
 * A -> Z, B -> Y, C -> X, etc.
 */
export function generateAtbashCipher(): Record<string, string> {
    const cipherMap: Record<string, string> = {};
    for (let i = 0; i < 26; i++) {
        const sourceChar = ALPHABET[i];
        const targetChar = ALPHABET[25 - i];
        cipherMap[sourceChar] = targetChar;
    }
    return cipherMap;
}

/**
 * Valid coprime multiplier constants for Affine cipher modulo 26
 */
export const AFFINE_COPRIMES = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

/**
 * Generate an Affine cipher: E(x) = (a * x + b) mod 26
 */
export function generateAffineCipher(a = 5, b = 8): Record<string, string> {
    const validA = AFFINE_COPRIMES.includes(a) ? a : 5;
    const cipherMap: Record<string, string> = {};
    for (let i = 0; i < 26; i++) {
        const sourceChar = ALPHABET[i];
        const targetIndex = (validA * i + b) % 26;
        cipherMap[sourceChar] = ALPHABET[(targetIndex + 26) % 26];
    }
    return cipherMap;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function stringToBase64Url(input: string): string {
    const utf8Bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i);
        if (code < 0x80) {
            utf8Bytes.push(code);
        } else if (code < 0x800) {
            utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
            utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            i++;
            // Unpaired high surrogate: emit U+FFFD rather than reading past the end.
            const low = i < input.length ? input.charCodeAt(i) : 0xfffd;
            code = 0x10000 + (((code & 0x3ff) << 10) | (low & 0x3ff));
            utf8Bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            );
        }
    }

    let output = '';
    for (let i = 0; i < utf8Bytes.length; i += 3) {
        const b0 = utf8Bytes[i];
        const b1 = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : 0;
        const b2 = i + 2 < utf8Bytes.length ? utf8Bytes[i + 2] : 0;

        output += B64_CHARS[b0 >> 2];
        output += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
        if (i + 1 < utf8Bytes.length) {
            output += B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)];
        }
        if (i + 2 < utf8Bytes.length) {
            output += B64_CHARS[b2 & 63];
        }
    }
    return output;
}

export function base64UrlToString(input: string): string {
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const val = B64_CHARS.indexOf(char);
        if (val === -1) continue;
        buffer = (buffer << 6) | val;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }

    let result = '';
    let i = 0;
    while (i < bytes.length) {
        const b0 = bytes[i++];
        if (b0 < 0x80) {
            result += String.fromCharCode(b0);
        } else if (b0 > 0xbf && b0 < 0xe0) {
            const b1 = bytes[i++];
            result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        } else if (b0 >= 0xe0 && b0 < 0xf0) {
            const b1 = bytes[i++];
            const b2 = bytes[i++];
            result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        } else {
            const b1 = bytes[i++];
            const b2 = bytes[i++];
            const b3 = bytes[i++];
            const cp = (((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)) - 0x10000;
            result += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
    }
    return result;
}

/**
 * Encode a custom or UGC puzzle into a compact URL-safe Base64 string
 */
export function encodePuzzleToUrl(quote: QuoteData): string {
    try {
        const payload = JSON.stringify({
            t: quote.text,
            a: quote.author,
            c: quote.category,
            d: quote.difficulty || 'Normal',
        });
        return stringToBase64Url(payload);
    } catch {
        return '';
    }
}

/**
 * Decode a URL-safe Base64 puzzle string back into a validated QuoteData object
 */
const UGC_MAX_TEXT = 240;
const UGC_MAX_AUTHOR = 60;
const UGC_MAX_CATEGORY = 40;
const UGC_MAX_ENCODED = 4096;

function sanitizeUgcText(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Decode a URL-safe Base64 puzzle string back into a validated QuoteData object.
 * Input is length-capped and every field is type-checked before use so a
 * malformed or oversized token cannot be rendered or re-shared.
 */
export function decodePuzzleFromUrl(encoded: string): QuoteData | null {
    try {
        if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > UGC_MAX_ENCODED) {
            return null;
        }
        const jsonStr = base64UrlToString(encoded);
        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed !== 'object') return null;

        const text = sanitizeUgcText((parsed as Record<string, unknown>).t, UGC_MAX_TEXT);
        if (text.length === 0) return null;

        const author = sanitizeUgcText((parsed as Record<string, unknown>).a, UGC_MAX_AUTHOR) || 'Anonymous Decryptor';
        const category = sanitizeUgcText((parsed as Record<string, unknown>).c, UGC_MAX_CATEGORY) || 'Community';
        const rawDifficulty = (parsed as Record<string, unknown>).d;
        const difficulty: Difficulty =
            rawDifficulty === 'Easy' || rawDifficulty === 'Normal' || rawDifficulty === 'Hard' || rawDifficulty === 'Legendary'
                ? rawDifficulty
                : 'Normal';

        return {
            id: `ugc-${Date.now()}`,
            text,
            author,
            category,
            difficulty,
        };
    } catch {
        return null;
    }
}


