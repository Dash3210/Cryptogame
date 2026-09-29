import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share, Animated, AccessibilityInfo, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import { ConfettiAnimation } from './ConfettiAnimation';
import { LevelData, SolveGrade, CoinRewardBreakdown } from '../types';
import { useGame } from '../context/GameContext';
import { SPRING_PRESETS, generateEnigmaShareCard } from '../utils/physics';
import { CipherTransition } from './CipherTransition';
import { Icon } from './Icon';
import { calculateCoinReward } from '../utils/cipher';
import { getLevelId } from '../services/quoteService';

interface WinCelebrationModalProps {
    quoteData: LevelData;
    genreLabel: string;
    score?: number;
    maxScore?: number;
    coinsEarned?: number;
    coinReward?: CoinRewardBreakdown;
    timer: number;
    hintsUsed: number;
    mistakesCount: number;
    grade: { grade: SolveGrade; title: string; stars: number };
    accuracy: number;
    onNextPuzzle: () => void;
    onBack: () => void;
    isDaily?: boolean;
    isBlitz?: boolean;
    isBlitzTimeout?: boolean;
    /** A replayed daily cipher: graded, but pays nothing. */
    isPractice?: boolean;
    /** Extra coins won from Comprehension bonus (+50%). */
    bonusCoins?: number;
    /** True when the comprehension bonus is still available (deprecated). */
    bonusAvailable?: boolean;
    onOpenBonus?: () => void;
    userMap?: Record<string, string>;
    cipherMap?: Record<string, string>;
}

