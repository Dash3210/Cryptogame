import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, AppState, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { Header, PuzzleBoard, VirtualKeyboard, FrequencyBar, WinCelebrationModal, Icon } from '../components';
import {
    generateCipher,
    isSolved,
    prepareGameData,
    generateHints,
    getNextUnsolvedIndex,
    getPreviousCellIndex,
    getLetterFrequencies,
    calculateAccuracy,
    getComboMultiplier,
    calculateCoinReward
} from '../utils/cipher';
import { getNextQuote, getDailyQuote, getRandomBlitzQuote } from '../services/quoteService';
import { todayKey } from '../utils/date';
import { adService } from '../services/adService';
import { GameStatus, LevelData, CellData, GameMode, SolveGrade, CoinRewardBreakdown } from '../types';
import { useGame } from '../context/GameContext';

type GameScreenRouteProp = RouteProp<{
    Game: {
        genreId: string;
        mode?: GameMode;
        dateStr?: string;
    }
}, 'Game'>;

const GENRE_LABELS: Record<string, string> = {
    biology: 'Biology',
    physics: 'Physics',
    chemistry: 'Chemistry',
    astronomy: 'Astronomy',
    geography: 'Geography',
    history: 'History',
    literature: 'Literature',
    compsci: 'Comp Sci',
    anatomy: 'Anatomy',
    music: 'Music Theory',
    economics: 'Economics',
    mythology: 'Mythology',
    daily: 'Daily Cipher',
    blitz: 'Blitz Rush',
};

