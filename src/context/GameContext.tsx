import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, SavedGameState, PlayerStats, Achievement, Theme, SolveGrade } from '../types';
import { getTheme, COLORS } from '../styles/theme';
import { TRACKS } from '../data/quotes';
import { getCategoryQuoteIds, isTrackComplete } from '../services/quoteService';
import { HapticType, triggerTactileHaptic } from '../utils/physics';
import { playGamesService, PlayGamesUser, PLAY_GAMES_CONFIG } from '../services/playGamesService';
import { daysBetweenKeys, todayKey } from '../utils/date';
import { getShopItem, PurchaseResult } from '../data/shop';

export type { PurchaseResult };

export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    fontSize: 'system',
    fontFamily: 'system',
    difficulty: 'Normal',
    blockUsedLetters: true,
    autoAdvance: true,
    hideTimer: false,
    hapticsEnabled: true,
    showFrequencyBar: true,
};

const INITIAL_STATS: PlayerStats = {
    puzzlesSolved: 0,
    totalGuesses: 0,
    correctGuesses: 0,
    bestTimes: {},
    currentStreak: 0,
    maxStreak: 0,
    lastSolvedDate: null,
    blitzHighScore: 0,
    totalPlayTimeSeconds: 0,
    dailySolvedDates: [],
    hasStreakFreeze: false,
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
    // `icon` is an icon-kit slug rendered by the Icon component.
    { id: 'first_cipher', icon: 'sparkle', title: 'First Contact', description: 'Solve your first cryptogram', category: 'special', target: 1, progress: 0, isUnlocked: false, rewardCoins: 25, claimed: false },
    { id: 'scholar_10', icon: 'book', title: 'Scholar', description: 'Solve 10 cryptograms', category: 'mastery', target: 10, progress: 0, isUnlocked: false, rewardCoins: 60, claimed: false },
    { id: 'mastermind_50', icon: 'brain', title: 'Mastermind', description: 'Solve 50 cryptograms across the curriculum', category: 'mastery', target: 50, progress: 0, isUnlocked: false, rewardCoins: 200, claimed: false },
    { id: 'centurion_100', icon: 'monument', title: 'Enigma Centurion', description: 'Solve 100 total puzzles', category: 'mastery', target: 100, progress: 0, isUnlocked: false, rewardCoins: 500, claimed: false },
    { id: 'clean_solve', icon: 'sparkle-burst', title: 'Pure Insight', description: 'Solve a puzzle with 0 hints and 0 mistakes', category: 'accuracy', target: 1, progress: 0, isUnlocked: false, rewardCoins: 50, claimed: false },
    { id: 'flawless_5', icon: 'target', title: 'Flawless Decryptor', description: 'Solve 5 puzzles with 0 mistakes', category: 'accuracy', target: 5, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'speed_demon', icon: 'bolt', title: 'Speed Demon', description: 'Solve a puzzle in under 30 seconds', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 60, claimed: false },
    { id: 'lightning_fast', icon: 'timer', title: 'Lightning Reflexes', description: 'Solve a puzzle in under 15 seconds', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'daily_starter', icon: 'calendar', title: 'Daily Dedication', description: 'Solve your first Daily Cipher challenge', category: 'streaks', target: 1, progress: 0, isUnlocked: false, rewardCoins: 40, claimed: false },
    { id: 'streak_7', icon: 'flame', title: 'Week of Brilliance', description: 'Maintain a 7-day Daily Cipher streak', category: 'streaks', target: 7, progress: 0, isUnlocked: false, rewardCoins: 200, claimed: false },
    { id: 'streak_30', icon: 'trophy', title: 'Unbreakable Will', description: 'Reach a 30-day Daily Cipher streak', category: 'streaks', target: 30, progress: 0, isUnlocked: false, rewardCoins: 600, claimed: false },
    { id: 'subject_master_1', icon: 'medal', title: 'First Mastery', description: 'Master 1 subject in the library', category: 'mastery', target: 1, progress: 0, isUnlocked: false, rewardCoins: 80, claimed: false },
    { id: 'polymath_3', icon: 'graduation', title: 'Polymath', description: 'Master 3 distinct subjects', category: 'mastery', target: 3, progress: 0, isUnlocked: false, rewardCoins: 150, claimed: false },
    { id: 'omniscient_8', icon: 'galaxy', title: 'Omniscient Mind', description: 'Master 8 distinct subjects', category: 'mastery', target: 8, progress: 0, isUnlocked: false, rewardCoins: 400, claimed: false },
    { id: 'legendary_solver', icon: 'sword', title: 'Legendary Decryptor', description: 'Solve a Legendary difficulty puzzle', category: 'special', target: 1, progress: 0, isUnlocked: false, rewardCoins: 100, claimed: false },
    { id: 'blitz_master', icon: 'rocket', title: 'Blitz Overdrive', description: 'Score 1,000+ points in Blitz Rush mode', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'theme_collector', icon: 'palette', title: 'Aesthetic Elite', description: 'Unlock 3 custom themes in the Store', category: 'special', target: 3, progress: 0, isUnlocked: false, rewardCoins: 100, claimed: false },
];

