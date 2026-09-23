import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { Icon } from '../components/Icon';

export const BlitzScreen = () => {
    const navigation = useNavigation<any>();
    const { stats, colors, triggerHaptic } = useGame();

    const handleStartBlitz = () => {
        triggerHaptic('heavy');
        navigation.navigate('Game', {
            genreId: 'blitz',
            mode: 'blitz'
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
                        pressed && { opacity: 0.6 }
                    ]}
                >
                    <Text style={[styles.backIcon, { color: colors.textSecondary }]}>‹</Text>
                </Pressable>
                <Text style={[styles.title, { color: colors.text }]}>Blitz Rush</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero High Score Banner */}
                <View style={[styles.heroCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                    <Icon name="bolt" size={40} color={colors.primary} />
                    <Text style={[styles.heroLabel, { color: colors.primary }]}>PERSONAL BEST</Text>
                    <Text style={[styles.heroScore, { color: colors.primary }]}>
                        {stats.blitzHighScore.toLocaleString()}
                    </Text>
                    <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Best run in points</Text>
                </View>

                {/* Rules & Mechanics */}
                <View style={[styles.rulesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.rulesHeader, { color: colors.text }]}>How Blitz Rush Works</Text>

                    <View style={styles.ruleRow}>
                        <View style={[styles.ruleBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Icon name="timer" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.ruleTextCol}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>90-Second Clock</Text>
                            <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                                Solve short bite-sized ciphers before the clock runs out.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.ruleRow}>
                        <View style={[styles.ruleBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Text style={[styles.ruleIcon, { color: colors.primary }]}>+</Text>
                        </View>
                        <View style={styles.ruleTextCol}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>+15s Time Extension</Text>
                            <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                                Every cryptogram you solve extends your remaining time.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.ruleRow}>
                        <View style={[styles.ruleBadge, { backgroundColor: colors.surfaceHighlight }]}>
                            <Icon name="combo" size={20} color={colors.gold} />
                        </View>
                        <View style={styles.ruleTextCol}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Combo Multipliers</Text>
                            <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                                Chain correct letters without mistakes to boost your points up to 2.5x. When the clock runs out, points convert to coins at 20:1 (minimum 5).
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Start Button */}
                <Pressable
                    onPress={handleStartBlitz}
                    style={({ pressed }) => [
                        styles.startBtn,
                        { backgroundColor: colors.primary, shadowColor: colors.primary },
                        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }
                    ]}
                >
                    <Text style={styles.startBtnText}>START BLITZ RUSH</Text>
                </Pressable>
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
    heroCard: {
        padding: 24,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        gap: 4,
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    heroScore: {
        fontSize: 44,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    heroSub: {
        fontSize: 13,
        fontWeight: '600',
    },
    rulesCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        gap: 16,
    },
    rulesHeader: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    ruleRow: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    ruleBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ruleIcon: { fontSize: 20 },
    ruleTextCol: { flex: 1 },
    ruleTitle: { fontSize: 15, fontWeight: '700' },
    ruleDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
    startBtn: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    startBtnText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