export const GameScreen = () => {
    const route = useRoute<GameScreenRouteProp>();
    const navigation = useNavigation<any>();
    const { genreId = 'biology', mode = 'standard', dateStr } = route.params || {};

    const {
        solvedQuotes,
        settings,
        markQuoteSolved,
        savedGames,
        saveGameState,
        resetCategoryProgress,
        stats,
        colors,
        recordPuzzleCompletion,
        updateBlitzHighScore,
        triggerHaptic,
        addCoins,
    } = useGame();

    const genreLabel = GENRE_LABELS[genreId] || genreId;

    const [status, setStatus] = useState<'playing' | 'won' | 'completed'>('playing');
    const [quoteData, setQuoteData] = useState<LevelData | null>(null);
    const [cipherMap, setCipherMap] = useState<Record<string, string>>({});
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
    const usedLetters = useMemo(() => new Set<string>(Object.values(userMap)), [userMap]);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [mistakes, setMistakes] = useState<string[]>([]);
    const [freeHints, setFreeHints] = useState(2);
    const [timer, setTimer] = useState(0);
    const [isAdPaused, setIsAdPaused] = useState(false);
    // A replayed daily cipher is a practice run: it is graded but pays nothing.
    const [isPracticeRun, setIsPracticeRun] = useState(false);
    const [showFrequencyBar, setShowFrequencyBar] = useState(settings.showFrequencyBar);

    // Gamer Metrics: Combo, Accuracy & Score
    const [comboCount, setComboCount] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Results state
    const [earnedScore, setEarnedScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [coinsEarned, setCoinsEarned] = useState(0);
    const [coinReward, setCoinReward] = useState<CoinRewardBreakdown | null>(null);
    const [solveGrade, setSolveGrade] = useState<{ grade: SolveGrade; title: string; stars: number }>({
        grade: 'D',
        title: 'Cipher Apprentice',
        stars: 1
    });
    const [accuracyPercent, setAccuracyPercent] = useState(0);

    // Blitz mode specific: blitz total score and solved quotes counter
    const [blitzScore, setBlitzScore] = useState(0);
    const [blitzSolves, setBlitzSolves] = useState(0);
    const [blitzTimeLeft, setBlitzTimeLeft] = useState(90);

    // Stable refs so mount/background effects never need unstable callbacks in
    // their dependency arrays.
    const initLevelRef = useRef<(solvedOverride?: Set<string>) => void>(() => {});
    const saveGameStateRef = useRef(saveGameState);
    saveGameStateRef.current = saveGameState;

    // State Ref for background saving
    const gameStateRef = useRef({
        status, quoteData, userMap, cipherMap, timer, hintsUsed, freeHints, mistakes, totalCount, correctCount
    });

    useEffect(() => {
        gameStateRef.current = {
            status, quoteData, userMap, cipherMap, timer, hintsUsed, freeHints, mistakes, totalCount, correctCount
        };
    }, [status, quoteData, userMap, cipherMap, timer, hintsUsed, freeHints, mistakes, totalCount, correctCount]);

    // Derived Selection State
    const selectedCipherChar = useMemo(() => {
        if (selectedCellIndex === null || !quoteData) return null;
        const cellChar = quoteData.text[selectedCellIndex]?.toUpperCase();
        return (cellChar && /[A-Z]/.test(cellChar)) ? cipherMap[cellChar] || null : null;
    }, [selectedCellIndex, quoteData, cipherMap]);

    // Letter Frequency List
    const frequencies = useMemo(() => {
        if (!quoteData || !cipherMap) return [];
        return getLetterFrequencies(quoteData.text, cipherMap, userMap);
    }, [quoteData, cipherMap, userMap]);

    // Combo Multiplier (single source of truth shared with the scoring engine)
    const comboMultiplier = useMemo(() => getComboMultiplier(comboCount), [comboCount]);

    // Initialize Level
    useEffect(() => {
        initLevelRef.current();

        return () => {
            adService.cancelPendingReward();
            const state = gameStateRef.current;
            if (state.status === 'playing' && state.quoteData && mode === 'standard') {
                saveGameStateRef.current(genreId, {
                    quoteId: state.quoteData.id || `${genreId}-${state.quoteData.author}`,
                    userMap: state.userMap,
                    cipherMap: state.cipherMap,
                    timer: state.timer,
                    hintsUsed: state.hintsUsed,
                    freeHints: state.freeHints,
                    mistakes: state.mistakes,
                    totalGuesses: state.totalCount,
                    correctGuesses: state.correctCount,
                    mode,
                });
            }
        };
        // Mount/unmount only; the latest initLevel and saveGameState are read via refs.
    }, [genreId, mode]);

    // Backgrounding auto-save
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/)) {
                const state = gameStateRef.current;
                if (state.status === 'playing' && state.quoteData && mode === 'standard') {
                    saveGameStateRef.current(genreId, {
                        quoteId: state.quoteData.id || `${genreId}-${state.quoteData.author}`,
                        userMap: state.userMap,
                        cipherMap: state.cipherMap,
                        timer: state.timer,
                        hintsUsed: state.hintsUsed,
                        freeHints: state.freeHints,
                        mistakes: state.mistakes,
                        totalGuesses: state.totalCount,
                        correctGuesses: state.correctCount,
                        mode,
                    });
                }
            }
        });

        return () => subscription.remove();
    }, [genreId, mode]);

    const blitzScoreRef = useRef(blitzScore);
    useEffect(() => {
        blitzScoreRef.current = blitzScore;
    }, [blitzScore]);

    // Remember recently served Blitz definitions so the same cipher cannot
    // repeat back to back.
    const blitzRecentAuthorsRef = useRef<string[]>([]);
    // One guard so a solved cipher and the timeout cannot both settle a round.
    const finishedRef = useRef(false);

    // Timer Interval
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (status === 'playing' && !isAdPaused) {
            if (mode === 'blitz') {
                interval = setInterval(() => {
                    setBlitzTimeLeft(prev => Math.max(0, prev - 1));
                    setTimer(prev => prev + 1);
                }, 1000);
            } else {
                interval = setInterval(() => setTimer(prev => prev + 1), 1000);
            }
        }
        return () => clearInterval(interval);
    }, [status, isAdPaused, mode]);

    const onBlitzTimeout = useCallback(() => {
        // A finished round must settle exactly once (solve + timeout can land in
        // the same commit at the buzzer).
        if (finishedRef.current) return;
        finishedRef.current = true;

        setStatus('won');
        setSelectedCellIndex(null);
        triggerHaptic('heavy');

        const accuracy = calculateAccuracy(correctCount, totalCount, mistakes.length);
        // With no guesses at all the accuracy formula reports 100%; a Blitz run
        // where nothing was solved should read as 0%, not perfect.
        const displayAccuracy = totalCount > 0 ? accuracy : 0;
        setAccuracyPercent(displayAccuracy);

        // Grade from actual solves first: solving nothing is always a D.
        let finalGrade: { grade: SolveGrade; title: string; stars: number };
        if (blitzSolves >= 5 && accuracy >= 80) {
            finalGrade = { grade: 'S', title: 'Blitz Mastermind', stars: 3 };
        } else if (blitzSolves >= 3 && accuracy >= 65) {
            finalGrade = { grade: 'A', title: 'Speed Decryptor', stars: 3 };
        } else if (blitzSolves >= 1 && accuracy >= 50) {
            finalGrade = { grade: 'B', title: 'Rapid Solver', stars: 2 };
        } else if (blitzSolves >= 1) {
            finalGrade = { grade: 'C', title: 'Time Pressured', stars: 1 };
        } else {
            finalGrade = { grade: 'D', title: 'Time Expired', stars: 1 };
        }
        setSolveGrade(finalGrade);

        // Blitz currency is points; convert to coins at a single, visible rate
        // (20 points = 1 coin, minimum 5) so the payout matches the HUD.
        const finalPoints = blitzScoreRef.current;
        setEarnedScore(finalPoints);
        const coinsAwarded = Math.max(5, Math.round(finalPoints / 20));
        setCoinsEarned(coinsAwarded);
        addCoins(coinsAwarded);

        updateBlitzHighScore(finalPoints);
    }, [correctCount, totalCount, mistakes.length, blitzSolves, addCoins, updateBlitzHighScore, triggerHaptic]);

    // Pure Blitz Rush Game Over Detector
    useEffect(() => {
        if (mode === 'blitz' && status === 'playing' && blitzTimeLeft === 0) {
            onBlitzTimeout();
        }
    }, [blitzTimeLeft, mode, status, onBlitzTimeout]);

    // Win Checker (declared after onWin via the ref below)
    const onWinRef = useRef<() => void>(() => {});
    useEffect(() => {
        if (finishedRef.current) return;
        if (status === 'playing' && quoteData && isSolved(quoteData.text, userMap, cipherMap)) {
            onWinRef.current();
        }
    }, [userMap, quoteData, cipherMap, status]);

    const initLevel = useCallback((solvedOverride?: Set<string>) => {
        let nextQuote: LevelData | null = null;

        if (mode === 'daily') {
            const today = dateStr || todayKey();
            nextQuote = getDailyQuote(today);
        } else if (mode === 'blitz') {
            // Exclude recently served definitions so Blitz never repeats back to back.
            nextQuote = getRandomBlitzQuote(blitzRecentAuthorsRef.current);
            blitzRecentAuthorsRef.current = [nextQuote.author, ...blitzRecentAuthorsRef.current].slice(0, 5);
        } else {
            // `solvedOverride` lets "Replay Subject Puzzles" start from a clean
            // slate without waiting for the reset state to propagate.
            nextQuote = getNextQuote(genreId, solvedOverride ?? solvedQuotes);
        }

        if (!nextQuote) {
            setStatus('completed');
            return;
        }

        const today = dateStr || todayKey();
        // A daily that is already solved today can be replayed, but as practice.
        setIsPracticeRun(mode === 'daily' && stats.dailySolvedDates.includes(today));
        finishedRef.current = false;

        const qId = nextQuote.id || `${genreId}-${nextQuote.author}`;
        const savedData = mode === 'standard' ? savedGames[genreId] : undefined;

        if (savedData && savedData.quoteId === qId) {
            setQuoteData(nextQuote);
            setCipherMap(savedData.cipherMap);
            setUserMap(savedData.userMap);
            setMistakes(savedData.mistakes || []);
            setHintsUsed(savedData.hintsUsed || 0);
            setFreeHints(savedData.freeHints ?? 2);
            setTimer(savedData.timer || 0);
            setTotalCount(savedData.totalGuesses || 0);
            setCorrectCount(savedData.correctGuesses || 0);

            const firstIdx = getNextUnsolvedIndex(nextQuote.text, savedData.cipherMap, savedData.userMap, -1);
            setSelectedCellIndex(firstIdx);
            setStatus('playing');
            return;
        }

        // Fresh game start
        setUserMap({});
        setSelectedCellIndex(null);
        setMistakes([]);
        setHintsUsed(0);
        setFreeHints(mode === 'blitz' ? 1 : 2);
        setTimer(0);
        setComboCount(0);
        setMaxCombo(0);
        setTotalCount(0);
        setCorrectCount(0);
        setAccuracyPercent(0);
        setQuoteData(nextQuote);

        const newCipher = generateCipher(mode === 'daily' ? today : undefined);
        setCipherMap(newCipher);

        const initialHints = generateHints(nextQuote.text, newCipher, mode === 'blitz' ? 'Easy' : settings.difficulty);
        setUserMap(initialHints);

        const firstIdx = getNextUnsolvedIndex(nextQuote.text, newCipher, initialHints, -1);
        setSelectedCellIndex(firstIdx);
        setStatus('playing');
    }, [genreId, mode, dateStr, settings.difficulty, savedGames, solvedQuotes, stats.dailySolvedDates]);

    initLevelRef.current = initLevel;

    const onWin = useCallback(() => {
        if (!quoteData) return;
        // At the buzzer the timeout owns settlement; a solve in the same commit
        // must not double-award.
        if (mode === 'blitz' && blitzTimeLeft === 0) return;

        setStatus('won');
        setSelectedCellIndex(null);
        triggerHaptic('success');

        const accuracy = calculateAccuracy(correctCount, totalCount, mistakes.length);
        setAccuracyPercent(accuracy);

        const reward = calculateCoinReward({
            difficulty: mode === 'blitz' ? 'Normal' : settings.difficulty,
            timerSeconds: timer,
            hintsUsed,
            mistakesCount: mistakes.length,
            accuracy,
            mode
        });
        setCoinReward(reward);
        setSolveGrade({
            grade: reward.grade,
            title: reward.gradeTitle,
            stars: reward.stars
        });

        // The combo multiplier the HUD advertises is applied to the points score,
        // using the best combo of the solve.
        const rewardMultiplier = getComboMultiplier(maxCombo);
        const points = Math.round(reward.netCoins * 10 * rewardMultiplier);

        setEarnedScore(points);
        setMaxScore(reward.baseCoins * 10);
        setCoinsEarned(isPracticeRun ? 0 : reward.netCoins);

        if (mode === 'blitz') {
            const bonusTime = 15;
            setBlitzTimeLeft(prev => prev + bonusTime);
            setBlitzScore(prev => prev + Math.round(reward.netCoins * rewardMultiplier));
            setBlitzSolves(prev => prev + 1);
        } else {
            const qId = quoteData.id || `${genreId}-${quoteData.author}`;
            if (isPracticeRun) {
                // Replaying a solved daily pays nothing and does not touch stats.
                return;
            }
            markQuoteSolved(qId, genreId);
            recordPuzzleCompletion({
                quoteId: qId,
                category: genreLabel,
                timeSeconds: timer,
                hintsUsed,
                mistakesCount: mistakes.length,
                isDaily: mode === 'daily',
                difficulty: settings.difficulty,
                score: points,
                coins: reward.netCoins,
                grade: reward.grade,
                totalGuesses: totalCount,
                correctGuesses: correctCount
            });
        }
    }, [
        quoteData,
        mode,
        blitzTimeLeft,
        correctCount,
        totalCount,
        mistakes.length,
        settings.difficulty,
        timer,
        hintsUsed,
        maxCombo,
        isPracticeRun,
        genreId,
        genreLabel,
        markQuoteSolved,
        recordPuzzleCompletion,
        triggerHaptic,
    ]);

    // Keep the win-check effect pointed at the latest onWin without re-running
    // it on every state change.
    onWinRef.current = onWin;

    const handleKeyPress = useCallback((char: string) => {
        if (status !== 'playing' || selectedCellIndex === null || !quoteData) return;

        const cellChar = quoteData.text[selectedCellIndex]?.toUpperCase();
        if (!cellChar || !/[A-Z]/.test(cellChar)) return;

        const cipherChar = cipherMap[cellChar];
        if (!cipherChar) return;

        // Ignore re-entry on an already-correct cell; otherwise hammering the same
        // key floods the accuracy stat and the combo counter.
        if (userMap[cipherChar] === cellChar) return;

        const correctChar = cellChar;
        const isCorrect = char === correctChar;

        setTotalCount(prev => prev + 1);

        if (isCorrect) {
            triggerHaptic('light');
            setCorrectCount(prev => prev + 1);
            setComboCount(prev => {
                const next = prev + 1;
                setMaxCombo(curr => Math.max(curr, next));
                return next;
            });
        } else {
            triggerHaptic('error');
            setComboCount(0); // Reset combo
            setMistakes(prev => prev.includes(cipherChar) ? prev : [...prev, cipherChar]);
        }

        const nextUserMap = { ...userMap, [cipherChar]: char };
        setUserMap(nextUserMap);

        if (isCorrect && settings.autoAdvance) {
            const nextIdx = getNextUnsolvedIndex(quoteData.text, cipherMap, nextUserMap, selectedCellIndex);
            setSelectedCellIndex(nextIdx);
        }
    }, [status, selectedCellIndex, cipherMap, quoteData, userMap, settings.autoAdvance, triggerHaptic]);

    const handleDelete = useCallback(() => {
        if (status !== 'playing' || selectedCellIndex === null || !quoteData) return;
        const cellChar = quoteData.text[selectedCellIndex]?.toUpperCase();
        const cipherChar = cipherMap[cellChar];

        if (cipherChar && userMap[cipherChar]) {
            // Clear current letter
            setUserMap(prev => {
                const next = { ...prev };
                delete next[cipherChar];
                return next;
            });
        } else {
            // Backtrack to previous cell
            const prevIdx = getPreviousCellIndex(quoteData.text, selectedCellIndex);
            if (prevIdx !== null) {
                setSelectedCellIndex(prevIdx);
                const prevChar = quoteData.text[prevIdx]?.toUpperCase();
                const prevCipher = cipherMap[prevChar];
                if (prevCipher) {
                    setUserMap(prev => {
                        const next = { ...prev };
                        delete next[prevCipher];
                        return next;
                    });
                }
            }
        }
    }, [status, selectedCellIndex, quoteData, cipherMap, userMap]);

    const handleNext = useCallback(() => {
        if (status !== 'playing' || !quoteData) return;
        const nextIdx = getNextUnsolvedIndex(quoteData.text, cipherMap, userMap, selectedCellIndex ?? -1);
        if (nextIdx !== null) setSelectedCellIndex(nextIdx);
    }, [status, selectedCellIndex, quoteData, cipherMap, userMap]);

    const handleSelectCipherFromFrequency = useCallback((targetCipherChar: string) => {
        if (!quoteData) return;
        const upper = quoteData.text.toUpperCase();
        for (let i = 0; i < upper.length; i++) {
            const real = upper[i];
            if (/[A-Z]/.test(real) && cipherMap[real] === targetCipherChar) {
                setSelectedCellIndex(i);
                break;
            }
        }
    }, [quoteData, cipherMap]);

    const handleHint = useCallback(() => {
        if (status !== 'playing' || selectedCellIndex === null || !quoteData || !selectedCipherChar) return;

        const cellChar = quoteData.text[selectedCellIndex].toUpperCase();
        const cipherChar = selectedCipherChar;

        if (freeHints > 0) {
            setFreeHints(prev => prev - 1);
            setHintsUsed(prev => prev + 1);
            triggerHaptic('success');

            const nextUserMap = { ...userMap, [cipherChar]: cellChar };
            setUserMap(nextUserMap);

            const nextIdx = getNextUnsolvedIndex(quoteData.text, cipherMap, nextUserMap, selectedCellIndex);
            setSelectedCellIndex(nextIdx);
        } else {
            setIsAdPaused(true);
            Alert.alert(
                "Need a Hint?",
                "Watch a short ad to reveal this letter.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => setIsAdPaused(false) },
                    {
                        text: "Watch Ad",
                        onPress: () => {
                            adService.show(() => {
                                setIsAdPaused(false);
                                setHintsUsed(prev => prev + 1);
                                const nextUserMap = { ...userMap, [cipherChar]: cellChar };
                                setUserMap(nextUserMap);
                                const nextIdx = getNextUnsolvedIndex(quoteData.text, cipherMap, nextUserMap, selectedCellIndex);
                                setSelectedCellIndex(nextIdx);
                            }, () => setIsAdPaused(false));
                        }
                    }
                ],
                { onDismiss: () => setIsAdPaused(false) }
            );
        }
    }, [status, freeHints, selectedCellIndex, selectedCipherChar, cipherMap, userMap, quoteData, triggerHaptic]);

    const handleUseKey = useCallback(() => {
        if (status !== 'playing' || !quoteData) return;

        setIsAdPaused(true);
        Alert.alert(
            "Reveal Entire Cipher?",
            "Solve every letter instantly. You keep only a small coin reward and earn a D grade.",
            [
                { text: "Cancel", style: "cancel", onPress: () => setIsAdPaused(false) },
                {
                    text: "Solve All",
                    style: "destructive",
                    onPress: () => {
                        adService.show(() => {
                            setIsAdPaused(false);
                            const fullMap: Record<string, string> = {};
                            for (const [original, cipher] of Object.entries(cipherMap)) {
                                fullMap[cipher] = original;
                            }
                            setUserMap(fullMap);
                            setStatus('won');
                            setSelectedCellIndex(null);

                            const reward = calculateCoinReward({
                                difficulty: mode === 'blitz' ? 'Normal' : settings.difficulty,
                                timerSeconds: timer,
                                hintsUsed,
                                mistakesCount: mistakes.length,
                                accuracy: 100,
                                usedMasterKey: true,
                                mode
                            });
                            const points = reward.netCoins * 10;
                            setCoinReward(reward);
                            setEarnedScore(points);
                            setMaxScore(reward.baseCoins * 10);
                            setCoinsEarned(isPracticeRun ? 0 : reward.netCoins);
                            setSolveGrade({ grade: reward.grade, title: reward.gradeTitle, stars: reward.stars });

                            if (mode === 'blitz') {
                                setBlitzScore(prev => prev + reward.netCoins);
                                setBlitzSolves(prev => prev + 1);
                                return;
                            }
                            if (isPracticeRun) return;

                            // Route the master key through the normal completion path so
                            // progress, stats and achievements are recorded (this used to
                            // be skipped, leaving the puzzle unsolved and re-served).
                            const qId = quoteData.id || `${genreId}-${quoteData.author}`;
                            markQuoteSolved(qId, genreId);
                            recordPuzzleCompletion({
                                quoteId: qId,
                                category: genreLabel,
                                timeSeconds: timer,
                                hintsUsed,
                                mistakesCount: mistakes.length,
                                isDaily: mode === 'daily',
                                difficulty: settings.difficulty,
                                score: points,
                                coins: reward.netCoins,
                                grade: reward.grade,
                                totalGuesses: totalCount,
                                correctGuesses: correctCount
                            });
                        }, () => setIsAdPaused(false));
                    }
                }
            ],
            { onDismiss: () => setIsAdPaused(false) }
        );
    }, [
        status,
        quoteData,
        cipherMap,
        mode,
        settings.difficulty,
        timer,
        hintsUsed,
        mistakes.length,
        isPracticeRun,
        genreId,
        genreLabel,
        markQuoteSolved,
        recordPuzzleCompletion,
        totalCount,
        correctCount,
    ]);

    const goBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Fixes the dead "Replay Subject Puzzles" button: pass an empty solved set so
    // the next quote is selected immediately, without waiting for the reset state
    // to propagate into initLevel's closure.
    const handleReplaySubject = useCallback(() => {
        resetCategoryProgress(genreId);
        initLevel(new Set<string>());
    }, [genreId, resetCategoryProgress, initLevel]);

    const goSettings = useCallback(() => {
        // Settings lives inside the Home tab stack; navigate through the parent
        // route instead of a non-existent top-level "Settings" route.
        navigation.navigate('Home', { screen: 'Settings' });
    }, [navigation]);

    const cells: CellData[] = useMemo(() => {
        if (!quoteData) return [];
        return prepareGameData(quoteData, cipherMap).map(cell => ({
            ...cell,
            userChar: cell.cipherChar ? userMap[cell.cipherChar] : null
        }));
    }, [quoteData, cipherMap, userMap]);

    // ===== GENRE COMPLETED VIEW =====
    if (status === 'completed') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centeredFull}>
                    <Icon name="graduation" size={56} color={colors.primary} />
                    <Text style={[styles.bigTitle, { color: colors.text }]}>Subject Mastered!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        You have conquered every cryptogram in {genreLabel}!
                    </Text>

                    <Pressable
                        onPress={handleReplaySubject}
                        style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                    >
                        <Text style={styles.primaryButtonText}>Replay Subject Puzzles</Text>
                    </Pressable>

                    <Pressable
                        onPress={goBack}
                        style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back to Library</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (!quoteData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 40 }}>⏳</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 16 }}>Loading Cryptogram...</Text>
            </SafeAreaView>
        );
    }

    // ===== WIN VIEW =====
    if (status === 'won') {
        const isBlitzTimeout = mode === 'blitz' && blitzTimeLeft === 0;
        return (
            <WinCelebrationModal
                quoteData={quoteData}
                genreLabel={genreLabel}
                score={mode === 'blitz' ? (isBlitzTimeout ? earnedScore : blitzScore) : earnedScore}
                maxScore={maxScore}
                coinsEarned={coinsEarned}
                coinReward={coinReward || undefined}
                timer={timer}
                hintsUsed={hintsUsed}
                mistakesCount={mistakes.length}
                grade={solveGrade}
                accuracy={accuracyPercent}
                onNextPuzzle={() => {
                    if (mode === 'daily') {
                        goBack();
                    } else if (mode === 'blitz' && blitzTimeLeft === 0) {
                        setBlitzScore(0);
                        setBlitzSolves(0);
                        setBlitzTimeLeft(90);
                        initLevel();
                    } else {
                        initLevel();
                    }
                }}
                onBack={goBack}
                isDaily={mode === 'daily'}
                isBlitz={mode === 'blitz'}
                isBlitzTimeout={isBlitzTimeout}
                isPractice={isPracticeRun}
                userMap={userMap}
                cipherMap={cipherMap}
            />
        );
    }

    // ===== PLAYING VIEW =====
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header
                status={GameStatus.PLAYING}
                category={genreLabel}
                onBack={goBack}
                onHint={handleHint}
                onUseKey={handleUseKey}
                onSettings={goSettings}
                onToggleFrequency={() => setShowFrequencyBar((prev: boolean) => !prev)}
                showFrequency={showFrequencyBar}
                canHint={selectedCellIndex !== null}
                freeHints={freeHints}
                timer={mode === 'blitz' ? blitzTimeLeft : timer}
                hideTimer={settings.hideTimer}
                comboMultiplier={comboMultiplier}
                isBlitz={mode === 'blitz'}
            />

            {showFrequencyBar && (
                <FrequencyBar
                    frequencies={frequencies}
                    selectedCipherChar={selectedCipherChar}
                    onSelectCipherChar={handleSelectCipherFromFrequency}
                />
            )}

            <ScrollView
                style={styles.boardScroll}
                contentContainerStyle={styles.boardScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <PuzzleBoard
                    cells={cells}
                    selectedCellIndex={selectedCellIndex}
                    onSelectCell={setSelectedCellIndex}
                    solved={false}
                />
            </ScrollView>

            <View style={{ flexShrink: 0 }}>
                <VirtualKeyboard
                    usedLetters={usedLetters}
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onNext={handleNext}
                    blockUsedLetters={settings.blockUsedLetters}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    boardScroll: { flex: 1 },
    boardScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
    centeredFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
    bigTitle: { fontSize: 28, fontWeight: '900', fontFamily: 'serif' },
    subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
    primaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '800' },
    secondaryButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
    },
    secondaryButtonText: { fontSize: 14, fontWeight: '700' },
});