export const WinCelebrationModal: React.FC<WinCelebrationModalProps> = ({
    quoteData,
    genreLabel,
    score = 0,
    coinsEarned = 0,
    coinReward,
    bonusCoins = 0,
    timer,
    hintsUsed,
    mistakesCount,
    grade,
    accuracy,
    onNextPuzzle,
    onBack,
    isDaily,
    isBlitz,
    isBlitzTimeout,
    isPractice = false,
    bonusAvailable: _bonusAvailable = false,
    onOpenBonus: _onOpenBonus,
    userMap,
    cipherMap,
}) => {
    const { colors, isFavorite, toggleFavorite, triggerHaptic } = useGame();
    const qId = getLevelId(genreLabel, quoteData);
    const liked = isFavorite(qId);
    const [isReducedMotion, setIsReducedMotion] = useState(false);

    const reward: CoinRewardBreakdown = coinReward || calculateCoinReward({
        difficulty: quoteData?.difficulty || 'Normal',
        timerSeconds: timer,
        hintsUsed,
        mistakesCount,
        accuracy,
        mode: isDaily ? 'daily' : isBlitz ? 'blitz' : 'standard',
        quoteText: quoteData?.text,
    });

    // What the player actually receives. A Blitz run pays out once, at the end,
    // from accumulated points; showing the per-round reward here was misleading.
    const displayCoins = isBlitz && isBlitzTimeout ? coinsEarned : isPractice ? 0 : (reward.netCoins + bonusCoins);

    const entranceScale = useRef(new Animated.Value(0.96)).current;
    const entranceOpacity = useRef(new Animated.Value(0)).current;

    // Reduced motion listener
    useEffect(() => {
        let isMounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (isMounted) setIsReducedMotion(enabled);
            })
            .catch(() => {});

        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
            if (isMounted) setIsReducedMotion(enabled);
        });

        return () => {
            isMounted = false;
            sub?.remove();
        };
    }, []);

    useEffect(() => {
        if (isReducedMotion) {
            entranceScale.setValue(1);
            entranceOpacity.setValue(1);
            return;
        }

        entranceScale.setValue(0.96);
        entranceOpacity.setValue(0);

        Animated.parallel([
            Animated.spring(entranceScale, {
                toValue: 1,
                ...SPRING_PRESETS.MODAL_SPRING,
            }),
            Animated.timing(entranceOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isReducedMotion, entranceScale, entranceOpacity]);

    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const handleShare = async () => {
        try {
            triggerHaptic('medium');
            let msg: string;
            if (userMap && cipherMap && Object.keys(cipherMap).length > 0 && !isBlitzTimeout) {
                msg = generateEnigmaShareCard({
                    quoteText: quoteData.text,
                    userMap,
                    cipherMap,
                    timeSeconds: timer,
                    grade: grade.grade,
                    accuracy,
                    category: genreLabel,
                    dateStr: isDaily ? new Date().toISOString().split('T')[0] : undefined,
                });
            } else {
                const starsText = '⭐'.repeat(grade.stars);
                msg = `🧠 BrainCipher ${isBlitz ? 'Blitz Rush' : 'Decoded'}! [${genreLabel}]\n` +
                    `🏆 Grade: ${grade.grade} (${starsText})\n` +
                    `⏱️ Time: ${timeFormatted} | 🎯 Accuracy: ${accuracy}%\n` +
                    `✨ Score: ${score.toLocaleString()} pts (+${coinsEarned} Coins)\n` +
                    `Can you crack the code? https://braincipher.app`;
            }

            await Share.share({ message: msg });
        } catch {
            Alert.alert('Sharing unavailable', 'The share sheet could not be opened on this device.');
        }
    };

    const getGradeColor = (g: SolveGrade) => {
        switch (g) {
            case 'S': return '#fbbf24'; // Gold
            case 'A': return '#10b981'; // Emerald
            case 'B': return '#38bdf8'; // Sky
            case 'C': return '#818cf8'; // Indigo
            default: return colors.textSecondary;
        }
    };

    const headerSub = isDaily
        ? 'DAILY CIPHER CRACKED'
        : isBlitz
            ? (isBlitzTimeout ? "BLITZ RUSH TIME'S UP" : 'BLITZ CIPHER CRACKED')
            : 'CRYPTOGRAM DECODED';

    const headerTitle = isBlitz
        ? (isBlitzTimeout ? (score > 0 ? 'Rush Complete!' : "Time's Up!") : 'Speed Solve!')
        : 'Victory!';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {grade.grade !== 'D' && !isReducedMotion && <ConfettiAnimation />}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ transform: [{ scale: entranceScale }], opacity: entranceOpacity, gap: 16 }}>
                    {/* Header Badge */}
                    <View style={styles.topHeader}>
                        <Text style={[styles.topSub, { color: colors.textMuted }]}>
                            {headerSub}
                        </Text>
                        <Text style={[styles.title, { color: colors.text }]}>{headerTitle}</Text>
                    </View>

                {/* Grade & Coins Economy Card */}
                <View style={[styles.gradeCard, { backgroundColor: colors.surface, borderColor: getGradeColor(grade.grade) }]}>
                    <View style={styles.gradeHeader}>
                        <View style={[styles.gradePill, { backgroundColor: `${getGradeColor(grade.grade)}25` }]}>
                            <Text style={[styles.gradeText, { color: getGradeColor(grade.grade) }]}>
                                {grade.grade}
                            </Text>
                        </View>
                        <View style={styles.gradeInfo}>
                            <Text style={[styles.gradeTitle, { color: colors.text }]}>{grade.title}</Text>
                            <Text style={[styles.starsText, { color: getGradeColor(grade.grade) }]}>{'★'.repeat(grade.stars)}</Text>
                        </View>
                        <View style={[styles.netCoinPill, { backgroundColor: colors.goldBg, borderColor: colors.gold }]}>
                            <Icon name="coin" size={16} color={colors.gold} />
                            <Text style={[styles.netCoinVal, { color: colors.gold }]}>{`+${displayCoins}`}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Transparent Itemized Coins Ledger */}
                    {isPractice ? (
                        <View style={styles.ledgerContainer}>
                            <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                {isDaily
                                    ? "Practice run: rewards are disabled because you already solved today's cipher. Your streak is safe."
                                    : "Practice run: rewards are disabled because this puzzle has already been solved. No coins or stats awarded."}
                            </Text>
                        </View>
                    ) : isBlitz && isBlitzTimeout ? (
                        <View style={styles.ledgerContainer}>
                            <View style={styles.ledgerHeaderRow}>
                                <Text style={[styles.ledgerHeaderTitle, { color: colors.textMuted }]}>BLITZ PAYOUT</Text>
                                <Text style={[styles.ledgerHeaderRatio, { color: colors.primary }]}>
                                    {`${score.toLocaleString()} pts → ${coinsEarned} coins`}
                                </Text>
                            </View>
                            <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                Points convert to coins at 50:1 (minimum 5, capped at 100 coins).
                            </Text>
                        </View>
                    ) : isBlitz && !isBlitzTimeout ? (
                        <View style={styles.ledgerContainer}>
                            <View style={styles.ledgerHeaderRow}>
                                <Text style={[styles.ledgerHeaderTitle, { color: colors.textMuted }]}>BLITZ POINTS</Text>
                                <Text style={[styles.ledgerHeaderRatio, { color: colors.primary }]}>
                                    {score.toLocaleString()} pts
                                </Text>
                            </View>
                            <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                Your combo multiplier is applied to these points. Coins are awarded when the 90s run ends.
                            </Text>
                        </View>
                    ) : (
                    <View style={styles.ledgerContainer}>
                        <View style={styles.ledgerHeaderRow}>
                            <Text style={[styles.ledgerHeaderTitle, { color: colors.textMuted }]}>COINS LEDGER</Text>
                            <Text style={[styles.ledgerHeaderRatio, { color: colors.primary }]}>
                                {`${reward.netCoins + bonusCoins} / ${reward.baseCoins} Coins Gained`}
                            </Text>
                        </View>

                        <View
                            style={styles.ledgerRow}
                            accessibilityLabel={`${reward.baseLabel || 'Base Level Reward'}: +${reward.baseCoins}`}
                        >
                            <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                • {reward.baseLabel || 'Base Level Reward'}
                            </Text>
                            <Text style={[styles.ledgerRowValuePositive, { color: colors.primary }]}>+{reward.baseCoins}</Text>
                        </View>

                        {reward.mistakeDeduction > 0 && (
                            <View style={styles.ledgerRow}>
                                <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                    • Wrong Answers ({reward.mistakesCount})
                                </Text>
                                <Text style={[styles.ledgerRowValueNegative, { color: colors.error }]}>
                                    -{reward.mistakeDeduction}
                                </Text>
                            </View>
                        )}

                        {reward.hintDeduction > 0 && (
                            <View style={styles.ledgerRow}>
                                <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                    • Hints Used ({reward.hintsCount})
                                </Text>
                                <Text style={[styles.ledgerRowValueNegative, { color: colors.error }]}>
                                    -{reward.hintDeduction}
                                </Text>
                            </View>
                        )}

                        {reward.timeDeduction > 0 && (
                            <View style={styles.ledgerRow}>
                                <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                    • Exceeded Par Time
                                </Text>
                                <Text style={[styles.ledgerRowValueNegative, { color: colors.error }]}>
                                    -{reward.timeDeduction}
                                </Text>
                            </View>
                        )}

                        {reward.keyDeduction > 0 && (
                            <View style={styles.ledgerRow}>
                                <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                    • Master Key Usage
                                </Text>
                                <Text style={[styles.ledgerRowValueNegative, { color: colors.error }]}>
                                    -{reward.keyDeduction}
                                </Text>
                            </View>
                        )}

                        {reward.cleanBonus > 0 && (
                            <View style={styles.ledgerRow}>
                                <Text style={[styles.ledgerRowLabel, { color: colors.textSecondary }]}>
                                    • Flawless Clean Solve
                                </Text>
                                <Text style={[styles.ledgerRowValuePositive, { color: colors.primary }]}>
                                    +{reward.cleanBonus}
                                </Text>
                            </View>
                        )}

                        {bonusCoins > 0 && (
                            <View
                                style={styles.ledgerRow}
                                accessibilityLabel={`Comprehension Bonus (+50%): +${bonusCoins}`}
                            >
                                <Text style={[styles.ledgerRowLabel, { color: colors.gold }]}>
                                    • Comprehension Bonus (+50%)
                                </Text>
                                <Text style={[styles.ledgerRowValuePositive, { color: colors.gold }]}>
                                    +{bonusCoins}
                                </Text>
                            </View>
                        )}
                    </View>
                    )}
                </View>

                {/* Stats Row */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.statCol}>
                        <Text style={[styles.statVal, { color: colors.text }]}>{timeFormatted}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Time</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statCol}>
                        <Text style={[styles.statVal, { color: colors.text }]}>{accuracy}%</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statCol}>
                        <Text style={[styles.statVal, { color: colors.text }]}>{hintsUsed}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hints</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statCol}>
                        <Text style={[styles.statVal, { color: colors.text }]}>{mistakesCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Mistakes</Text>
                    </View>
                </View>

                {/* Quote Reveal Card with Cryptographic Matrix Transition */}
                <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.quoteLabel, { color: colors.textMuted }]}>DECRYPTED DEFINITION</Text>
                    <CipherTransition
                        text={`"${quoteData.text}"`}
                        durationMs={600}
                        style={[styles.quoteText, { color: colors.text }]}
                    />

                    <View
                        style={[
                            styles.answerBadge,
                            {
                                backgroundColor: colors.primaryBg,
                                borderColor: colors.primaryBorder,
                            },
                        ]}
                    >
                        <View style={styles.answerHeaderRow}>
                            <Text style={[styles.answerLabel, { color: colors.primary }]}>
                                TERM / ANSWER
                            </Text>
                        </View>
                        <CipherTransition
                            text={quoteData?.author || 'UNKNOWN'}
                            durationMs={400}
                            style={[styles.answerText, { color: colors.primary }]}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonStack}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('medium');
                            onNextPuzzle();
                        }}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            { backgroundColor: colors.primary, shadowColor: colors.primary },
                            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }
                        ]}
                    >
                        <Text style={styles.primaryBtnText}>
                            {isDaily ? 'Back to Daily Cipher' : (isBlitz && isBlitzTimeout) ? 'Play Blitz Again' : 'Next Cryptogram →'}
                        </Text>
                    </Pressable>

                    <View style={styles.secondaryRow}>
                        <Pressable
                            onPress={() => toggleFavorite(qId)}
                            style={({ pressed }) => [
                                styles.secondaryBtn,
                                { backgroundColor: colors.surface, borderColor: liked ? colors.error : colors.border },
                                liked && { backgroundColor: colors.errorBg },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                            ]}
                        >
                            <Icon name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.error : colors.textSecondary} />
                            <Text style={[styles.secondaryBtnText, { color: liked ? colors.error : colors.textSecondary }]}>
                                {liked ? 'Saved' : 'Save'}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleShare}
                            style={({ pressed }) => [
                                styles.secondaryBtn,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                            ]}
                        >
                            <Icon name="share" size={16} color={colors.textSecondary} />
                            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Share</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                triggerHaptic('light');
                                onBack();
                            }}
                            style={({ pressed }) => [
                                styles.secondaryBtn,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                            ]}
                        >
                            <Icon name="chevron-left" size={16} color={colors.textSecondary} />
                            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Back</Text>
                        </Pressable>
                    </View>
                </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 40,
    },
    topHeader: {
        alignItems: 'center',
        marginTop: 12,
    },
    topSub: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        fontFamily: 'serif',
        marginTop: 2,
    },
    gradeCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    gradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    gradePill: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradeText: {
        fontSize: 36,
        fontWeight: '900',
    },
    gradeInfo: {
        flex: 1,
    },
    gradeTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    starsText: {
        fontSize: 16,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
    netCoinPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    netCoinVal: {
        fontSize: 16,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    coinIcon: {
        fontSize: 16,
    },
    ledgerContainer: {
        gap: 6,
    },
    ledgerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    ledgerHeaderTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    ledgerHeaderRatio: {
        fontSize: 13,
        fontWeight: '800',
    },
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    ledgerRowLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    ledgerRowValuePositive: {
        fontSize: 13,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    ledgerRowValueNegative: {
        fontSize: 13,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scoreCol: {},
    scoreLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    scoreVal: {
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    coinPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    coinText: {
        fontSize: 14,
        fontWeight: '800',
    },
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    statCol: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
    },
    quoteCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    quoteLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    quoteText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'serif',
        fontStyle: 'italic',
    },
    answerBadge: {
        marginTop: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    answerHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    answerLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    answerText: {
        fontSize: 20,
        fontWeight: '900',
    },
    buttonStack: {
        gap: 10,
        marginTop: 4,
    },
    bonusBtn: {
        minHeight: 52,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    bonusBtnText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    primaryBtn: {
        paddingVertical: 16,
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 8,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
    },
    secondaryBtnIcon: {
        fontSize: 16,
    },
    secondaryBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
