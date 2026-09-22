import React from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { AppText as Text } from './AppText';
import { GameStatus } from '../types';
import { useGame } from '../context/GameContext';
import { RADIUS } from '../styles/theme';

export interface HeaderProps {
    status: GameStatus;
    category: string;
    onBack: () => void;
    onHint: () => void;
    onUseKey: () => void;
    onSettings: () => void;
    onToggleFrequency?: () => void;
    showFrequency?: boolean;
    canHint: boolean;
    freeHints: number;
    timer: number;
    hideTimer?: boolean;
    comboMultiplier?: number;
    isBlitz?: boolean;
}

/**
 * Header Component
 * 
 * Disciplined, high-precision cryptographic instrument header calibrated strictly
 * for Android mobile touchscreens. Guarantees >= 48dp effective touch targets,
 * avoids horizontal squeeze on 360dp viewports, and eliminates toy emoji clutter.
 */
export const Header: React.FC<HeaderProps> = ({
    status,
    category,
    onBack,
    onHint,
    onUseKey,
    onSettings,
    onToggleFrequency,
    showFrequency,
    canHint,
    freeHints,
    timer,
    hideTimer,
    comboMultiplier = 1.0,
    isBlitz,
}) => {
    const { colors, coins, triggerHaptic } = useGame();
    const { width: windowWidth } = useWindowDimensions();

    // Android phones are commonly 360dp wide. Compact trims labels and padding so
    // the tool cluster fits without clipping; tiny drops non-essential badges.
    const compact = windowWidth < 390;
    const tiny = windowWidth < 340;

    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const isPlaying = status === GameStatus.PLAYING;

    return (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {/* Left Section: Back button & Category/Timer Metadata */}
            <View style={[styles.leftSection, compact && styles.leftSectionCompact]}>
                <Pressable
                    onPress={() => {
                        triggerHaptic('light');
                        onBack();
                    }}
                    style={({ pressed }) => [
                        styles.backButton,
                        { backgroundColor: colors.surfaceHighlight },
                        pressed && styles.pressed,
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Back to library"
                    accessibilityRole="button"
                >
                    <Text style={[styles.backIcon, { color: colors.textSecondary }]}>‹</Text>
                </Pressable>

                <View style={styles.metaContainer}>
                    <Text style={[styles.categoryText, { color: colors.text }]} numberOfLines={1}>
                        {category}
                    </Text>
                    <View style={styles.timerRow}>
                        {!hideTimer && (
                            <Text
                                tabular
                                style={[
                                    styles.timerText,
                                    { color: isBlitz && timer <= 15 ? colors.error : colors.textSecondary },
                                ]}
                            >
                                {isBlitz ? `[BLITZ] ${timeString}` : timeString}
                            </Text>
                        )}
                        {/* Combo stays visible even when the timer is hidden. */}
                        {comboMultiplier > 1.0 && (
                            <Text tabular style={[styles.comboBadge, { color: colors.matching }]}>
                                {comboMultiplier.toFixed(1)}x combo
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Right Section: Tactile Controls & Balances */}
            <View style={[styles.rightSection, compact && styles.rightSectionCompact]}>
                {/* Balance Badge: Tactile telemetry pill */}
                {!tiny && (
                    <View style={[styles.coinBadge, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                        {!compact && <Text style={[styles.coinLabel, { color: colors.textMuted }]}>CR</Text>}
                        <Text tabular style={[styles.coinText, { color: colors.text }]}>{coins}</Text>
                    </View>
                )}

                {/* Spectroscopy / Frequency Toggle */}
                {onToggleFrequency && !tiny && (
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            onToggleFrequency();
                        }}
                        style={({ pressed }) => [
                            styles.toolButton,
                            {
                                backgroundColor: showFrequency ? colors.primaryBg : colors.surfaceHighlight,
                                borderColor: showFrequency ? colors.primary : colors.border,
                            },
                            pressed && styles.pressed,
                        ]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Toggle Frequency Spectroscopy"
                        accessibilityRole="button"
                    >
                        <Text style={[styles.toolButtonText, { color: showFrequency ? colors.primary : colors.textSecondary }]}>
                            ∿
                        </Text>
                    </Pressable>
                )}

                {/* Settings Button */}
                <Pressable
                    onPress={() => {
                        triggerHaptic('light');
                        onSettings();
                    }}
                    style={({ pressed }) => [
                        styles.toolButton,
                        { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                        pressed && styles.pressed,
                    ]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityLabel="Settings"
                    accessibilityRole="button"
                >
                    <Text style={[styles.toolButtonText, { color: colors.textSecondary }]}>⚙</Text>
                </Pressable>

                {/* Key (Solve All) Button */}
                {isPlaying && (
                    <Pressable
                        onPress={() => {
                            triggerHaptic('medium');
                            onUseKey();
                        }}
                        style={({ pressed }) => [
                            styles.actionButton,
                            compact && styles.actionButtonCompact,
                            { backgroundColor: colors.surfaceHighlight, borderColor: colors.error },
                            pressed && styles.pressed,
                        ]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Use Key"
                        accessibilityRole="button"
                    >
                        <Text style={[styles.actionButtonText, { color: colors.error }]}>KEY</Text>
                    </Pressable>
                )}

                {/* Hint Button */}
                {isPlaying && (
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            onHint();
                        }}
                        disabled={!canHint}
                        style={({ pressed }) => [
                            styles.actionButton,
                            compact && styles.actionButtonCompact,
                            {
                                backgroundColor: canHint ? (freeHints > 0 ? colors.primaryBg : colors.goldBg) : colors.surfaceHighlight,
                                borderColor: canHint ? (freeHints > 0 ? colors.primary : colors.gold) : colors.border,
                            },
                            !canHint && styles.disabled,
                            pressed && styles.pressed,
                        ]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Hint"
                        accessibilityRole="button"
                    >
                        <Text
                            style={[
                                styles.actionButtonText,
                                { color: canHint ? (freeHints > 0 ? colors.primary : colors.gold) : colors.textMuted },
                            ]}
                        >
                            {freeHints > 0
                                ? (compact ? `HINT ${freeHints}` : `HINT (${freeHints})`)
                                : (compact ? 'HINT AD' : 'HINT (AD)')}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 100,
    },
    leftSectionCompact: {
        minWidth: 72,
        gap: 6,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.element,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: -2,
    },
    pressed: {
        opacity: 0.75,
        transform: [{ scale: 0.96 }],
    },
    metaContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timerText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    comboBadge: {
        fontSize: 11,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        flexShrink: 0,
    },
    rightSectionCompact: {
        gap: 4,
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minHeight: 40,
        borderRadius: RADIUS.micro,
        borderWidth: 1,
    },
    coinLabel: {
        fontSize: 9,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    coinText: {
        fontSize: 12,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    toolButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.element,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    actionButton: {
        paddingHorizontal: 12,
        minHeight: 48,
        borderRadius: RADIUS.element,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonCompact: {
        paddingHorizontal: 8,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    disabled: {
        opacity: 0.35,
    },
});
