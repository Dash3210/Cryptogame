import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { Icon } from '../components/Icon';
import { toDateKey, todayKey } from '../utils/date';
import { getShopItem } from '../data/shop';

export const DailyChallengeScreen = () => {
    const navigation = useNavigation<any>();
    const { stats, coins, purchase, colors, triggerHaptic } = useGame();

    const today = todayKey();
    const isTodaySolved = stats.dailySolvedDates.includes(today);

    const freezeItem = getShopItem('streak_freeze');
    const freezePrice = freezeItem?.price ?? 200;

    const handleEquipStreakFreeze = () => {
        triggerHaptic('light');
        Alert.alert(
            "Equip Streak Freeze",
            `Spend ${freezePrice} coins to equip a Streak Freeze?\n\nProtects one missed day on your daily streak.\n\nCurrent balance: ${coins} coins`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Equip",
                    onPress: () => {
                        const result = purchase('streak_freeze');
                        if (result === 'OK') {
                            Alert.alert("Streak Freeze Equipped!", "Your daily streak is now protected against one missed day.");
                        } else if (result === 'INSUFFICIENT_FUNDS') {
                            Alert.alert("Not Enough Coins", `You need ${freezePrice} coins to equip a Streak Freeze. You currently have ${coins} coins.`);
                        } else if (result === 'ALREADY_OWNED') {
                            Alert.alert("Already Active", "You already have an active Streak Freeze.");
                        }
                    }
                }
            ]
        );
    };

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
                <View style={styles.headerLeft}>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={({ pressed }) => [
                            styles.backBtn,
                            { backgroundColor: colors.surfaceHighlight },
                            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }
                        ]}
                        hitSlop={8}
                    >
                        <Text style={[styles.backIcon, { color: colors.textSecondary }]}>‹</Text>
                    </Pressable>
                    <Text style={[styles.title, { color: colors.text }]}>Daily Cipher</Text>
                </View>

                <View style={[styles.coinBadge, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                    <Icon name="coin" size={15} color={colors.gold} />
                    <Text tabular style={[styles.coinVal, { color: colors.gold }]}>{coins}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Streak Card */}
                <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.gold }]}>
                    <View style={styles.streakRow}>
                        <View>
                            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>CURRENT STREAK</Text>
                            <View style={styles.streakNumRow}>
                                <Icon name="flame" size={22} color={colors.gold} />
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
                                    {day.isCompleted ? '✓' : day.dayNum}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Streak Freeze Card */}
                    <View style={[
                        styles.freezeCard,
                        {
                            backgroundColor: stats.hasStreakFreeze ? colors.primaryBg : colors.surfaceHighlight,
                            borderColor: stats.hasStreakFreeze ? colors.primary : colors.border
                        }
                    ]}>
                        <View style={styles.freezeRow}>
                            <View style={[styles.freezeIconBox, { backgroundColor: stats.hasStreakFreeze ? colors.primary : colors.surface }]}>
                                <Icon name={stats.hasStreakFreeze ? "shield" : "flame"} size={18} color={stats.hasStreakFreeze ? "#000" : colors.textMuted} />
                            </View>
                            <View style={styles.freezeTextCol}>
                                <View style={styles.freezeHeaderRow}>
                                    <Text style={[styles.freezeTitle, { color: colors.text }]}>Streak Freeze</Text>
                                    {stats.hasStreakFreeze && (
                                        <View style={[styles.freezeActiveBadge, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.freezeActiveText}>ACTIVE</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.freezeDesc, { color: colors.textSecondary }]}>
                                    {stats.hasStreakFreeze
                                        ? 'Protected! Your next missed daily cipher will be forgiven.'
                                        : 'Protects 1 missed day without breaking your streak chain.'}
                                </Text>
                            </View>
                            {!stats.hasStreakFreeze && (
                                <Pressable
                                    onPress={handleEquipStreakFreeze}
                                    style={({ pressed }) => [
                                        styles.freezeBuyBtn,
                                        { backgroundColor: colors.gold },
                                        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }
                                    ]}
                                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Equip Streak Freeze for ${freezePrice} coins`}
                                >
                                    <Text tabular style={styles.freezeBuyText}>{freezePrice} coins</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </View>

                {/* Today's Mission Card */}
                <View style={[styles.missionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
                        <Icon name="puzzle" size={30} color={colors.primary} />
                    </View>

                    <Text style={[styles.missionTitle, { color: colors.text }]}>Today's Cryptogram</Text>
                    <Text style={[styles.missionDesc, { color: colors.textSecondary }]}>
                        A brand new secret quote seeded for today. Solve it to keep your streak alive.
                    </Text>

                    <View style={styles.rewardsRow}>
                        <View style={[styles.rewardBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Icon name="coin" size={14} color={colors.gold} />
                            <Text style={[styles.rewardText, { color: colors.text }]}>Up to 60 Coins</Text>
                        </View>
                        <View style={[styles.rewardBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Icon name="flame" size={14} color={colors.gold} />
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
                            {isTodaySolved ? 'Replay (practice, no rewards)' : 'Decipher Today\'s Quote →'}
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
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
    },
    coinVal: {
        fontSize: 13,
        fontWeight: '800',
        fontFamily: 'monospace',
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
    freezeCard: {
        marginTop: 14,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    freezeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    freezeIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freezeTextCol: {
        flex: 1,
        gap: 2,
    },
    freezeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    freezeTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    freezeActiveBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    freezeActiveText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 0.5,
    },
    freezeDesc: {
        fontSize: 11,
        lineHeight: 15,
    },
    freezeBuyBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freezeBuyText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000',
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
