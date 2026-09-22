import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { toDateKey, todayKey } from '../utils/date';

export const DailyChallengeScreen = () => {
    const navigation = useNavigation<any>();
    const { stats, colors, triggerHaptic } = useGame();

    const today = todayKey();
    const isTodaySolved = stats.dailySolvedDates.includes(today);

    // Generate current week calendar dates
    const getWeekDays = () => {
        const days = [];
        const now = new Date();
        const currentDayOfWeek = now.getDay(); // 0 is Sunday
        const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + mondayOffset + i);
            const dateStr = toDateKey(d);
            const isCompleted = stats.dailySolvedDates.includes(dateStr);
            const isCurrent = dateStr === today;
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            days.push({
                name: dayNames[i],
                dayNum: d.getDate(),
                dateStr,
                isCompleted,
                isCurrent,
                isPast: d < now && !isCurrent,
            });
        }
        return days;
    };

    const weekDays = getWeekDays();

    const handlePlayDaily = () => {
        triggerHaptic('medium');
        navigation.navigate('Game', {
            genreId: 'daily',
            mode: 'daily',
            dateStr: today
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => [
                        styles.backBtn,
                        { backgroundColor: colors.surfaceHighlight },
                        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }
                    ]}
                    hitSlop={8}
                >
                    <Text style={[styles.backIcon, { color: colors.textSecondary }]}>â€¹</Text>
                </Pressable>
                <Text style={[styles.title, { color: colors.text }]}>Daily Cipher</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Streak Card */}
                <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.gold }]}>
                    <View style={styles.streakRow}>
                        <View>
                            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>CURRENT STREAK</Text>
                            <View style={styles.streakNumRow}>
                                <Text style={[styles.flameIcon, { color: colors.gold }]}>â–²</Text>
                                <Text style={[styles.streakVal, { color: colors.gold }]}>{stats.currentStreak}</Text>
                                <Text style={[styles.streakUnit, { color: colors.textSecondary }]}>Days</Text>
                            </View>
                        </View>

                        <View style={styles.maxStreakCol}>
                            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>BEST RECORD</Text>
                            <Text style={[styles.maxStreakVal, { color: colors.text }]}>{stats.maxStreak} Days</Text>
                        </View>
                    </View>

                    {/* Calendar Row */}
                    <View style={styles.calendarRow}>
                        {weekDays.map(day => (
                            <View
                                key={day.dateStr}
                                style={[
                                    styles.calendarDay,
                                    {
                                        backgroundColor: day.isCompleted
                                            ? colors.successBg
                                            : day.isCurrent
                                                ? colors.primaryBg
                                                : colors.surfaceHighlight,
                                        borderColor: day.isCompleted
                                            ? colors.success
                                            : day.isCurrent
                                                ? colors.primary
                                                : colors.border,
                                    }
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dayName,
                                        {
                                            color: day.isCompleted
                                                ? colors.success
                                                : day.isCurrent
                                                    ? colors.primary
                                                    : colors.textMuted
                                        }
                                    ]}
                                >
                                    {day.name}
                                </Text>
                                <Text
                                    style={[
                                        styles.dayNumber,
                                        {
                                            color: day.isCompleted
                                                ? colors.success
                                                : day.isCurrent
                                                    ? colors.primary
                                                    : colors.text
                                        }
                                    ]}
                                >
                                    {day.isCompleted ? 'âœ“' : day.dayNum}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Today's Mission Card */}
                <View style={[styles.missionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
                        <Text style={{ fontSize: 30, color: colors.primary }}>âŠž</Text>
                    </View>

                    <Text style={[styles.missionTitle, { color: colors.text }]}>Today's Cryptogram</Text>
                    <Text style={[styles.missionDesc, { color: colors.textSecondary }]}>
                        A brand new secret quote seeded for today. Solve it to keep your streak alive.
                    </Text>

                    <View style={styles.rewardsRow}>
                        <View style={[styles.rewardBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Text style={[styles.rewardIcon, { color: colors.gold }]}>â—Ž</Text>
                            <Text style={[styles.rewardText, { color: colors.text }]}>Up to 60 Coins</Text>
                        </View>
                        <View style={[styles.rewardBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Text style={[styles.rewardIcon, { color: colors.gold }]}>â–²</Text>
                            <Text style={[styles.rewardText, { color: colors.text }]}>+1 Streak</Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={handlePlayDaily}
                        style={({ pressed }) => [
                            styles.playBtn,
                            {
                                backgroundColor: isTodaySolved ? colors.success : colors.primary,
                                shadowColor: isTodaySolved ? colors.success : colors.primary,
                            },
                            pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                        ]}
                    >
                        <Text style={styles.playBtnText}>
                            {isTodaySolved ? 'Replay (practice, no rewards)' : 'Decipher Today\'s Quote â†’'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: { fontSize: 24, fontWeight: '800', marginTop: -2 },
    title: { fontSize: 22, fontWeight: '900', fontFamily: 'serif' },
    content: { padding: 20, gap: 20 },
    streakCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 2,
        gap: 18,
    },
    streakRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    streakLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    streakNumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    flameIcon: { fontSize: 26 },
    streakVal: {
        fontSize: 32,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    streakUnit: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 8,
    },
    maxStreakCol: {
        alignItems: 'flex-end',
    },
    maxStreakVal: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 4,
        fontFamily: 'monospace',
    },
    calendarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    calendarDay: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        gap: 2,
    },
    dayName: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    dayNumber: {
        fontSize: 13,
        fontWeight: '900',
    },
    missionCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    missionTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    missionDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    rewardsRow: {
        flexDirection: 'row',
        gap: 10,
        marginVertical: 4,
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    rewardIcon: { fontSize: 14 },
    rewardText: { fontSize: 12, fontWeight: '700' },
    playBtn: {
        width: '100%',
        paddingVertical: 16,
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    playBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
});