const INITIAL_COINS = 50; // Welcome bonus
const DEFAULT_THEMES: Theme[] = ['dark', 'light'];
// Only these count toward the "Aesthetic Elite" achievement; the two defaults do not.
const PAID_THEMES: Theme[] = ['cyberpunk', 'terminal', 'gold', 'midnight', 'ocean'];

/**
 * Resolve the next daily streak without mutating state. Kept outside React so
 * the streak value used for achievements is the same one written to stats.
 */
function computeStreak(
    prev: PlayerStats,
    today: string,
    isDaily: boolean | undefined,
    usedMasterKey?: boolean
): { newStreak: number; dailyDates: string[]; streakFreezeConsumed: boolean } {
    let newStreak = prev.currentStreak;
    let streakFreezeConsumed = false;
    const dailyDates = [...prev.dailySolvedDates];
    if (isDaily && !dailyDates.includes(today)) {
        dailyDates.push(today);
        if (!usedMasterKey) {
            if (prev.lastSolvedDate) {
                const diffDays = daysBetweenKeys(prev.lastSolvedDate, today);
                if (diffDays === 1) {
                    newStreak += 1;
                } else if (diffDays === 2 && prev.hasStreakFreeze) {
                    newStreak += 1;
                    streakFreezeConsumed = true;
                } else if (diffDays > 1) {
                    newStreak = 1;
                    if (prev.hasStreakFreeze) {
                        streakFreezeConsumed = true;
                    }
                }
            } else {
                newStreak = 1;
            }
        }
    }
    return { newStreak, dailyDates, streakFreezeConsumed };
}

interface GameContextType {
    // Points & Economy
    totalPoints: number;
    coins: number;
    addPoints: (points: number) => void;
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean;
    purchase: (itemId: string) => PurchaseResult;
    hasStreakFreeze: boolean;
    forceFlush: () => Promise<void>;
    rank: number;
    rankTitle: string;

    // Favorites
    favorites: string[];
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;

    // Extensions & Themes (Store)
    myExtensions: Set<string>;
    unlockExtension: (id: string) => void;
    unlockedThemes: Set<Theme>;
    unlockTheme: (theme: Theme) => void;

    // Settings
    settings: AppSettings;
    updateSettings: (newSettings: AppSettings) => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;

    // Solved Quotes & Progress
    solvedQuotes: Set<string>;
    everClearedQuotes: Set<string>;
    isEverCleared: (id: string) => boolean;
    markQuoteSolved: (id: string, category: string) => void;
    isQuoteSolved: (id: string) => boolean;
    resetCategoryProgress: (category: string) => void;
    resetAllProgress: () => void;

    // Saved Games
    savedGames: Record<string, SavedGameState>;
    saveGameState: (genreId: string, state: SavedGameState) => void;
    clearGameState: (genreId: string) => void;

    // Statistics & Achievements
    stats: PlayerStats;
    recordGuess: (isCorrect: boolean) => void;
    recordPuzzleCompletion: (params: {
        quoteId?: string;
        category: string;
        timeSeconds: number;
        hintsUsed: number;
        mistakesCount: number;
        isDaily?: boolean;
        difficulty: string;
        score: number;
        coins: number;
        grade: SolveGrade;
        totalGuesses?: number;
        correctGuesses?: number;
        usedMasterKey?: boolean;
    }) => void;
    achievements: Achievement[];
    claimAchievement: (id: string) => void;

    // Blitz Mode
    updateBlitzHighScore: (score: number) => void;

    // Haptics & Feedback
    triggerHaptic: (type?: HapticType) => void;

    // Google Play Games & Leaderboards
    playGamesUser: PlayGamesUser;
    signInPlayGames: () => Promise<PlayGamesUser>;
    openPlayGamesLeaderboard: (leaderboardId?: string) => Promise<boolean>;

