import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Animated,
    AccessibilityInfo,
    LayoutChangeEvent,
} from 'react-native';
import { AppText as Text } from './AppText';
import { LetterFrequency } from '../types';
import { useGame } from '../context/GameContext';
import {
    SPRING_PRESETS,
    ENGLISH_LETTER_FREQUENCIES,
    ENGLISH_FREQUENCY_RANK,
    triggerTactileHaptic,
} from '../utils/physics';
import { ThemeColors } from '../styles/theme';

interface FrequencyBarProps {
    frequencies: LetterFrequency[];
    selectedCipherChar: string | null;
    onSelectCipherChar: (cipherChar: string) => void;
}

interface SpectralChipProps {
    item: LetterFrequency;
    rankIndex: number;
    maxFrequency: number;
    totalLetters: number;
    isSelected: boolean;
    isReducedMotion: boolean;
    colors: ThemeColors;
    hapticsEnabled: boolean;
    onSelect: (cipherChar: string) => void;
    onLayout: (cipherChar: string, x: number, width: number) => void;
}

const SpectralChip: React.FC<SpectralChipProps> = React.memo(({
    item,
    rankIndex,
    maxFrequency,
    totalLetters,
    isSelected,
    isReducedMotion,
    colors,
    hapticsEnabled,
    onSelect,
    onLayout,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    // Teardown ongoing animations on unmount
    useEffect(() => {
        return () => {
            scaleAnim.stopAnimation();
            glowAnim.stopAnimation();
        };
    }, [scaleAnim, glowAnim]);

    // Magnetic lock spring and luminescence pulse on selection
    useEffect(() => {
        if (isReducedMotion) {
            scaleAnim.setValue(1);
            glowAnim.setValue(isSelected ? 1 : 0);
            return;
        }

        if (isSelected) {
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.12, duration: 90, useNativeDriver: true }),
                    Animated.spring(scaleAnim, { toValue: 1.04, ...SPRING_PRESETS.SPECTRAL_SNAP }),
                ]),
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
                    Animated.spring(glowAnim, { toValue: 0.85, ...SPRING_PRESETS.SPECTRAL_PULSE }),
                ]),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, ...SPRING_PRESETS.SPECTRAL_SNAP }),
                Animated.timing(glowAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start();
        }
    }, [isSelected, isReducedMotion, scaleAnim, glowAnim]);

    const handlePress = useCallback(() => {
        triggerTactileHaptic('ripple', hapticsEnabled);
        onSelect(item.cipherChar);
    }, [item.cipherChar, hapticsEnabled, onSelect]);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const { x, width } = e.nativeEvent.layout;
        onLayout(item.cipherChar, x, width);
    }, [item.cipherChar, onLayout]);

    // Spectral emission line geometry
    const emissionRatio = maxFrequency > 0 ? Math.max(0.15, item.frequency / maxFrequency) : 0.2;
    const emissionHeight = Math.round(emissionRatio * 28);
    const letterPercent = totalLetters > 0 ? Math.max(1, Math.round((item.frequency / totalLetters) * 100)) : 0;

    // Reference English baseline for this rank order
    const englishBenchmarkChar = ENGLISH_FREQUENCY_RANK[rankIndex] || '';
    const englishBenchmarkPercent = englishBenchmarkChar ? ENGLISH_LETTER_FREQUENCIES[englishBenchmarkChar] : undefined;

    const formatBenchmarkPercent = (pct: number | undefined): string => {
        if (pct === undefined) return '';
        if (pct < 1 && pct > 0) return ' <1%';
        return ` ${Math.round(pct)}%`;
    };

    const isSolved = item.solved;
    const rayColor = isSelected
        ? colors.matching
        : isSolved
            ? colors.success
            : colors.primary;

    const accessibilityLabel = `Cipher letter ${item.cipherChar}, frequency ${item.frequency}${
        isSolved ? `, decoded as ${item.char}` : ''
    }, expected English ${englishBenchmarkChar}`;

    return (
        <Animated.View
            onLayout={handleLayout}
            style={[
                styles.chipWrapper,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Pressable
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={accessibilityLabel}
                style={({ pressed }) => [
                    styles.chip,
                    {
                        backgroundColor: isSelected
                            ? colors.matchingBg
                            : isSolved
                                ? colors.surfaceHighlight
                                : colors.surface,
                        borderColor: isSelected
                            ? colors.matching
                            : isSolved
                                ? colors.successBorder
                                : colors.border,
                    },
                    pressed && { opacity: 0.75 },
                ]}
            >
                {/* Header: Cipher Letter + Solved Indicator */}
                <View style={styles.cipherRow}>
                    <Text
                        style={[
                            styles.cipherText,
                            {
                                color: isSelected
                                    ? colors.matching
                                    : isSolved
                                        ? colors.success
                                        : colors.text,
                            },
                        ]}
                    >
                        {item.cipherChar}
                    </Text>
                    {isSolved && (
                        <Text style={[styles.solvedArrow, { color: colors.success }]}>
                            →{item.char}
                        </Text>
                    )}
                </View>

                {/* Optical Fraunhofer Emission Line with Active Luminescence Pulse */}
                <View style={[styles.emissionTrack, { backgroundColor: colors.border }]}>
                    <Animated.View
                        style={[
                            styles.emissionRay,
                            {
                                height: emissionHeight,
                                backgroundColor: rayColor,
                                shadowColor: rayColor,
                                opacity: glowAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.65, 1.0],
                                }),
                            },
                        ]}
                    />
                </View>

                {/* Frequency Count & Percentage */}
                <View style={styles.metricsRow}>
                    <Text tabular style={[styles.freqCount, { color: isSelected ? colors.matching : colors.text }]}>
                        {item.frequency}
                    </Text>
                    <Text tabular style={[styles.freqPercent, { color: colors.textMuted }]}>
                        {letterPercent}%
                    </Text>
                </View>

                {/* English Baseline Benchmark (ETAOIN) */}
                <View
                    style={[
                        styles.benchmarkBadge,
                        {
                            backgroundColor: isSelected ? `${colors.matching}20` : `${colors.border}40`,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.benchmarkText,
                            {
                                color: isSelected ? colors.matching : colors.textSecondary,
                            },
                        ]}
                    >
                        ~{englishBenchmarkChar}{formatBenchmarkPercent(englishBenchmarkPercent)}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
});

