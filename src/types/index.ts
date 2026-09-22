export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Legendary';

export interface LevelData {
    id: string;
    text: string; // The Definition
    author: string; // The Term/Answer
    category: string; // The Subject
    difficulty?: Difficulty;
}

export type QuoteData = LevelData;

export type GameMode = 'standard' | 'daily' | 'blitz';
export type SolveGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface CoinRewardBreakdown {
    baseCoins: number;
    mistakeDeduction: number;
    hintDeduction: number;
    timeDeduction: number;
    keyDeduction: number;
    cleanBonus: number;
    netCoins: number;
    grade: SolveGrade;
    gradeTitle: string;
    stars: number;
    accuracyPercent: number;
    mistakesCount: number;
    hintsCount: number;
    timeSeconds: number;
}

export interface GameState {
    originalQuote: string;
    author: string;
    category: string;
    cipherMap: Record<string, string>;
    reverseCipherMap: Record<string, string>;
    userMap: Record<string, string>;
    solved: boolean;
    startTime: number;
}

export interface SavedGameState {
    quoteId: string;
    userMap: Record<string, string>;
    cipherMap: Record<string, string>;
    timer: number;
    hintsUsed: number;
    freeHints: number;
    mistakes: string[]; // Array of cipher chars
    totalGuesses?: number;
    correctGuesses?: number;
    mode?: GameMode;
}

export interface CellData {
    char: string;
    cipherChar: string;
    userChar: string | null;
    isPunctuation: boolean;
    id: string;
}

export enum GameStatus {
    INTRO,
    HOME,
    PLAYING,
    WON,
    GENRE_COMPLETED,
    SETTINGS,
    HOW_TO_PLAY,
    LEADERBOARD
}

export interface Genre {
    id: string;
    label: string;
    icon: string;
    description: string;
    isExtension?: boolean;
    isDownloaded?: boolean;
    coinPrice?: number;
}

export type FontSize = 'system' | 'small' | 'medium' | 'large';
export type FontFamily = 'system' | 'sans' | 'serif' | 'mono' | 'cursive' | 'handwritten';
export type Theme = 'dark' | 'light' | 'cyberpunk' | 'terminal' | 'gold' | 'midnight' | 'ocean';

export interface AppSettings {
    theme: Theme;
    fontSize: FontSize;
    fontFamily: FontFamily;
    difficulty: Difficulty;
    blockUsedLetters: boolean;
    autoAdvance: boolean;
    hideTimer: boolean;
    hapticsEnabled: boolean;
    showFrequencyBar: boolean;
}

export interface PlayerStats {
    puzzlesSolved: number;
    totalGuesses: number;
    correctGuesses: number;
    bestTimes: Record<string, number>; // category -> fastest seconds
    currentStreak: number;
    maxStreak: number;
    lastSolvedDate: string | null; // YYYY-MM-DD
    blitzHighScore: number;
    totalPlayTimeSeconds: number;
    dailySolvedDates: string[]; // List of YYYY-MM-DD
}

export interface Achievement {
    id: string;
    icon: string;
    title: string;
    description: string;
    category: 'speed' | 'accuracy' | 'mastery' | 'streaks' | 'special';
    target: number;
    progress: number;
    isUnlocked: boolean;
    rewardCoins: number;
    claimed: boolean;
}

export interface LetterFrequency {
    char: string;
    cipherChar: string;
    frequency: number;
    solved: boolean;
}