    // Theme & State
    isLoading: boolean;
    colors: ReturnType<typeof getTheme>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const FALLBACK_CONTEXT: GameContextType = {
    totalPoints: 0,
    coins: 50,
    addPoints: () => {},
    addCoins: () => {},
    spendCoins: () => false,
    purchase: () => 'INSUFFICIENT_FUNDS',
    hasStreakFreeze: false,
    forceFlush: async () => {},
    rank: 35,
    rankTitle: 'Novice Decryptor',
    favorites: [],
    toggleFavorite: () => {},
    isFavorite: () => false,
    myExtensions: new Set(),
    unlockExtension: () => {},
    unlockedThemes: new Set(['dark', 'light']),
    unlockTheme: () => {},
    settings: DEFAULT_SETTINGS,
    updateSettings: () => {},
    toggleTheme: () => {},
    setTheme: () => {},
    solvedQuotes: new Set(),
    everClearedQuotes: new Set(),
    isEverCleared: () => false,
    markQuoteSolved: () => {},
    isQuoteSolved: () => false,
    resetCategoryProgress: () => {},
    resetAllProgress: () => {},
    savedGames: {},
    saveGameState: () => {},
    clearGameState: () => {},
    stats: INITIAL_STATS,
    recordGuess: () => {},
    recordPuzzleCompletion: () => {},
    achievements: INITIAL_ACHIEVEMENTS,
    claimAchievement: () => {},
    updateBlitzHighScore: () => {},
    triggerHaptic: () => {},
    playGamesUser: { isAuthenticated: false, displayName: null },
    signInPlayGames: async () => ({ isAuthenticated: false, displayName: null }),
    openPlayGamesLeaderboard: async () => false,
    isLoading: false,
    colors: COLORS.dark,
};

export const useGame = () => {
    const context = useContext(GameContext);
    return context || FALLBACK_CONTEXT;
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true);

    // State
    const [totalPoints, setTotalPoints] = useState(0);
    const [coins, setCoins] = useState(INITIAL_COINS);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [myExtensions, setMyExtensions] = useState<Set<string>>(new Set());
    const [unlockedThemes, setUnlockedThemes] = useState<Set<Theme>>(new Set(DEFAULT_THEMES));
    const [solvedQuotes, setSolvedQuotes] = useState<Set<string>>(new Set());
    const [everClearedQuotes, setEverClearedQuotes] = useState<Set<string>>(new Set());
    const everClearedQuotesRef = useRef<Set<string>>(new Set());
    const [savedGames, setSavedGames] = useState<Record<string, SavedGameState>>({});
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
    const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
    const [playGamesUser, setPlayGamesUser] = useState<PlayGamesUser>({
        isAuthenticated: false,
        displayName: null,
    });

    const colors = getTheme(settings.theme);