export const FrequencyBar: React.FC<FrequencyBarProps> = React.memo(({
    frequencies,
    selectedCipherChar,
    onSelectCipherChar,
}) => {
    const { colors, settings } = useGame();
    const [isReducedMotion, setIsReducedMotion] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const chipPositions = useRef<Record<string, { x: number; width: number }>>({});

    // Reset cached chip positions when frequencies change
    useEffect(() => {
        chipPositions.current = {};
    }, [frequencies]);

    // Reduced motion listener with safe error catch
    useEffect(() => {
        let isMounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then(enabled => {
                if (isMounted) setIsReducedMotion(enabled);
            })
            .catch(() => {
                // Graceful fallback if accessibility bridge is unavailable
            });

        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
            if (isMounted) setIsReducedMotion(enabled);
        });

        return () => {
            isMounted = false;
            subscription?.remove();
        };
    }, []);

    // Layout registration for magnetic snap centering with initial-mount race resolution
    const handleChipLayout = useCallback((cipherChar: string, x: number, width: number) => {
        chipPositions.current[cipherChar] = { x, width };

        // If this chip is the actively selected one on initial layout, center immediately
        if (cipherChar === selectedCipherChar && scrollViewRef.current && containerWidth > 0) {
            const targetX = Math.max(0, x - containerWidth / 2 + width / 2);
            scrollViewRef.current.scrollTo({ x: targetX, animated: !isReducedMotion });
        }
    }, [selectedCipherChar, containerWidth, isReducedMotion]);

    // Magnetic detent: auto-scroll to center selected cipher letter
    useEffect(() => {
        if (!selectedCipherChar || !scrollViewRef.current || containerWidth <= 0) return;

        const pos = chipPositions.current[selectedCipherChar];
        if (pos) {
            const targetX = Math.max(0, pos.x - containerWidth / 2 + pos.width / 2);
            scrollViewRef.current.scrollTo({ x: targetX, animated: !isReducedMotion });
        }
    }, [selectedCipherChar, containerWidth, isReducedMotion]);

    const maxFrequency = useMemo(() => {
        return frequencies.reduce((max, f) => Math.max(max, f.frequency), 0);
    }, [frequencies]);

    const totalLetters = useMemo(() => {
        return frequencies.reduce((sum, f) => sum + f.frequency, 0);
    }, [frequencies]);

    if (!frequencies || frequencies.length === 0) return null;

    return (
        <View
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                },
            ]}
        >
            {/* Spectroscopy Header Row */}
            <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                    <Text style={[styles.title, { color: colors.textMuted }]}>
                        LETTER FREQUENCY
                    </Text>
                    <Text tabular style={[styles.peakMetric, { color: colors.primary }]}>
                        PEAK: {maxFrequency}×
                    </Text>
                </View>

                <View style={[styles.etaoinPill, { backgroundColor: `${colors.border}60` }]}>
                    <Text style={[styles.etaoinLabel, { color: colors.textSecondary }]}>
                        English average
                    </Text>
                </View>
            </View>

            {/* Magnetic Resonance Emission Spectrum */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {frequencies.map((item, index) => {
                    const isSelected = selectedCipherChar === item.cipherChar;
                    return (
                        <SpectralChip
                            key={item.cipherChar}
                            item={item}
                            rankIndex={index}
                            maxFrequency={maxFrequency}
                            totalLetters={totalLetters}
                            isSelected={isSelected}
                            isReducedMotion={isReducedMotion}
                            colors={colors}
                            hapticsEnabled={settings.hapticsEnabled}
                            onSelect={onSelectCipherChar}
                            onLayout={handleChipLayout}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingTop: 6,
        paddingBottom: 8,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    peakMetric: {
        fontSize: 9,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    etaoinPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    etaoinLabel: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.8,
        fontFamily: 'monospace',
    },
    scrollContent: {
        paddingHorizontal: 10,
        gap: 6,
        alignItems: 'center',
    },
    chipWrapper: {
        flexShrink: 0,
    },
    chip: {
        width: 58,
        paddingHorizontal: 4,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    cipherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    cipherText: {
        fontSize: 14,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    solvedArrow: {
        fontSize: 10,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    emissionTrack: {
        width: 6,
        height: 28,
        borderRadius: 3,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },
    emissionRay: {
        width: 6,
        borderRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 4,
        elevation: 3,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    freqCount: {
        fontSize: 11,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    freqPercent: {
        fontSize: 8,
        fontWeight: '600',
    },
    benchmarkBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    benchmarkText: {
        fontSize: 8,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
});
