import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { useGame } from '../context/GameContext';
import { RADIUS } from '../styles/theme';

export interface UnifiedOperationsStripProps {
    currentStreak: number;
    isDailySolved: boolean;
    blitzHighScore: number;
    onOpenDaily: () => void;
    onOpenBlitz: () => void;
}

/**
 * UnifiedOperationsStrip
 * 
 * Disciplined cryptographic operations chassis integrating Daily Mission (24h rotation)
 * and Blitz Rush (velocity attack) into a single-tier telemetry instrument.
 * Eliminates competing hero card borders and emoji slop.
 */
export const UnifiedOperationsStrip: React.FC<UnifiedOperationsStripProps> = ({
    currentStreak,
    isDailySolved,
    blitzHighScore,
    onOpenDaily,
    onOpenBlitz,
}) => {
    const { colors, triggerHaptic } = useGame();

    const handleOpenDaily = () => {
        triggerHaptic('light');
        onOpenDaily();
    };

    const handleOpenBlitz = () => {
        triggerHaptic('light');
        onOpenBlitz();
    };

    return (
        <View
            style={[
                styles.container,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                },
            ]}
        >
            {/* Telemetry Top Banner */}
            <View
                style={[
                    styles.telemetryBanner,
                    { borderBottomColor: colors.border },
                ]}
            >
                <Text style={[styles.bannerLabel, { color: colors.textMuted }]}>
                    DAILY & BLITZ
                </Text>
                <Text tabular style={[styles.streakIndicator, { color: colors.primary }]}>
                    {currentStreak === 1 ? '1-day streak' : `${currentStreak}-day streak`}
                </Text>
            </View>

            {/* Dual Full-Height Touch Bays */}
            <View style={styles.baysRow}>
                {/* Bay 1: Daily Mission */}
                <Pressable
                    onPress={handleOpenDaily}
                    style={({ pressed }) => [
                        styles.bay,
                        pressed && styles.pressedBay,
                    ]}
                    android_ripple={{ color: 'rgba(0, 229, 255, 0.12)' }}
                    accessibilityRole="button"
                    accessibilityLabel="Daily Cipher operation"
                >
                    <Text
                        style={[
                            styles.baySubtitle,
                            { color: isDailySolved ? colors.success : colors.primary },
                        ]}
                        numberOfLines={1}
                    >
                        Resets daily
                    </Text>
                    <Text
                        style={[styles.bayTitle, { color: colors.text }]}
                        numberOfLines={1}
                    >
                        Daily Cipher
                    </Text>
                    <Text
                        style={[
                            styles.bayStatus,
                            { color: isDailySolved ? colors.success : colors.primary },
                        ]}
                        numberOfLines={1}
                    >
                        {isDailySolved ? 'Solved today ✓' : "Play today's →"}
                    </Text>
                </Pressable>

                {/* 1px Vertical Hairline Divider */}
                <View style={[styles.bayDivider, { backgroundColor: colors.border }]} />

                {/* Bay 2: Blitz Rush */}
                <Pressable
                    onPress={handleOpenBlitz}
                    style={({ pressed }) => [
                        styles.bay,
                        pressed && styles.pressedBay,
                    ]}
                    android_ripple={{ color: 'rgba(56, 189, 248, 0.12)' }}
                    accessibilityRole="button"
                    accessibilityLabel="Blitz Rush operation"
                >
                    <Text
                        style={[styles.baySubtitle, { color: colors.matching }]}
                        numberOfLines={1}
                    >
                        90 seconds
                    </Text>
                    <Text
                        style={[styles.bayTitle, { color: colors.text }]}
                        numberOfLines={1}
                    >
                        Blitz Rush
                    </Text>
                    <Text
                        tabular
                        style={[styles.bayScore, { color: colors.textSecondary }]}
                        numberOfLines={1}
                    >
                        {`Best ${blitzHighScore} pts · Play →`}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export default UnifiedOperationsStrip;

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: RADIUS.element,
        overflow: 'hidden',
        width: '100%',
    },
    telemetryBanner: {
        borderBottomWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bannerLabel: {
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    streakIndicator: {
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
    },
    baysRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    bay: {
        flex: 1,
        minHeight: 64,
        padding: 12,
        justifyContent: 'center',
    },
    bayDivider: {
        width: 1,
    },
    pressedBay: {
        opacity: 0.82,
    },
    baySubtitle: {
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    bayTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginBottom: 3,
    },
    bayStatus: {
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
    },
    bayScore: {
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
    },
});