    const isHydratedRef = useRef(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Synchronous mirrors so currency spends, inventory, and forceFlush cannot race
    // the React state queue.
    const coinsRef = useRef(INITIAL_COINS);
    const pointsRef = useRef(0);
    const themesRef = useRef<Set<Theme>>(new Set(DEFAULT_THEMES));
    const extensionsRef = useRef<Set<string>>(new Set());
    const favoritesRef = useRef<string[]>([]);
    const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
    const solvedQuotesRef = useRef<Set<string>>(new Set());
    const savedGamesRef = useRef<Record<string, SavedGameState>>({});
    const statsRef = useRef<PlayerStats>(INITIAL_STATS);
    const achievementsRef = useRef<Achievement[]>(INITIAL_ACHIEVEMENTS);
    const inFlightPurchaseRef = useRef(false);
    const lastPurchaseTimeRef = useRef<{ id: string; timestamp: number } | null>(null);


    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const STORAGE_KEYS = [
                    'brainCipherPoints',
                    'brainCipherCoins',
                    'brainCipherFavorites',
                    'brainCipherExtensions',
                    'brainCipherThemes',
                    'brainCipherSettings',
                    'brainCipherProgress',
                    'brainCipherEverCleared',
                    'brainCipherSavedGames',
                    'brainCipherStats',
                    'brainCipherAchievements'
                ];
                const entries = await AsyncStorage.multiGet(STORAGE_KEYS);
                const data = Object.fromEntries(entries);

                const storedPoints = data['brainCipherPoints'];
                const storedCoins = data['brainCipherCoins'];
                const storedFavorites = data['brainCipherFavorites'];
                const storedExtensions = data['brainCipherExtensions'];
                const storedThemes = data['brainCipherThemes'];
                const storedSettings = data['brainCipherSettings'];
                const storedProgress = data['brainCipherProgress'];
                const storedEverCleared = data['brainCipherEverCleared'];
                const storedSavedGames = data['brainCipherSavedGames'];
                const storedStats = data['brainCipherStats'];
                const storedAchievements = data['brainCipherAchievements'];

                if (storedPoints) {
                    const parsed = parseInt(storedPoints, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                        pointsRef.current = parsed;
                        setTotalPoints(parsed);
                    }
                }
                if (storedCoins) {
                    const parsed = parseInt(storedCoins, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                        coinsRef.current = parsed;
                        setCoins(parsed);
                    }
                }
                if (storedFavorites) {
                    try {
                        const parsed = JSON.parse(storedFavorites);
                        if (Array.isArray(parsed)) {
                            favoritesRef.current = parsed;
                            setFavorites(parsed);
                        }
                    } catch { }
                }
                if (storedExtensions) {
                    try {
                        const parsed = JSON.parse(storedExtensions);
                        if (Array.isArray(parsed)) {
                            const extSet = new Set<string>(parsed);
                            extensionsRef.current = extSet;
                            setMyExtensions(extSet);
                        }
                    } catch { }
                }
                if (storedThemes) {
                    try {
                        const parsed = JSON.parse(storedThemes);
                        if (Array.isArray(parsed)) {
                            const merged = new Set<Theme>([...DEFAULT_THEMES, ...parsed]);
                            themesRef.current = merged;
                            setUnlockedThemes(merged);
                        }
                    } catch { }
                }
                if (storedSettings) {
                    try {
                        const parsed = JSON.parse(storedSettings);
                        if (parsed && typeof parsed === 'object') {
                            const merged = { ...DEFAULT_SETTINGS, ...parsed };
                            settingsRef.current = merged;
                            setSettings(merged);
                        }
                    } catch { }
                }
                if (storedProgress) {
                    try {
                        const parsed = JSON.parse(storedProgress);
                        if (Array.isArray(parsed)) {
                            const solvedSet = new Set<string>(parsed);
                            solvedQuotesRef.current = solvedSet;
                            setSolvedQuotes(solvedSet);
                        }
                    } catch { }
                }
                const everClearedSet = new Set<string>();
                if (storedEverCleared) {
                    try {
                        const parsed = JSON.parse(storedEverCleared);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(id => {
                                if (typeof id === 'string') everClearedSet.add(id);
                            });
                        }
                    } catch { }
                }
                // Upgrade migration: seed already-solved puzzles into everCleared so nobody double-earns after upgrading
                if (storedProgress) {
                    try {
                        const parsedProgress = JSON.parse(storedProgress);
                        if (Array.isArray(parsedProgress)) {
                            parsedProgress.forEach(id => {
                                if (typeof id === 'string') everClearedSet.add(id);
                            });
                        }
                    } catch { }
                }
                everClearedQuotesRef.current = everClearedSet;
                setEverClearedQuotes(everClearedSet);
                if (storedSavedGames) {
                    try {
                        const parsed = JSON.parse(storedSavedGames);
                        if (parsed && typeof parsed === 'object') {
                            savedGamesRef.current = parsed;
                            setSavedGames(parsed);
                        }
                    } catch { }
                }
                if (storedStats) {
                    try {
                        const parsed = JSON.parse(storedStats);
                        if (parsed && typeof parsed === 'object') {
                            const merged = { ...INITIAL_STATS, ...parsed };
                            statsRef.current = merged;
                            setStats(merged);
                        }
                    } catch { }
                }
                if (storedAchievements) {
                    try {
                        const parsed: Achievement[] = JSON.parse(storedAchievements);
                        if (Array.isArray(parsed)) {
                            // Static definition fields (icon, title, description,
                            // category, target, rewardCoins) always come from code;
                            // only mutable progress is restored. Otherwise an old
                            // install keeps stale copy and iconography forever.
                            const merged = INITIAL_ACHIEVEMENTS.map(initial => {
                                const found = parsed.find(p => p.id === initial.id);
                                if (!found) return initial;
                                return {
                                    ...initial,
                                    progress: typeof found.progress === 'number' ? found.progress : 0,
                                    isUnlocked: found.isUnlocked === true,
                                    claimed: found.claimed === true,
                                };
                            });
                            achievementsRef.current = merged;
                            setAchievements(merged);
                        }
                    } catch { }
                }

            } catch (error) {
                console.error('Failed to load game data:', error);
            } finally {
                isHydratedRef.current = true;
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Force-flush persistence immediately bypassing debounce
    const forceFlush = useCallback(async (): Promise<void> => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        const batch: [string, string][] = [
            ['brainCipherPoints', pointsRef.current.toString()],
            ['brainCipherCoins', coinsRef.current.toString()],
            ['brainCipherFavorites', JSON.stringify(favoritesRef.current)],
            ['brainCipherExtensions', JSON.stringify(Array.from(extensionsRef.current))],
            ['brainCipherThemes', JSON.stringify(Array.from(themesRef.current))],
            ['brainCipherSettings', JSON.stringify(settingsRef.current)],
            ['brainCipherProgress', JSON.stringify(Array.from(solvedQuotesRef.current))],
            ['brainCipherEverCleared', JSON.stringify(Array.from(everClearedQuotesRef.current))],
            ['brainCipherSavedGames', JSON.stringify(savedGamesRef.current)],
            ['brainCipherStats', JSON.stringify(statsRef.current)],
            ['brainCipherAchievements', JSON.stringify(achievementsRef.current)],
        ];
        try {
            await AsyncStorage.multiSet(batch);
        } catch (err) {
            console.error('Failed to force-flush game data:', err);
        }
    }, []);

    const persistRef = useRef(forceFlush);
    persistRef.current = forceFlush;

    useEffect(() => {
        if (!isHydratedRef.current || isLoading) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            persistRef.current();
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [totalPoints, coins, favorites, myExtensions, unlockedThemes, settings, solvedQuotes, everClearedQuotes, savedGames, stats, achievements, isLoading]);

    // Flush immediately when Android backgrounds the process, otherwise up to
    // 500ms of progress can be lost and background JS timers may never fire.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'background' && nextAppState !== 'inactive') return;
            if (!isHydratedRef.current) return;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            persistRef.current();
        });
        return () => subscription.remove();
    }, []);

    // Haptic feedback engine
    const triggerHaptic = useCallback((type: HapticType = 'light') => {
        triggerTactileHaptic(type, settings.hapticsEnabled);
    }, [settings.hapticsEnabled]);

    // Economy Actions
    // Side effects (leaderboard submission, haptics) live outside the state
    // updaters so a re-invoked updater cannot double-award anything.
    const addPoints = (points: number) => {
        if (!Number.isFinite(points) || points === 0) return;
        const next = Math.max(0, pointsRef.current + points);
        pointsRef.current = next;
        setTotalPoints(next);
        playGamesService.submitScore(next, PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ);
    };

    const addCoins = (amount: number) => {
        if (!Number.isFinite(amount) || amount === 0) return;
        coinsRef.current += amount;
        setCoins(coinsRef.current);
        triggerHaptic('success');
    };

    const spendCoins = (amount: number): boolean => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        if (coinsRef.current < amount) return false;
        coinsRef.current -= amount;
        setCoins(coinsRef.current);
        triggerHaptic('medium');
        return true;
    };

    const checkThemeAchievements = useCallback((paidThemeCount: number) => {
        setAchievements(prev => {
            const next = prev.map(ach => {
                if (ach.id === 'theme_collector' && !ach.isUnlocked) {
                    return {
                        ...ach,
                        progress: paidThemeCount,
                        isUnlocked: paidThemeCount >= ach.target
                    };
                }
                return ach;
            });
            achievementsRef.current = next;
            return next;
        });
    }, []);

    // purchase(itemId) - the single, atomic entry point for all coin spending
    const purchase = useCallback((itemId: string): PurchaseResult => {
        const item = getShopItem(itemId);
        if (!item) {
            return 'UNKNOWN_ITEM';
        }

        if (item.requiresUnlock && !item.requiresUnlock({ coins: coinsRef.current, stats: statsRef.current })) {
            return 'NOT_UNLOCKED';
        }

        // Safe against double-tap: reject if in-flight or rapid duplicate tap on same item (<400ms)
        const now = Date.now();
        if (inFlightPurchaseRef.current) {
            return 'ALREADY_OWNED';
        }
        if (lastPurchaseTimeRef.current?.id === item.id && (now - lastPurchaseTimeRef.current.timestamp < 400)) {
            return 'ALREADY_OWNED';
        }

        // Already owned check for non-repeatable items
        if (!item.repeatable) {
            if (item.kind === 'extension') {
                const extId = item.payload.extensionId;
                if (extensionsRef.current.has(extId)) {
                    return 'ALREADY_OWNED';
                }
            } else if (item.kind === 'theme') {
                const th = item.payload.theme;
                if (themesRef.current.has(th)) {
                    return 'ALREADY_OWNED';
                }
            } else if (item.id === 'streak_freeze') {
                if (statsRef.current.hasStreakFreeze) {
                    return 'ALREADY_OWNED';
                }
            }
        }

        // Atomic balance check and deduction - never a negative balance
        if (coinsRef.current < item.price) {
            return 'INSUFFICIENT_FUNDS';
        }

        inFlightPurchaseRef.current = true;
        lastPurchaseTimeRef.current = { id: item.id, timestamp: now };

        coinsRef.current -= item.price;
        setCoins(coinsRef.current);

        // Apply effect
        if (item.kind === 'extension') {
            const extId = item.payload.extensionId;
            const next = new Set(extensionsRef.current).add(extId);
            extensionsRef.current = next;
            setMyExtensions(next);
        } else if (item.kind === 'theme') {
            const th = item.payload.theme;
            const next = new Set(themesRef.current).add(th);
            themesRef.current = next;
            setUnlockedThemes(next);
            checkThemeAchievements(PAID_THEMES.filter(paid => next.has(paid)).length);
        } else if (item.id === 'streak_freeze') {
            const nextStats: PlayerStats = { ...statsRef.current, hasStreakFreeze: true };
            statsRef.current = nextStats;
            setStats(nextStats);
        }

        // Force-flush persistence immediately (bypasses 500ms debounce)
        forceFlush().finally(() => {
            inFlightPurchaseRef.current = false;
        });

        triggerHaptic('success');
        return 'OK';
    }, [forceFlush, triggerHaptic, checkThemeAchievements]);

    // Favorites Actions
    const toggleFavorite = (id: string) => {
        const isFav = favorites.includes(id);
        const next = isFav ? favorites.filter(fid => fid !== id) : [...favorites, id];
        favoritesRef.current = next;
        setFavorites(next);
        triggerHaptic('light');
    };

    const isFavorite = (id: string) => favorites.includes(id);

    // Extensions & Themes
    const unlockExtension = (id: string) => {
        if (!extensionsRef.current.has(id)) {
            const next = new Set(extensionsRef.current).add(id);
            extensionsRef.current = next;
            setMyExtensions(next);
            forceFlush();
        }
        triggerHaptic('success');
    };

    const unlockTheme = (theme: Theme) => {
        // Use the synchronous mirror so unlocking several themes in one batch
        // accumulates instead of each call overwriting the previous one.
        const next = new Set(themesRef.current).add(theme);
        themesRef.current = next;
        setUnlockedThemes(next);
        // Only paid themes count toward "Aesthetic Elite"; dark/light are free.
        checkThemeAchievements(PAID_THEMES.filter(paid => next.has(paid)).length);
        triggerHaptic('success');
    };

    // Settings
    const updateSettings = (newSettings: AppSettings) => {
        settingsRef.current = newSettings;
        setSettings(newSettings);
        triggerHaptic('light');
    };

    const setTheme = (newTheme: Theme) => {
        const next = { ...settingsRef.current, theme: newTheme };
        settingsRef.current = next;
        setSettings(next);
        triggerHaptic('light');
    };

    const toggleTheme = () => {
        const nextTheme = settingsRef.current.theme === 'dark' ? 'light' : 'dark';
        const next = { ...settingsRef.current, theme: nextTheme as Theme };
        settingsRef.current = next;
        setSettings(next);
        triggerHaptic('light');
    };

    // Solved & Progress
    const markQuoteSolved = (id: string, category: string) => {
        setSolvedQuotes(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
        clearGameState(category);
    };

    const isQuoteSolved = (id: string) => solvedQuotes.has(id);
    const isEverCleared = (id: string) => everClearedQuotesRef.current.has(id);

    const saveGameState = (genreId: string, state: SavedGameState) => {
        setSavedGames(prev => ({ ...prev, [genreId]: state }));
    };

    const clearGameState = (genreId: string) => {
        setSavedGames(prev => {
            if (!prev[genreId]) return prev;
            const next = { ...prev };
            delete next[genreId];
            return next;
        });
    };

    const resetCategoryProgress = (category: string) => {
        setSolvedQuotes(prev => {
            const newSet = new Set(prev);
            const prefix = `${category}-`;
            const categoryIds = new Set(getCategoryQuoteIds(category));
            for (const id of newSet) {
                if (id.startsWith(prefix) || categoryIds.has(id)) {
                    newSet.delete(id);
                }
            }
            return newSet;
        });
        clearGameState(category);
        triggerHaptic('medium');
    };

    const resetAllProgress = () => {
        const freshStats: PlayerStats = { ...INITIAL_STATS, hasStreakFreeze: false };
        setSolvedQuotes(new Set());
        solvedQuotesRef.current = new Set();
        setSavedGames({});
        savedGamesRef.current = {};
        setTotalPoints(0);
        pointsRef.current = 0;
        setStats(freshStats);
        statsRef.current = freshStats;
        setCoins(INITIAL_COINS);
        coinsRef.current = INITIAL_COINS;
        setFavorites([]);
        favoritesRef.current = [];
        setMyExtensions(new Set());
        extensionsRef.current = new Set();
        const themes = new Set<Theme>(DEFAULT_THEMES);
        themesRef.current = themes;
        setUnlockedThemes(themes);
        const freshAchievements = INITIAL_ACHIEVEMENTS.map(achievement => ({ ...achievement }));
        setAchievements(freshAchievements);
        achievementsRef.current = freshAchievements;
        // Separate feature key so the daily knowledge modal can show again.
        AsyncStorage.removeItem('brainCipherLastDailyQuoteDate').catch(() => {});
        forceFlush();
        triggerHaptic('heavy');
    };

    // Stats & Live Accuracy
    const recordGuess = (isCorrect: boolean) => {
        setStats(prev => {
            const next = {
                ...prev,
                totalGuesses: prev.totalGuesses + 1,
                correctGuesses: isCorrect ? prev.correctGuesses + 1 : prev.correctGuesses
            };
            statsRef.current = next;
            return next;
        });
    };

    // Full Completion Tracker
    const recordPuzzleCompletion = (params: {
        quoteId?: string;
        category: string;
        timeSeconds: number;
        hintsUsed: number;
        mistakesCount: number;
        isDaily?: boolean;
        difficulty: string;
        score: number;
        coins: number;
        grade: SolveGrade;
        totalGuesses?: number;
        correctGuesses?: number;
        usedMasterKey?: boolean;
    }) => {
        // Enforce first-clear-only rule:
        // A replay (or re-solve after category reset) awards 0 coins and must NOT
        // increment global solved counters, streaks, or achievement progress.
        if (params.quoteId && everClearedQuotesRef.current.has(params.quoteId)) {
            return;
        }

        // Record puzzle in ever-cleared ledger on first clear
        if (params.quoteId) {
            everClearedQuotesRef.current.add(params.quoteId);
            setEverClearedQuotes(prev => {
                if (prev.has(params.quoteId!)) return prev;
                const next = new Set(prev);
                next.add(params.quoteId!);
                return next;
            });
        }

        const today = todayKey();

        // Resolve the streak once from the current snapshot so stats and the
        // streak achievements use exactly the same value.
        const { newStreak, dailyDates, streakFreezeConsumed } = computeStreak(statsRef.current, today, params.isDaily, params.usedMasterKey);

        setStats(prev => {
            const bestTimes = { ...prev.bestTimes };
            // Master key solves must not count toward fastest solve records
            if (!params.usedMasterKey && (!bestTimes[params.category] || params.timeSeconds < bestTimes[params.category])) {
                bestTimes[params.category] = params.timeSeconds;
            }

            const nextStats: PlayerStats = {
                ...prev,
                puzzlesSolved: prev.puzzlesSolved + 1,
                bestTimes,
                currentStreak: newStreak,
                maxStreak: Math.max(prev.maxStreak, newStreak),
                lastSolvedDate: (params.isDaily && !params.usedMasterKey) ? today : (params.isDaily ? (prev.lastSolvedDate || today) : prev.lastSolvedDate),
                totalPlayTimeSeconds: prev.totalPlayTimeSeconds + params.timeSeconds,
                dailySolvedDates: dailyDates,
                totalGuesses: prev.totalGuesses + (params.totalGuesses ?? 0),
                correctGuesses: prev.correctGuesses + (params.correctGuesses ?? 0),
                hasStreakFreeze: streakFreezeConsumed ? false : prev.hasStreakFreeze,
            };
            statsRef.current = nextStats;
            return nextStats;
        });

        // Award points & coins
        addPoints(params.score);
        addCoins(params.coins);

        // Effective solved set including current quoteId if supplied
        const effectiveSolved = params.quoteId
            ? new Set(solvedQuotes).add(params.quoteId)
            : solvedQuotes;

        // Check Achievements
        setAchievements(prev => prev.map(ach => {
            let newProgress = ach.progress;
            let unlocked = ach.isUnlocked;

            switch (ach.id) {
                case 'first_cipher':
                    newProgress = Math.min(1, newProgress + 1);
                    break;
                case 'scholar_10':
                case 'mastermind_50':
                case 'centurion_100':
                    newProgress += 1;
                    break;
                case 'clean_solve':
                    if (!params.usedMasterKey && params.hintsUsed === 0 && params.mistakesCount === 0) newProgress = 1;
                    break;
                case 'flawless_5':
                    if (!params.usedMasterKey && params.hintsUsed === 0 && params.mistakesCount === 0) newProgress += 1;
                    break;
                case 'speed_demon':
                    if (!params.usedMasterKey && params.timeSeconds <= 30) newProgress = 1;
                    break;
                case 'lightning_fast':
                    if (!params.usedMasterKey && params.timeSeconds <= 15) newProgress = 1;
                    break;
                case 'daily_starter':
                    if (!params.usedMasterKey && params.isDaily) newProgress = 1;
                    break;
                case 'streak_7':
                case 'streak_30':
                    if (params.isDaily && !params.usedMasterKey) newProgress = Math.max(newProgress, newStreak);
                    break;
                case 'legendary_solver':
                    if (!params.usedMasterKey && params.difficulty === 'Legendary' && params.hintsUsed === 0) newProgress = 1;
                    break;
                case 'subject_master_1':
                case 'polymath_3':
                case 'omniscient_8': {
                    const allTracks = TRACKS;
                    const completed = allTracks.filter(t => isTrackComplete(t.id, effectiveSolved)).length;
                    newProgress = completed;
                    break;
                }

            }

            unlocked = newProgress >= ach.target;
            return {
                ...ach,
                progress: newProgress,
                isUnlocked: unlocked
            };
        }));
    };

    const claimAchievement = (id: string) => {
        // Read the claim target first, then spend the state update and the coin
        // grant separately so neither can run twice from a re-invoked updater.
        const target = achievements.find(ach => ach.id === id);
        if (!target || !target.isUnlocked || target.claimed) return;
        setAchievements(prev => prev.map(ach => ach.id === id ? { ...ach, claimed: true } : ach));
        addCoins(target.rewardCoins);
        triggerHaptic('success');
    };

    const updateBlitzHighScore = (newScore: number) => {
        setStats(prev => ({
            ...prev,
            blitzHighScore: Math.max(prev.blitzHighScore, newScore)
        }));
        playGamesService.submitScore(newScore, PLAY_GAMES_CONFIG.LEADERBOARDS.BLITZ_RUSH_HIGH_SCORE);
        if (newScore >= 1000) {
            setAchievements(prev => prev.map(ach => ach.id === 'blitz_master' ? { ...ach, progress: 1, isUnlocked: true } : ach));
        }
    };

    // Google Play Games Direct Sign-In on app mount (after hydration). Guarded so
    // it runs once even though it reads the latest totalPoints.
    const didSignInRef = useRef(false);
    useEffect(() => {
        let isMounted = true;
        if (!isHydratedRef.current || isLoading || didSignInRef.current) return;
        didSignInRef.current = true;
        playGamesService.directSignIn().then(user => {
            if (!isMounted) return;
            setPlayGamesUser(user);
            if (user.isAuthenticated && pointsRef.current > 0) {
                playGamesService.submitScore(pointsRef.current, PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ);
            }
        }).catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [isLoading, totalPoints]);

    const signInPlayGames = useCallback(async (): Promise<PlayGamesUser> => {
        const user = await playGamesService.directSignIn();
        setPlayGamesUser(user);
        if (user.isAuthenticated && totalPoints > 0) {
            playGamesService.submitScore(totalPoints, PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ);
        }
        return user;
    }, [totalPoints]);

    const openPlayGamesLeaderboard = useCallback(async (leaderboardId?: string): Promise<boolean> => {
        return await playGamesService.showLeaderboard(leaderboardId);
    }, []);

    // Dynamic Rank & Title Calculation
    const getRankTitle = (pts: number): { rank: number; title: string } => {
        if (pts >= 25000) return { rank: 1, title: 'Omniscient Cipher' };
        if (pts >= 18000) return { rank: 2, title: 'Grandmaster Decryptor' };
        if (pts >= 12000) return { rank: 3, title: 'Master Cryptanalyst' };
        if (pts >= 8000) return { rank: 5, title: 'Senior Enigma Breaker' };
        if (pts >= 5000) return { rank: 8, title: 'Codebreaker Specialist' };
        if (pts >= 3000) return { rank: 12, title: 'Adept Solver' };
        if (pts >= 1500) return { rank: 18, title: 'Crypto Analyst' };
        if (pts >= 500) return { rank: 25, title: 'Cipher Apprentice' };
        return { rank: 35, title: 'Novice Decryptor' };
    };

    const { rank, title: rankTitle } = getRankTitle(totalPoints);

    const contextValue: GameContextType = {
        totalPoints,
        coins,
        addPoints,
        addCoins,
        spendCoins,
        purchase,
        hasStreakFreeze: Boolean(stats.hasStreakFreeze),
        forceFlush,
        rank,
        rankTitle,
        favorites,
        toggleFavorite,
        isFavorite,
        myExtensions,
        unlockExtension,
        unlockedThemes,
        unlockTheme,
        settings,
        updateSettings,
        toggleTheme,
        setTheme,
        solvedQuotes,
        everClearedQuotes,
        isEverCleared,
        markQuoteSolved,
        isQuoteSolved,
        resetCategoryProgress,
        resetAllProgress,
        savedGames,
        saveGameState,
        clearGameState,
        stats,
        recordGuess,
        recordPuzzleCompletion,
        achievements,
        claimAchievement,
        updateBlitzHighScore,
        triggerHaptic,
        playGamesUser,
        signInPlayGames,
        openPlayGamesLeaderboard,
        isLoading,
        colors,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
