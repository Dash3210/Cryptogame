import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { SUBJECTS, EXTENSIONS } from '../data/quotes';
import { getGenreProgress } from '../services/quoteService';
import { DailyQuoteModal } from '../components/DailyQuoteModal';
import { UnifiedOperationsStrip } from '../components/UnifiedOperationsStrip';
import { RADIUS } from '../styles/theme';

export const LibraryScreen = () => {
    const navigation = useNavigation<any>();
    const { rank, rankTitle, coins, myExtensions, solvedQuotes, stats, colors, triggerHaptic } = useGame();
    const [searchQuery, setSearchQuery] = useState('');

    const today = new Date().toISOString().split('T')[0];
    const isTodayDailySolved = stats.dailySolvedDates.includes(today);

    const handleSelectGenre = (genreId: string) => {
        triggerHaptic('light');
        navigation.navigate('Game', { genreId });
    };

    const handleOpenDaily = () => {
        triggerHaptic('light');
        navigation.navigate('DailyChallenge');
    };

    const handleOpenBlitz = () => {
        triggerHaptic('light');
        navigation.navigate('Blitz');
    };

    const allSubjects = [
        ...SUBJECTS,
        ...EXTENSIONS.filter(ext => myExtensions.has(ext.id))
    ];

    const filteredSubjects = allSubjects.filter(sub =>
        sub.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCard = (subject: any) => {
        if (!subject || !subject.id) return null;
        const progress = getGenreProgress(subject.id, solvedQuotes || new Set());
        const percent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        const isMastered = percent >= 100;
        // Keep the archive numbering stable while searching.
        const sectionIndex = allSubjects.findIndex(s => s.id === subject.id) + 1;

        return (
            <Pressable
                key={subject.id}
                style={({ pressed }) => [
                    styles.gridItem,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => handleSelectGenre(subject.id)}
                android_ripple={{ color: `${colors.primary}14` }}
                accessibilityRole="button"
                accessibilityLabel={`${subject.label} subject archive`}
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
                            <Text style={styles.icon}>{subject.icon}</Text>
                        </View>
                        <View style={styles.cardHeaderTelemetry}>
                            <Text style={[styles.sectionIndexText, { color: colors.textMuted }]}>
                                {`No. ${sectionIndex.toString().padStart(2, '0')}`}
                            </Text>
                            <Text style={[styles.cardRatio, { color: isMastered ? colors.primary : colors.textMuted }]}>
                                {isMastered
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

                    {/* Minimal Cryptographic Progress Track */}
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    width: `${Math.max(4, percent)}%`,
                                    backgroundColor: isMastered ? colors.primary : colors.matching
                                }
                            ]}
                        />
                    </View>
                </View>
            </Pressable>
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
                    <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
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
                            <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    gridItem: {
        // 48% + gap fits two columns on 320-360dp screens; 48.5% overflowed by a
        // fraction of a pixel and wrapped to a broken single column.
        width: '48%',
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
        padding: 12,
        borderRadius: RADIUS.card,
        borderWidth: 1,
        gap: 10,
        minHeight: 120,
        justifyContent: 'space-between',
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
        fontSize: 14,
        fontWeight: '700',
    },
    description: {
        fontSize: 11,
        lineHeight: 15,
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
});
