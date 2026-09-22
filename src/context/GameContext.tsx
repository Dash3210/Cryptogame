import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, SavedGameState, PlayerStats, Achievement, Theme, SolveGrade } from '../types';
import { getTheme, COLORS } from '../styles/theme';
import { SUBJECTS, EXTENSIONS } from '../data/quotes';
import { isGenreComplete } from '../services/quoteService';
import { HapticType, triggerTactileHaptic } from '../utils/physics';
import { playGamesService, PlayGamesUser, PLAY_GAMES_CONFIG } from '../services/playGamesService';
import { daysBetweenKeys, todayKey } from '../utils/date';

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
    dailySolvedDates: []
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
    { id: 'first_cipher', icon: '🌱', title: 'First Contact', description: 'Solve your first cryptogram', category: 'special', target: 1, progress: 0, isUnlocked: false, rewardCoins: 25, claimed: false },
    { id: 'scholar_10', icon: '📖', title: 'Scholar', description: 'Solve 10 cryptograms', category: 'mastery', target: 10, progress: 0, isUnlocked: false, rewardCoins: 60, claimed: false },
    { id: 'mastermind_50', icon: '🧠', title: 'Mastermind', description: 'Solve 50 cryptograms across all genres', category: 'mastery', target: 50, progress: 0, isUnlocked: false, rewardCoins: 200, claimed: false },
    { id: 'centurion_100', icon: '🏛️', title: 'Enigma Centurion', description: 'Solve 100 total puzzles', category: 'mastery', target: 100, progress: 0, isUnlocked: false, rewardCoins: 500, claimed: false },
    { id: 'clean_solve', icon: '✨', title: 'Pure Insight', description: 'Solve a puzzle with 0 hints and 0 mistakes', category: 'accuracy', target: 1, progress: 0, isUnlocked: false, rewardCoins: 50, claimed: false },
    { id: 'flawless_5', icon: '🎯', title: 'Flawless Decryptor', description: 'Solve 5 puzzles with 0 mistakes', category: 'accuracy', target: 5, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', description: 'Solve a puzzle in under 30 seconds', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 60, claimed: false },
    { id: 'lightning_fast', icon: '⏱️', title: 'Lightning Reflexes', description: 'Solve a puzzle in under 15 seconds', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'daily_starter', icon: '📅', title: 'Daily Dedication', description: 'Solve your first Daily Cipher challenge', category: 'streaks', target: 1, progress: 0, isUnlocked: false, rewardCoins: 40, claimed: false },
    { id: 'streak_7', icon: '🔥', title: 'Week of Brilliance', description: 'Maintain a 7-day Daily Cipher streak', category: 'streaks', target: 7, progress: 0, isUnlocked: false, rewardCoins: 200, claimed: false },
    { id: 'streak_30', icon: '👑', title: 'Unbreakable Will', description: 'Reach a 30-day Daily Cipher streak', category: 'streaks', target: 30, progress: 0, isUnlocked: false, rewardCoins: 600, claimed: false },
    { id: 'polymath_3', icon: '🎓', title: 'Polymath', description: 'Master all puzzles in 3 distinct subjects', category: 'mastery', target: 3, progress: 0, isUnlocked: false, rewardCoins: 150, claimed: false },
    { id: 'omniscient_all', icon: '🌌', title: 'Omniscient Mind', description: 'Master all subjects in the library', category: 'mastery', target: 7, progress: 0, isUnlocked: false, rewardCoins: 400, claimed: false },
    { id: 'legendary_solver', icon: '⚔️', title: 'Legendary Decryptor', description: 'Solve a Legendary difficulty puzzle', category: 'special', target: 1, progress: 0, isUnlocked: false, rewardCoins: 100, claimed: false },
    { id: 'blitz_master', icon: '🚀', title: 'Blitz Overdrive', description: 'Score 1,000+ points in Blitz Rush mode', category: 'speed', target: 1, progress: 0, isUnlocked: false, rewardCoins: 120, claimed: false },
    { id: 'theme_collector', icon: '🎨', title: 'Aesthetic Elite', description: 'Unlock 3 custom themes in the Store', category: 'special', target: 3, progress: 0, isUnlocked: false, rewardCoins: 100, claimed: false },
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
    isDaily: boolean | undefined
): { newStreak: number; dailyDates: string[] } {
    let newStreak = prev.currentStreak;
    const dailyDates = [...prev.dailySolvedDates];
    if (isDaily && !dailyDates.includes(today)) {
        dailyDates.push(today);
        if (prev.lastSolvedDate) {
            const diffDays = daysBetweenKeys(prev.lastSolvedDate, today);
            if (diffDays === 1) {
                newStreak += 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }
    }
    return { newStreak, dailyDates };
}

interface GameContextType {
    // Points & Economy
    totalPoints: number;
    coins: number;
    addPoints: (points: number) => void;
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean;
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

    // Synchronous mirrors so currency spends and theme unlocks cannot race the
    // React state queue (two confirmations in the same tick used to both pass).
    const coinsRef = useRef(INITIAL_COINS);
    const pointsRef = useRef(0);
    const themesRef = useRef<Set<Theme>>(new Set(DEFAULT_THEMES));


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
                        if (Array.isArray(parsed)) setFavorites(parsed);
                    } catch { }
                }
                if (storedExtensions) {
                    try {
                        const parsed = JSON.parse(storedExtensions);
                        if (Array.isArray(parsed)) setMyExtensions(new Set(parsed));
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
                            setSettings(prev => ({ ...prev, ...parsed }));
                        }
                    } catch { }
                }
                if (storedProgress) {
                    try {
                        const parsed = JSON.parse(storedProgress);
                        if (Array.isArray(parsed)) setSolvedQuotes(new Set(parsed));
                    } catch { }
                }
                if (storedSavedGames) {
                    try {
                        const parsed = JSON.parse(storedSavedGames);
                        if (parsed && typeof parsed === 'object') setSavedGames(parsed);
                    } catch { }
                }
                if (storedStats) {
                    try {
                        const parsed = JSON.parse(storedStats);
                        if (parsed && typeof parsed === 'object') {
                            setStats(prev => ({ ...prev, ...parsed }));
                        }
                    } catch { }
                }
                if (storedAchievements) {
                    try {
                        const parsed: Achievement[] = JSON.parse(storedAchievements);
                        if (Array.isArray(parsed)) {
                            // Merge with INITIAL_ACHIEVEMENTS to handle any newly added achievements
                            const merged = INITIAL_ACHIEVEMENTS.map(initial => {
                                const found = parsed.find(p => p.id === initial.id);
                                return found ? { ...initial, ...found } : initial;
                            });
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

    // Debounced Batch Persistence Effect (prevents keystroke I/O thrashing)
    const persist = useCallback(() => {
        const batch: [string, string][] = [
            ['brainCipherPoints', totalPoints.toString()],
            ['brainCipherCoins', coins.toString()],
            ['brainCipherFavorites', JSON.stringify(favorites)],
            ['brainCipherExtensions', JSON.stringify(Array.from(myExtensions))],
            ['brainCipherThemes', JSON.stringify(Array.from(unlockedThemes))],
            ['brainCipherSettings', JSON.stringify(settings)],
            ['brainCipherProgress', JSON.stringify(Array.from(solvedQuotes))],
            ['brainCipherSavedGames', JSON.stringify(savedGames)],
            ['brainCipherStats', JSON.stringify(stats)],
            ['brainCipherAchievements', JSON.stringify(achievements)],
        ];
        AsyncStorage.multiSet(batch).catch(err => {
            console.error('Failed to batch persist game data:', err);
        });
    }, [totalPoints, coins, favorites, myExtensions, unlockedThemes, settings, solvedQuotes, savedGames, stats, achievements]);

    const persistRef = useRef(persist);
    persistRef.current = persist;

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
    }, [persist, isLoading]);

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

    // Favorites Actions
    const toggleFavorite = (id: string) => {
        const isFav = favorites.includes(id);
        setFavorites(isFav ? favorites.filter(fid => fid !== id) : [...favorites, id]);
        triggerHaptic('light');
    };

    const isFavorite = (id: string) => favorites.includes(id);

    // Extensions & Themes
    const unlockExtension = (id: string) => {
        if (!myExtensions.has(id)) {
            setMyExtensions(new Set(myExtensions).add(id));
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

    const checkThemeAchievements = (paidThemeCount: number) => {
        setAchievements(prev => prev.map(ach => {
            if (ach.id === 'theme_collector' && !ach.isUnlocked) {
                return {
                    ...ach,
                    progress: paidThemeCount,
                    isUnlocked: paidThemeCount >= ach.target
                };
            }
            return ach;
        }));
    };

    // Settings
    const updateSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        triggerHaptic('light');
    };

    const setTheme = (newTheme: Theme) => {
        setSettings(prev => ({ ...prev, theme: newTheme }));
        triggerHaptic('light');
    };

    const toggleTheme = () => {
        setSettings(prev => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark'
        }));
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
            for (const id of newSet) {
                if (id.startsWith(prefix)) {
                    newSet.delete(id);
                }
            }
            return newSet;
        });
        clearGameState(category);
        triggerHaptic('medium');
    };

    const resetAllProgress = () => {
        setSolvedQuotes(new Set());
        setSavedGames({});
        setTotalPoints(0);
        pointsRef.current = 0;
        setStats(INITIAL_STATS);
        setCoins(INITIAL_COINS);
        coinsRef.current = INITIAL_COINS;
        setFavorites([]);
        setMyExtensions(new Set());
        const themes = new Set<Theme>(DEFAULT_THEMES);
        themesRef.current = themes;
        setUnlockedThemes(themes);
        setAchievements(INITIAL_ACHIEVEMENTS.map(achievement => ({ ...achievement })));
        // Separate feature key so the daily knowledge modal can show again.
        AsyncStorage.removeItem('brainCipherLastDailyQuoteDate').catch(() => {});
        triggerHaptic('heavy');
    };

    // Stats & Live Accuracy
    const recordGuess = (isCorrect: boolean) => {
        setStats(prev => ({
            ...prev,
            totalGuesses: prev.totalGuesses + 1,
            correctGuesses: isCorrect ? prev.correctGuesses + 1 : prev.correctGuesses
        }));
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
    }) => {
        const today = todayKey();

        // Resolve the streak once from the current snapshot so stats and the
        // streak achievements use exactly the same value.
        const { newStreak, dailyDates } = computeStreak(stats, today, params.isDaily);

        setStats(prev => {
            const bestTimes = { ...prev.bestTimes };
            if (!bestTimes[params.category] || params.timeSeconds < bestTimes[params.category]) {
                bestTimes[params.category] = params.timeSeconds;
            }

            return {
                ...prev,
                puzzlesSolved: prev.puzzlesSolved + 1,
                bestTimes,
                currentStreak: newStreak,
                maxStreak: Math.max(prev.maxStreak, newStreak),
                lastSolvedDate: params.isDaily ? today : prev.lastSolvedDate,
                totalPlayTimeSeconds: prev.totalPlayTimeSeconds + params.timeSeconds,
                dailySolvedDates: dailyDates,
                totalGuesses: prev.totalGuesses + (params.totalGuesses ?? 0),
                correctGuesses: prev.correctGuesses + (params.correctGuesses ?? 0),
            };
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
                    if (params.hintsUsed === 0 && params.mistakesCount === 0) newProgress = 1;
                    break;
                case 'flawless_5':
                    if (params.hintsUsed === 0 && params.mistakesCount === 0) newProgress += 1;
                    break;
                case 'speed_demon':
                    if (params.timeSeconds <= 30) newProgress = 1;
                    break;
                case 'lightning_fast':
                    if (params.timeSeconds <= 15) newProgress = 1;
                    break;
                case 'daily_starter':
                    if (params.isDaily) newProgress = 1;
                    break;
                case 'streak_7':
                case 'streak_30':
                    if (params.isDaily) newProgress = Math.max(newProgress, newStreak);
                    break;
                case 'legendary_solver':
                    if (params.difficulty === 'Legendary' && params.hintsUsed === 0) newProgress = 1;
                    break;
                case 'polymath_3': {
                    const allGenres = [...SUBJECTS, ...EXTENSIONS];
                    const completed = allGenres.filter(g => isGenreComplete(g.id, effectiveSolved)).length;
                    newProgress = completed;
                    break;
                }
                case 'omniscient_all': {
                    const completed = SUBJECTS.filter(g => isGenreComplete(g.id, effectiveSolved)).length;
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
        if (!isHydratedRef.current || isLoading || didSignInRef.current) return;
        didSignInRef.current = true;
        playGamesService.directSignIn().then(user => {
            setPlayGamesUser(user);
            if (user.isAuthenticated && pointsRef.current > 0) {
                playGamesService.submitScore(pointsRef.current, PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ);
            }
        }).catch(() => {});
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
