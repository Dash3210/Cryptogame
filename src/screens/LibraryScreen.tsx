import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { Track } from '../types';
import { useGame } from '../context/GameContext';
import { SUBJECTS, EXTENSIONS } from '../data/quotes';
import { getTrackProgress, getBranchesForTrack, getBranchProgress } from '../services/quoteService';
import { DailyQuoteModal } from '../components/DailyQuoteModal';
import { UnifiedOperationsStrip } from '../components/UnifiedOperationsStrip';
import { Icon } from '../components/Icon';
import { AdBanner } from '../components/AdBanner';
import { RADIUS } from '../styles/theme';

export const LibraryScreen = () => {
    const navigation = useNavigation<any>();
    const { rank, rankTitle, coins, myExtensions, solvedQuotes, stats, colors, triggerHaptic } = useGame();
    const [searchQuery, setSearchQuery] = useState('');

    const today = new Date().toISOString().split('T')[0];
    const isTodayDailySolved = stats.dailySolvedDates.includes(today);

    const handleSelectBranch = (branchId: string) => {
        triggerHaptic('light');
        navigation.navigate('Game', { genreId: branchId });
    };

    const handleOpenDaily = () => {
        triggerHaptic('light');
        navigation.navigate('DailyChallenge');
    };

    const handleOpenBlitz = () => {
        triggerHaptic('light');
        navigation.navigate('Blitz');
    };

    const allSubjects: Track[] = [
        ...SUBJECTS,
        ...EXTENSIONS.filter(ext => myExtensions.has(ext.id))
    ];

    const filteredSubjects = allSubjects.filter(sub => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        if (sub.label.toLowerCase().includes(query) || sub.description.toLowerCase().includes(query)) {
            return true;
        }
        const branches = getBranchesForTrack(sub.id).filter(b => {
            const bProgress = getBranchProgress(b.id, solvedQuotes || new Set());
            return bProgress.total > 0;
        });
        return branches.some(b =>
            b.label.toLowerCase().includes(query) || (b.description && b.description.toLowerCase().includes(query))
        );
    });

    const renderCard = (subject: Track) => {
        if (!subject || !subject.id) return null;
        const progress = getTrackProgress(subject.id, solvedQuotes || new Set());
        const hasLevels = progress.total > 0;
        const percent = hasLevels ? (progress.completed / progress.total) * 100 : 0;
        const isMastered = hasLevels && progress.completed >= progress.total;
        // Keep the archive numbering stable while searching.
        const sectionIndex = allSubjects.findIndex(s => s.id === subject.id) + 1;
        const branches = getBranchesForTrack(subject.id).filter(b => {
            const bProgress = getBranchProgress(b.id, solvedQuotes || new Set());
            return bProgress.total > 0;
        });

        return (
            <View
                key={subject.id}
                style={styles.gridItem}
                accessibilityRole="summary"
                accessibilityLabel={`${subject.label} subject track`}
            >
                <View style={[
                    styles.card,
                    {
                        backgroundColor: colors.surface,
                        borderColor: isMastered ? colors.primary : colors.border
                    }
                ]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHighlight }]}>
                            <Icon name={subject.icon} fallbackLabel={subject.label} id={subject.id} size={20} color={colors.text} />
                        </View>
                        <View style={styles.cardHeaderTelemetry}>
                            <Text style={[styles.sectionIndexText, { color: colors.textMuted }]}>
                                {`No. ${sectionIndex.toString().padStart(2, '0')}`}
                            </Text>
                            <Text style={[styles.cardRatio, { color: isMastered ? colors.primary : colors.textMuted }]}>
                                {!hasLevels
                                    ? 'AVAILABLE SOON'
                                    : isMastered
                                        ? 'MASTERED'
                                        : `${progress.completed.toString().padStart(2, '0')}/${progress.total.toString().padStart(2, '0')} [${Math.round(percent)}%]`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                            {subject.label}
                        </Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                            {subject.description}
                        </Text>
                    </View>

                    {/* Track Overall Progress Track */}
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    width: hasLevels ? `${Math.max(4, percent)}%` : '0%',
                                    backgroundColor: isMastered ? colors.primary : colors.matching
                                }
                            ]}
                        />
                    </View>

                    {/* Curriculum Branches List */}
                    {branches.length > 0 && (
                        <View style={[styles.branchListContainer, { borderTopColor: colors.border }]}>
                            <View style={styles.branchListHeaderRow}>
                                <Text style={[styles.branchListSectionTitle, { color: colors.textMuted }]}>
                                    {branches.length === 1 ? 'CURRICULUM BRANCH' : `CURRICULUM BRANCHES (${branches.length})`}
                                </Text>
                            </View>
                            {branches.map((branch, bIdx) => {
                                const bProgress = getBranchProgress(branch.id, solvedQuotes || new Set());
                                const bHasLevels = bProgress.total > 0;
                                const bPercent = bHasLevels ? (bProgress.completed / bProgress.total) * 100 : 0;
                                const bMastered = bHasLevels && bProgress.completed >= bProgress.total;

                                if (!bHasLevels) {
                                    return null;
                                }

                                return (
                                    <Pressable
                                        key={branch.id}
                                        style={({ pressed }) => [
                                            styles.branchRow,
                                            { borderTopColor: colors.border },
                                            pressed && { backgroundColor: `${colors.primary}10`, opacity: 0.85 }
                                        ]}
                                        onPress={() => handleSelectBranch(branch.id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Play ${branch.label} branch, ${bProgress.completed} of ${bProgress.total} solved`}
                                        android_ripple={{ color: `${colors.primary}14` }}
                                    >
                                        <View style={styles.branchLeft}>
                                            <Text style={[styles.branchOrderText, { color: colors.textMuted }]}>
                                                {(bIdx + 1).toString().padStart(2, '0')}
                                            </Text>
                                            <View style={styles.branchInfo}>
                                                <Text style={[styles.branchLabel, { color: colors.text }]}>
                                                    {branch.label}
                                                </Text>
                                                {branch.description ? (
                                                    <Text style={[styles.branchDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                                                        {branch.description}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        <View style={styles.branchRight}>
                                            <Text style={[
                                                styles.branchTelemetry,
                                                { color: bMastered ? colors.primary : colors.textMuted }
                                            ]}>
                                                {bMastered
                                                    ? 'MASTERED'
                                                    : `${bProgress.completed}/${bProgress.total}`}
                                            </Text>
                                            <View style={[styles.branchMiniProgressBg, { backgroundColor: colors.surfaceHighlight }]}>
                                                <View
                                                    style={[
                                                        styles.branchMiniProgressFill,
                                                        {
                                                            width: `${Math.max(4, bPercent)}%`,
                                                            backgroundColor: bMastered ? colors.primary : colors.matching
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.branchChevron, { color: colors.textMuted }]}>›</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
        );
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header Section */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: colors.text }]}>BrainCipher</Text>
                    <View style={styles.rankRow}>
                        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.rankSubtitle, { color: colors.textSecondary }]}>{rankTitle.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={[styles.coinBadge, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                        <Text style={[styles.badgeTelemetry, { color: colors.textMuted }]}>
                            Coins <Text style={[styles.coinText, { color: colors.text }]}>{coins}</Text>
                        </Text>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.rankBadge,
                            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                            pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }
                        ]}
                        onPress={() => {
                            triggerHaptic('light');
                            navigation.navigate('Leaderboard');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Leaderboard rank ${rank}`}
                    >
                        <Text style={[styles.badgeTelemetry, { color: colors.primary }]}>
                            Rank <Text style={[styles.rankValue, { color: colors.text }]}>#{rank}</Text>
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Unified Operations Strip */}
                <UnifiedOperationsStrip
                    currentStreak={stats.currentStreak}
                    isDailySolved={isTodayDailySolved}
                    blitzHighScore={stats.blitzHighScore}
                    onOpenDaily={handleOpenDaily}
                    onOpenBlitz={handleOpenBlitz}
                />

                {/* Minimal Integrated Search Bar */}
                <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Icon name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search subjects..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        accessibilityLabel="Search subjects"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable
                            onPress={() => setSearchQuery('')}
                            hitSlop={6}
                            style={styles.clearButtonContainer}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search input"
                        >
                            <Icon name="close" size={14} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>

                {/* Subjects Grid */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Subject Archives</Text>
                    <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                        {filteredSubjects.length} {filteredSubjects.length === 1 ? 'subject' : 'subjects'}
                    </Text>
                </View>

                {filteredSubjects.length === 0 ? (
                    <View style={[styles.emptyResults, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                        <Text style={[styles.emptyResultsTitle, { color: colors.textSecondary }]}>
                            No subjects match "{searchQuery}"
                        </Text>
                        <Text style={[styles.emptyResultsText, { color: colors.textMuted }]}>
                            Try a different name, or clear the filter to see every archive.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {filteredSubjects.map((subject) => renderCard(subject))}
                    </View>
                )}
            </ScrollView>

            {/* Daily Quote Modal retained at bottom */}
            <DailyQuoteModal />

            {/* Banner Ad placed on Library screen */}
            <AdBanner screenName="Library" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        fontFamily: 'serif',
        letterSpacing: 0.2,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    rankSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        fontFamily: 'monospace',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.element,
        borderWidth: 1,
        minHeight: 32,
    },
    badgeTelemetry: {
        fontSize: 11,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    coinText: {
        fontSize: 12,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    rankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.element,
        borderWidth: 1,
        minHeight: 32,
    },
    rankValue: {
        fontSize: 12,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    content: {
        padding: 16,
        gap: 16,
        paddingBottom: 36,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderRadius: RADIUS.element,
        borderWidth: 1,
        gap: 8,
        minHeight: 48,
    },
    searchIcon: {
        fontSize: 16,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    clearButtonContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearIcon: {
        fontSize: 13,
        fontWeight: '700',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    sectionCount: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        fontFamily: 'monospace',
    },
    grid: {
        gap: 12,
    },
    gridItem: {
        width: '100%',
    },
    emptyResults: {
        padding: 20,
        borderRadius: RADIUS.card,
        borderWidth: 1,
        gap: 6,
        alignItems: 'center',
    },
    emptyResultsTitle: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyResultsText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    card: {
        padding: 14,
        borderRadius: RADIUS.card,
        borderWidth: 1,
        gap: 10,
        minHeight: 120,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.element,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 18,
    },
    cardHeaderTelemetry: {
        alignItems: 'flex-end',
        gap: 2,
    },
    sectionIndexText: {
        fontSize: 9,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    cardRatio: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    textContainer: {
        gap: 2,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
    },
    description: {
        fontSize: 12,
        lineHeight: 16,
    },
    progressTrack: {
        height: 4,
        borderRadius: RADIUS.micro,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: RADIUS.micro,
    },
    branchListContainer: {
        marginTop: 6,
        borderTopWidth: 1,
        paddingTop: 8,
    },
    branchListHeaderRow: {
        paddingHorizontal: 2,
        paddingBottom: 4,
    },
    branchListSectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 0.8,
    },
    branchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 4,
        minHeight: 48,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    branchRowDisabled: {
        opacity: 0.65,
    },
    branchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    branchOrderText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'monospace',
        width: 20,
    },
    branchInfo: {
        flex: 1,
    },
    branchLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    branchDescription: {
        fontSize: 11,
        marginTop: 1,
    },
    branchRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    branchTelemetry: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    branchMiniProgressBg: {
        width: 44,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    branchMiniProgressFill: {
        height: 4,
        borderRadius: 2,
    },
    branchChevron: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 2,
    },
    unavailableBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    unavailableBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },

});
