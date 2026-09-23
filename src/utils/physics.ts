import { Vibration } from 'react-native';

/**
 * Second-Order Damped Oscillator Physics Presets
 * Governed by m * x'' + c * x' + k * (x - x_target) = 0
 * Standard React Native Animated.spring configurations with useNativeDriver: true
 */
export const SPRING_PRESETS = {
    // Crisp mechanical key press and snap rebound
    KEY_DOWN: {
        tension: 300,
        friction: 12,
        useNativeDriver: true,
    },
    KEY_REBOUND: {
        tension: 220,
        friction: 9,
        useNativeDriver: true,
    },
    // Juicy cell letter pop on user entry
    CELL_INPUT_POP: {
        tension: 260,
        friction: 11,
        useNativeDriver: true,
    },
    // Radial cipher wavefront ripple node
    RIPPLE_NODE: {
        tension: 180,
        friction: 14,
        useNativeDriver: true,
    },
    // Solid lock snap
    MAGNETIC_LOCK: {
        tension: 320,
        friction: 20,
        useNativeDriver: true,
    },
    // Elastic celebration modal entrance
    MODAL_SPRING: {
        tension: 140,
        friction: 8,
        useNativeDriver: true,
    },
    // Spectroscopic emission line magnetic lock & snap
    SPECTRAL_SNAP: {
        tension: 320,
        friction: 20,
        useNativeDriver: true,
    },
    // Spectral emission resonance pulse
    SPECTRAL_PULSE: {
        tension: 240,
        friction: 12,
        useNativeDriver: true,
    },
};

/**
 * Acoustic & Tactile Haptic Harmonics
 * Generates calibrated vibration transients synchronized with interaction timing
 */
export type HapticType = 
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'error'
    | 'key_down'
    | 'ripple'
    | 'word_complete'
    | 'victory';

export function triggerTactileHaptic(type: HapticType, hapticsEnabled = true): void {
    if (!hapticsEnabled) return;
    try {
        switch (type) {
            case 'key_down':
                Vibration.vibrate(10);
                break;
            case 'ripple':
                Vibration.vibrate(6);
                break;
            case 'word_complete':
                Vibration.vibrate([0, 18, 40, 24]);
                break;
            case 'victory':
                Vibration.vibrate([0, 30, 60, 45, 75, 60]);
                break;
            case 'light':
                Vibration.vibrate(12);
                break;
            case 'medium':
                Vibration.vibrate(25);
                break;
            case 'heavy':
                Vibration.vibrate(45);
                break;
            case 'success':
                Vibration.vibrate([0, 25, 50, 35]);
                break;
            case 'error':
                Vibration.vibrate([0, 35, 70, 40]);
                break;
        }
    } catch {
        // Native vibration gracefully ignored if unsupported
    }
}

/**
 * Calculate wave phase delay based on grid coordinate distance
 * Propagates at v = 1200 px/sec
 */
export function calculateWaveDelay(
    sourceIndex: number,
    targetIndex: number,
    gridWidth = 10
): number {
    const s = Math.max(0, sourceIndex);
    const t = Math.max(0, targetIndex);
    const srcX = s % gridWidth;
    const srcY = Math.floor(s / gridWidth);
    const tgtX = t % gridWidth;
    const tgtY = Math.floor(t / gridWidth);

    const dist = Math.sqrt((srcX - tgtX) ** 2 + (srcY - tgtY) ** 2);
    // 35ms per grid unit offset
    return Math.min(280, Math.round(dist * 35));
}

/**
 * Standard English Monogram Letter Frequencies (%)
 * Based on empirical natural English language corpus analysis
 */
export const ENGLISH_LETTER_FREQUENCIES: Record<string, number> = {
    E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
    D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
    P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15, Q: 0.10, Z: 0.07,
};

/**
 * Natural English Frequency Rank Order (ETAOIN SHRDLU...)
 */
export const ENGLISH_FREQUENCY_RANK: string[] = [
    'E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'
];

/**
 * Normalised English letter commonness in [0, 1] where E is 1.
 * Used to shade the on-screen keyboard as a cryptanalysis aid.
 */
export function englishFrequencyWeight(char: string): number {
    const freq = ENGLISH_LETTER_FREQUENCIES[char.toUpperCase()] ?? 0;
    const max = Math.max(...Object.values(ENGLISH_LETTER_FREQUENCIES));
    if (max <= 0) return 0;
    return Math.max(0, Math.min(1, freq / max));
}

export interface EnigmaCardParams {
    quoteText: string;
    userMap: Record<string, string>;
    cipherMap: Record<string, string>;
    timeSeconds: number;
    grade: string;
    accuracy: number;
    category: string;
    dateStr?: string;
}

/**
 * Generates a viral, spoiler-free "Enigma Signature" share card
 * Inspired by Wordle & Spotify Wrapped
 */
export function generateEnigmaShareCard(params: EnigmaCardParams): string {
    const {
        quoteText,
        userMap,
        cipherMap,
        timeSeconds,
        grade,
        accuracy,
        category,
        dateStr,
    } = params;

    const mins = Math.floor(timeSeconds / 60);
    const secs = timeSeconds % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const header = dateStr 
        ? `🧠 BrainCipher Daily #${dateStr}` 
        : `🧠 BrainCipher • ${category}`;

    const statsLine = `⏱️ ${timeFormatted} | 🎯 ${accuracy}% | 🏆 Grade ${grade}`;

    // Build spoiler-free emoji grid (up to 5 rows of 5 blocks, Wordle-style).
    // Count blocks explicitly: an emoji is a surrogate pair, so string length
    // cannot be used to decide when a row is full.
    const upper = quoteText.toUpperCase();
    const emojiRows: string[] = [];
    const BLOCKS_PER_ROW = 5;
    const MAX_ROWS = 5;

    let currentRow = '';
    let blocksInRow = 0;

    for (const char of upper) {
        if (!/[A-Z]/.test(char)) continue;
        const cipher = cipherMap[char];
        const guess = userMap[cipher];

        if (guess === char) {
            currentRow += '🟩';
        } else if (guess && guess !== char) {
            currentRow += '🟥';
        } else {
            currentRow += '⬛';
        }

        blocksInRow++;
        if (blocksInRow === BLOCKS_PER_ROW) {
            emojiRows.push(currentRow);
            currentRow = '';
            blocksInRow = 0;
            if (emojiRows.length >= MAX_ROWS) break;
        }
    }
    if (currentRow.length > 0 && emojiRows.length < MAX_ROWS) {
        emojiRows.push(currentRow);
    }

    return `${header}\n${statsLine}\n\n${emojiRows.join('\n')}\n\n🔓 Play now: https://braincipher.app`;
}
