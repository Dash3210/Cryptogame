import React, { useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { AppText as Text } from './AppText';
import { useGame } from '../context/GameContext';
import { SPRING_PRESETS, englishFrequencyWeight } from '../utils/physics';

interface VirtualKeyboardProps {
    usedLetters: Set<string>;
    onKeyPress: (char: string) => void;
    onDelete: () => void;
    onNext: () => void;
    blockUsedLetters: boolean;
    /** Shade keys by how common the letter is in English (cryptanalysis aid). */
    frequencyHints?: boolean;
}

const KEYS = [
    'QWERTYUIOP',
    'ASDFGHJKL',
    'ZXCVBNM',
];

interface AnimatedKeyProps {
    char: string;
    isBlocked: boolean;
    width: number;
    height: number;
    colors: any;
    hintWeight: number;
    onPress: (char: string) => void;
}

const AnimatedKeyButton: React.FC<AnimatedKeyProps> = React.memo(({
    char,
    isBlocked,
    width,
    height,
    colors,
    hintWeight,
    onPress,
}) => {
    const pressAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        if (isBlocked) return;
        Animated.spring(pressAnim, { toValue: 1, ...SPRING_PRESETS.KEY_DOWN }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressAnim, { toValue: 0, ...SPRING_PRESETS.KEY_REBOUND }).start();
    };

    const scale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
    const translateY = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2.5] });

    // Three-tier frequency shading: the more common the letter, the more the key
    // is lit. Blocked keys keep the muted "already used" treatment.
    const hintedBackground = hintWeight >= 0.55
        ? colors.primaryBg
        : hintWeight >= 0.28
            ? colors.surfaceHighlight
            : colors.surface;
    const hintedBorder = hintWeight >= 0.55 ? colors.primaryBorder : colors.border;

    return (
        <Pressable
            onPress={() => {
                if (!isBlocked) onPress(char);
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isBlocked}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`Letter ${char}`}
            accessibilityState={{ disabled: isBlocked }}
        >
            <Animated.View
                style={[
                    styles.key,
                    {
                        backgroundColor: isBlocked
                            ? colors.surfaceHighlight
                            : (hintWeight > 0 ? hintedBackground : colors.surface),
                        borderColor: isBlocked
                            ? colors.border
                            : (hintWeight > 0 ? hintedBorder : colors.border),
                        borderBottomColor: colors.border,
                        width,
                        height,
                        transform: [{ scale }, { translateY }],
                    },
                    isBlocked && { opacity: 0.38 },
                ]}
            >
                <Text
                    style={[
                        styles.keyText,
                        {
                            color: isBlocked
                                ? colors.textMuted
                                : (hintWeight >= 0.55 ? colors.primary : colors.text),
                        },
                    ]}
                >
                    {char}
                </Text>
            </Animated.View>
        </Pressable>
    );
});

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = React.memo(({
    usedLetters,
    onKeyPress,
    onDelete,
    onNext,
    blockUsedLetters,
    frequencyHints = false,
}) => {
    const { colors, triggerHaptic } = useGame();
    const { width: windowWidth } = useWindowDimensions();

    // Per-row sizing so every row spans the full width on phones and tablets.
    const sizes = useMemo(() => {
        const hPad = 6;
        const gap = 5;
        const available = windowWidth - hPad * 2;
        const height = 48;
        const maxKey = 56;

        const row1 = Math.max(26, Math.min(maxKey, Math.floor((available - 9 * gap) / 10)));
        const row2 = Math.max(26, Math.min(maxKey, Math.floor((available - 8 * gap) / 9)));
        // Row 3 has 7 letter keys plus two wider action keys (1.35 units each).
        const unit3 = (available - 8 * gap) / 9.7;
        const row3 = Math.max(26, Math.min(maxKey, Math.floor(unit3)));
        const action = Math.max(40, Math.min(78, Math.floor(unit3 * 1.35)));

        return { available, height, row1, row2, row3, action };
    }, [windowWidth]);

    const rowWidths = [sizes.row1, sizes.row2, sizes.row3];

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {KEYS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.split('').map((char) => {
                        const isBlocked = blockUsedLetters && usedLetters.has(char);

                        return (
                            <AnimatedKeyButton
                                key={char}
                                char={char}
                                isBlocked={isBlocked}
                                width={rowWidths[rowIndex]}
                                height={sizes.height}
                                colors={colors}
                                hintWeight={frequencyHints ? englishFrequencyWeight(char) : 0}
                                onPress={onKeyPress}
                            />
                        );
                    })}

                    {/* Action buttons on last row */}
                    {rowIndex === 2 && (
                        <>
                            <Pressable
                                onPress={() => {
                                    triggerHaptic('medium');
                                    onDelete();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Delete letter"
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                style={({ pressed }) => [
                                    styles.key,
                                    styles.actionKey,
                                    {
                                        backgroundColor: colors.surfaceHighlight,
                                        borderColor: colors.border,
                                        width: sizes.action,
                                        height: sizes.height,
                                    },
                                    pressed && { transform: [{ scale: 0.96 }, { translateY: 1 }], borderBottomWidth: 1 },
                                ]}
                            >
                                <Text style={[styles.actionKeyText, { color: colors.textSecondary }]}>⌫</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    triggerHaptic('light');
                                    onNext();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Next empty cell"
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                style={({ pressed }) => [
                                    styles.key,
                                    styles.nextKey,
                                    {
                                        backgroundColor: colors.primaryBg,
                                        borderColor: colors.primaryBorder,
                                        borderBottomColor: colors.primary,
                                        width: sizes.action,
                                        height: sizes.height,
                                    },
                                    pressed && { transform: [{ scale: 0.96 }, { translateY: 1 }], borderBottomWidth: 1 },
                                ]}
                            >
                                <Text style={[styles.nextKeyText, { color: colors.primary }]}>→</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 6,
        paddingBottom: 20,
        borderTopWidth: 1,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    key: {
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderBottomWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    keyText: {
        fontSize: 17,
        fontWeight: '800',
    },
    actionKey: {
        marginLeft: 3,
    },
    actionKeyText: {
        fontSize: 17,
        fontWeight: '800',
        paddingLeft: 2,
    },
    nextKey: {
        marginLeft: 3,
    },
    nextKeyText: {
        fontSize: 17,
        fontWeight: '900',
        marginTop: -1,
    },
});
