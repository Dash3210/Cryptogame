import React, { useRef } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { AppText as Text } from './AppText';
import { useGame } from '../context/GameContext';
import { SPRING_PRESETS } from '../utils/physics';

interface VirtualKeyboardProps {
    usedLetters: Set<string>;
    onKeyPress: (char: string) => void;
    onDelete: () => void;
    onNext: () => void;
    blockUsedLetters: boolean;
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
    onPress: (char: string) => void;
}

const AnimatedKeyButton: React.FC<AnimatedKeyProps> = React.memo(({
    char,
    isBlocked,
    width,
    height,
    colors,
    onPress,
}) => {
    const pressAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        if (isBlocked) return;
        Animated.spring(pressAnim, {
            toValue: 1,
            ...SPRING_PRESETS.KEY_DOWN,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressAnim, {
            toValue: 0,
            ...SPRING_PRESETS.KEY_REBOUND,
        }).start();
    };

    const scale = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
    });

    const translateY = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2.5],
    });

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
                        backgroundColor: isBlocked ? colors.surfaceHighlight : colors.surface,
                        borderColor: colors.border,
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
                            color: isBlocked ? colors.textMuted : colors.text,
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
}) => {
    const { colors, triggerHaptic } = useGame();
    const { width: windowWidth } = useWindowDimensions();

    // Responsive key width calculation (fits screens from 320px to tablets)
    const horizontalPadding = 8;
    const keyGap = 4;
    const maxRowKeys = 10;
    const availableWidth = windowWidth - horizontalPadding * 2;
    const calculatedKeyW = Math.floor((availableWidth - (maxRowKeys - 1) * keyGap) / maxRowKeys);
    const keyW = Math.max(28, Math.min(36, calculatedKeyW));
    const keyH = 48;
    const actionW = Math.max(44, Math.min(52, keyW * 1.45));

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {KEYS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.split('').map((char) => {
                        const isUsed = usedLetters.has(char);
                        const isBlocked = blockUsedLetters && isUsed;

                        return (
                            <AnimatedKeyButton
                                key={char}
                                char={char}
                                isBlocked={isBlocked}
                                width={keyW}
                                height={keyH}
                                colors={colors}
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
                                        width: actionW,
                                        height: keyH,
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
                                        width: actionW,
                                        height: keyH,
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
        paddingHorizontal: 4,
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
        gap: 4,
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
