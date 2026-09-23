import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { SUBJECTS, EXTENSIONS } from '../data/quotes';
import { getAllGenresProgress } from '../services/quoteService';
import { Icon, IconName } from '../components/Icon';

export const LeaderboardScreen = () => {
    const navigation = useNavigation<any>();
    const {
        totalPoints,
        rank,
        rankTitle,
        solvedQuotes,
        colors,
        triggerHaptic,
        playGamesUser,
        signInPlayGames,
        openPlayGamesLeaderboard,
    } = useGame();

    const [activeTab, setActiveTab] = useState<'global' | 'genres'>('global');

    const genreProgressData = useMemo(() => {
        try {
            const allGenres = [...(SUBJECTS || []), ...(EXTENSIONS || [])];
            const progressMap = getAllGenresProgress(solvedQuotes);
            return allGenres.map(genre => {
                const progress = progressMap[genre.id] || { completed: 0, total: 0 };
                const completionPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                return { genre, completed: progress.completed, total: progress.total, completionPercent };
            }).filter(item => item.total > 0)
                .sort((a, b) => b.completionPercent - a.completionPercent);
        } catch {
            return [];
        }
    }, [solvedQuotes]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.headerTitleRow}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            navigation.goBack();
                        }}
                        hitSlop={16}
                        style={({ pressed }) => [
                            styles.backButton,
                            { backgroundColor: colors.surfaceHighlight },
                            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }
                        ]}
                    >
                        <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>‹</Text>
                    </Pressable>
                    <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'global' ? { borderBottomColor: colors.primary } : { borderBottomColor: 'transparent' }
                    ]}
                    onPress={() => {
                        triggerHaptic('light');
                        setActiveTab('global');
                    }}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'global' ? colors.primary : colors.textMuted }
                    ]}>Global Rankings</Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'genres' ? { borderBottomColor: colors.primary } : { borderBottomColor: 'transparent' }
                    ]}
                    onPress={() => {
                        triggerHaptic('light');
                        setActiveTab('genres');
                    }}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'genres' ? colors.primary : colors.textMuted }
                    ]}>Subject Mastery</Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'global' ? (
                    <>
                        {/* Google Play Games Interactive Status & Action Card */}
                        <View style={[styles.playGamesCard, { backgroundColor: colors.surface, borderColor: playGamesUser.isAuthenticated ? colors.success : colors.border }]}>
                            <View style={styles.playGamesHeader}>
                                <View style={styles.playGamesBadge}>
                                    <Icon name="trophy" size={28} color={colors.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.playGamesTitle, { color: colors.text }]}>Google Play Games</Text>
                                        <Text style={[styles.playGamesSubtitle, { color: playGamesUser.isAuthenticated ? colors.success : colors.textMuted }]}>
                                            {playGamesUser.isAuthenticated 
                                                ? `Connected: ${playGamesUser.displayName || 'Gamer'}` 
                                                : 'Connect to sync rankings with friends & world'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {playGamesUser.isAuthenticated ? (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.playGamesButton,
                                        { backgroundColor: colors.primary },
                                        pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                                    ]}
                                    onPress={() => {
                                        triggerHaptic('medium');
                                        openPlayGamesLeaderboard();
                                    }}
                                >
                                    <Text style={styles.playGamesButtonText}>Open Play Games Leaderboard</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.playGamesButton,
                                        { backgroundColor: '#0F9D58' },
                                        pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                                    ]}
                                    onPress={async () => {
                                        triggerHaptic('light');
                                        await signInPlayGames();
                                    }}
                                >
                                    <Text style={styles.playGamesButtonText}>Sign In with Google Play</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Local cipher rank (computed, not fabricated) */}
                        <View style={[styles.rankCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                            <View style={styles.rankRow}>
                                <View>
                                    <Text style={[styles.rankLabel, { color: colors.primary }]}>Your Cipher Rank</Text>
                                    <Text style={[styles.rankValue, { color: colors.text }]}>#{rank}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.rankLabel, { color: colors.primary }]}>Title</Text>
                                    <Text style={[styles.rankTitleValue, { color: colors.text }]}>{rankTitle}</Text>
                                </View>
                            </View>
                            <View style={[styles.scorePill, { backgroundColor: colors.primary }]}>
                                <Text style={styles.scorePillText}>{totalPoints.toLocaleString()} pts</Text>
                            </View>
                        </View>

                        {/* Honest empty state: we do not have a real global feed unless Play Games is configured */}
                        <View style={[styles.emptyRankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.emptyRankTitle, { color: colors.text }]}>Worldwide rankings</Text>
                            <Text style={[styles.emptyRankBody, { color: colors.textSecondary }]}>
                                Global ranks and friend scores come from Google Play Games. Open the Play Games leaderboard above to see the live standings.
                            </Text>
                        </View>
                    </>
                ) : (
                    /* Mastery Tab */
                    <View style={styles.masteryList}>
                        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                            Completion progress across all science and knowledge categories
                        </Text>
                        {genreProgressData.map(({ genre, completed, total, completionPercent }) => (
                            <View
                                key={genre.id}
                                style={[
                                    styles.masteryCard,
                                    { backgroundColor: colors.surface, borderColor: colors.border }
                                ]}
                            >
                                <View style={[styles.masteryIconContainer, { backgroundColor: colors.surfaceHighlight }]}>
                                    <Icon name={genre.icon as IconName} size={22} color={colors.text} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.masteryLabel, { color: colors.text }]}>{genre.label}</Text>
                                    <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceHighlight }]}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${completionPercent}%` as any,
                                                backgroundColor: completionPercent === 100 ? colors.gold : colors.primary
                                            }
                                        ]} />
                                    </View>
                                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                                        {completed} / {total} ({completionPercent}%)
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    backButtonText: { fontSize: 24, fontWeight: '800', marginTop: -2 },
    title: { fontSize: 22, fontWeight: '900', fontFamily: 'serif' },
    tabs: { flexDirection: 'row' },
    tab: { flex: 1, minHeight: 48, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2 },
    tabText: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 },
    content: { padding: 16, paddingBottom: 40 },
    rankCard: { padding: 14, borderRadius: 20, marginBottom: 16, borderWidth: 1.5 },
    rankRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    rankLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    rankValue: { fontSize: 32, fontWeight: '900', fontFamily: 'monospace' },
    rankTitleValue: { fontSize: 16, fontWeight: '800' },
    scorePill: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
    scorePillText: { color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: 13 },
    emptyRankCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6, marginBottom: 16 },
    emptyRankTitle: { fontWeight: '800', fontSize: 15 },
    emptyRankBody: { fontSize: 13, lineHeight: 19 },
    masteryList: { gap: 12 },
    subtext: { textAlign: 'center', marginBottom: 12, fontSize: 13 },
    masteryCard: { padding: 12, borderRadius: 20, flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1 },
    masteryIconContainer: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    masteryIcon: { fontSize: 24 },
    masteryLabel: { fontWeight: '800', fontSize: 14, marginBottom: 6 },
    progressBarBg: { height: 6, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
    progressBarFill: { height: 6 },
    progressText: { fontSize: 11, fontWeight: '700' },
    playGamesCard: { padding: 14, borderRadius: 20, marginBottom: 16, borderWidth: 1.5 },
    playGamesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    playGamesBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    playGamesIcon: { fontSize: 28 },
    playGamesTitle: { fontSize: 15, fontWeight: '800' },
    playGamesSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    playGamesButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    playGamesButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
});
