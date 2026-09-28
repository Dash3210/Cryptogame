import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { SUBJECTS, EXTENSIONS, QUOTE_DB } from '../data/quotes';
import { getTrackProgress, getBranchesForTrack, isTrackComplete } from '../services/quoteService';
import { Icon, IconName } from '../components/Icon';

export const MasteryScreen = () => {
    const navigation = useNavigation<any>();
    const {
        rank,
        rankTitle,
        totalPoints,
        coins,
        stats,
        achievements,
        claimAchievement,
        myExtensions,
        solvedQuotes,
        colors,
        triggerHaptic,
    } = useGame();

    const [activeTab, setActiveTab] = useState<'achievements' | 'stats' | 'subjects'>('achievements');

    const allGenres = [...SUBJECTS, ...EXTENSIONS.filter(e => myExtensions.has(e.id))];
    const completedGenres = allGenres.filter(g => isTrackComplete(g.id, solvedQuotes));


    // Global accuracy calculation. With no guesses there is no accuracy to show,
    // so the UI renders a dash rather than a misleading 100%.
    const hasGuesses = stats.totalGuesses > 0;
    const accuracy = hasGuesses
        ? Math.round((stats.correctGuesses / stats.totalGuesses) * 100)
        : 0;

    // Total play time formatted
    const playMinutes = Math.floor(stats.totalPlayTimeSeconds / 60);
    const playHours = (playMinutes / 60).toFixed(1);

    const unlockedCount = achievements.filter(a => a.isUnlocked).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.headerSub, { color: colors.textMuted }]}>PLAYER PROFILE</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Mastery & Rank</Text>
                    </View>
                    <View style={[styles.coinBadge, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                        <Icon name="coin" size={13} color={colors.gold} />
                        <Text style={[styles.coinText, { color: colors.text }]}>{coins}</Text>
                    </View>
                </View>

                {/* Player Rank Card */}
                <View style={[styles.rankCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                    <View style={styles.rankTopRow}>
                        <View style={[styles.rankIconBox, { backgroundColor: colors.primaryBg }]}>
                            <Icon name="nav-mastery" size={26} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rankBadgeText, { color: colors.primary }]}>RANK #{rank}</Text>
                            <Text style={[styles.rankTitleText, { color: colors.text }]}>{rankTitle}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.pointsText, { color: colors.primary }]}>
                                {totalPoints.toLocaleString()} pts
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                                {coins.toLocaleString()} coins · {stats.puzzlesSolved} solves
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Navigation Tabs */}
                <View style={[styles.tabBar, { borderTopColor: colors.border }]}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            setActiveTab('achievements');
                        }}
                        style={[
                            styles.tabItem,
                            activeTab === 'achievements' && { borderBottomColor: colors.primary }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'achievements' ? colors.primary : colors.textMuted }
                        ]}>
                            Achievements ({unlockedCount}/{achievements.length})
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            setActiveTab('stats');
                        }}
                        style={[
                            styles.tabItem,
                            activeTab === 'stats' && { borderBottomColor: colors.primary }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'stats' ? colors.primary : colors.textMuted }
                        ]}>
                            Combat Stats
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            setActiveTab('subjects');
                        }}
                        style={[
                            styles.tabItem,
                            activeTab === 'subjects' && { borderBottomColor: colors.primary }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'subjects' ? colors.primary : colors.textMuted }
                        ]}>
                            Mastery ({completedGenres.length})
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ACHIEVEMENTS TAB */}
                {activeTab === 'achievements' && (
                    <View style={styles.achievementsList}>
                        {achievements.map((ach) => {
                            const percent = Math.min(100, Math.round((ach.progress / ach.target) * 100));

                            return (
                                <View
                                    key={ach.id}
                                    style={[
                                        styles.achCard,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: ach.isUnlocked ? colors.gold : colors.border
                                        }
                                    ]}
                                >
                                    <View style={[
                                        styles.achIconBox,
                                        {
                                            backgroundColor: ach.isUnlocked ? colors.goldBg : colors.surfaceHighlight
                                        }
                                    ]}>
                                        <Icon name={ach.icon as IconName} size={24} color={ach.isUnlocked ? colors.gold : colors.textSecondary} />
                                    </View>

                                    <View style={styles.achInfo}>
                                        <View style={styles.achHeaderRow}>
                                            <Text style={[styles.achTitle, { color: colors.text }]}>{ach.title}</Text>
                                            <View style={[styles.coinRewardPill, { backgroundColor: colors.goldBg }]}>
                                                <Text style={{ fontSize: 10, color: colors.gold }}>◎</Text>
                                                <Text style={[styles.coinRewardText, { color: colors.gold }]}>
                                                    +{ach.rewardCoins}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[styles.achDesc, { color: colors.textSecondary }]}>
                                            {ach.description}
                                        </Text>

                                        {/* Progress Bar */}
                                        <View style={styles.progressContainer}>
                                            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceHighlight }]}>
                                                <View style={[
                                                    styles.progressBarFill,
                                                    {
                                                        width: `${percent}%`,
                                                        backgroundColor: ach.isUnlocked ? colors.gold : colors.primary
                                                    }
                                                ]} />
                                            </View>
                                            <Text style={[styles.progressRatio, { color: colors.textMuted }]}>
                                                {Math.min(ach.progress, ach.target)}/{ach.target}
                                            </Text>
                                        </View>
                                    </View>

                                    {ach.isUnlocked && (
                                        <Pressable
                                            onPress={() => claimAchievement(ach.id)}
                                            disabled={ach.claimed}
                                            style={({ pressed }) => [
                                                styles.claimBtn,
                                                {
                                                    backgroundColor: ach.claimed ? colors.surfaceHighlight : colors.gold,
                                                    borderColor: ach.claimed ? colors.border : colors.gold,
                                                },
                                                pressed && !ach.claimed && { opacity: 0.8 }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.claimText,
                                                { color: ach.claimed ? colors.textMuted : '#ffffff' }
                                            ]}>
                                                {ach.claimed ? 'Claimed' : 'Claim'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* STATS TAB */}
                {activeTab === 'stats' && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Icon name="target" size={22} color={colors.primary} />
                                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.puzzlesSolved}</Text>
                                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Puzzles Solved</Text>
                            </View>

                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Icon name="bolt" size={22} color={colors.success} />
                                <Text style={[styles.statValue, { color: colors.success }]}>{hasGuesses ? `${accuracy}%` : '—'}</Text>
                                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Accuracy</Text>
                            </View>

                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Icon name="flame" size={22} color={colors.gold} />
                                <Text style={[styles.statValue, { color: colors.gold }]}>{stats.currentStreak}</Text>
                                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Current Streak</Text>
                            </View>

                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Icon name="timer" size={22} color={colors.textSecondary} />
                                <Text style={[styles.statValue, { color: colors.text }]}>{playHours}h</Text>
                                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Play Time</Text>
                            </View>
                        </View>

                        {/* Best Times Section */}
                        <View style={[styles.bestTimesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fastest Solves by Subject</Text>
                            {Object.keys(stats.bestTimes).length === 0 ? (
                                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                                    Solve puzzles to record personal speed records!
                                </Text>
                            ) : (
                                Object.entries(stats.bestTimes).map(([cat, secs]: [string, number]) => {
                                    const secNum = Number(secs) || 0;
                                    return (
                                        <View key={cat} style={[styles.bestTimeRow, { borderBottomColor: colors.border }]}>
                                            <Text style={[styles.bestTimeCategory, { color: colors.text }]}>{cat}</Text>
                                            <Text style={[styles.bestTimeVal, { color: colors.primary }]}>
                                                {Math.floor(secNum / 60)}:{(secNum % 60).toString().padStart(2, '0')}
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </View>
                )}

                {/* SUBJECTS TAB */}
                {activeTab === 'subjects' && (
                    <View style={styles.subjectsContainer}>
                        {completedGenres.length === 0 ? (
                            <View style={styles.emptySubjectsBox}>
                                <Icon name="target" size={40} color={colors.primary} />
                                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                                    No subjects mastered yet
                                </Text>
                                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                                    Solve all quotes in any subject to earn a golden mastery certificate!
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.masteryGrid}>
                                {completedGenres.map(genre => {
                                    const progress = getTrackProgress(genre.id, solvedQuotes);
                                    const branches = getBranchesForTrack(genre.id);
                                    const firstPlayableBranch = branches.find(b => (QUOTE_DB[b.id]?.length ?? 0) > 0);
                                    return (
                                        <Pressable
                                            key={genre.id}
                                            onPress={() => navigation.navigate('Game', { genreId: firstPlayableBranch?.id || genre.id })}
                                            style={({ pressed }) => [
                                                styles.masteryCard,
                                                { backgroundColor: colors.surface, borderColor: colors.gold },
                                                pressed && { opacity: 0.8 }
                                            ]}
                                        >
                                            <View style={[styles.masteryIconBox, { backgroundColor: colors.goldBg }]}>
                                                <Icon name={genre.icon as IconName} size={26} color={colors.gold} />
                                            </View>
                                            <Text style={[styles.masteryLabel, { color: colors.text }]}>{genre.label}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Icon name="medal" size={12} color={colors.gold} />
                                                <Text style={[styles.masteryBadge, { color: colors.gold }]}>MASTERED</Text>
                                            </View>
                                            <Text style={[styles.masteryCount, { color: colors.textMuted }]}>
                                                {branches.length > 1 ? `${branches.length} branches · ` : ''}{progress.total}/{progress.total} Puzzles
                                            </Text>
                                        </Pressable>
                                    );
                                })}

                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 14,
        borderBottomWidth: 1,
        gap: 14,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerSub: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        fontFamily: 'serif',
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
    },
    coinText: {
        fontSize: 13,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    rankCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    rankTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rankIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(99,102,241,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    rankTitleText: {
        fontSize: 16,
        fontWeight: '900',
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    achievementsList: {
        gap: 12,
    },
    achCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 12,
    },
    achIconBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    achInfo: {
        flex: 1,
        gap: 4,
    },
    achHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    achTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    coinRewardPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    coinRewardText: {
        fontSize: 10,
        fontWeight: '800',
    },
    achDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 6,
    },
    progressRatio: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    claimBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    claimText: {
        fontSize: 12,
        fontWeight: '800',
    },
    statsContainer: {
        gap: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statBox: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 4,
    },
    statIcon: { fontSize: 24 },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    statTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    bestTimesCard: {
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    emptyHint: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    bestTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    bestTimeCategory: {
        fontSize: 14,
        fontWeight: '700',
    },
    bestTimeVal: {
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    subjectsContainer: {},
    emptySubjectsBox: {
        alignItems: 'center',
        marginTop: 40,
        gap: 10,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    masteryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    masteryCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        gap: 6,
    },
    masteryIconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    masteryLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    masteryBadge: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    masteryCount: {
        fontSize: 11,
    },
});
