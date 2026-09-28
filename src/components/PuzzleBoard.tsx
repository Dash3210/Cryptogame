import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated, AccessibilityInfo } from 'react-native';
import { AppText as Text } from './AppText';
import { CellData } from '../types';
import { useGame } from '../context/GameContext';
import { SPRING_PRESETS, HapticType, calculateWaveDelay } from '../utils/physics';
import { ThemeColors, getFontFamilyNative } from '../styles/theme';

interface PuzzleBoardProps {
    cells: CellData[];
    selectedCellIndex: number | null;
    onSelectCell: (index: number) => void;
    solved: boolean;
}

interface AnimatedPuzzleCellProps {
    cell: CellData;
    index: number;
    sourceIndex: number | null;
    isSelected: boolean;
    isMatching: boolean;
    isReducedMotion: boolean;
    wordSizes: { cellWidth: number; cellHeight: number; fontSize: number; clueFontSize: number };
    colors: ThemeColors;
    nativeFontFamily: string | undefined;
    nativeFontStyle: 'italic' | 'normal';
    onSelectCell: (index: number) => void;
    triggerHaptic: (type?: HapticType) => void;
}

const AnimatedPuzzleCell: React.FC<AnimatedPuzzleCellProps> = React.memo(({
    cell,
    index,
    sourceIndex,
    isSelected,
    isMatching,
    isReducedMotion,
    wordSizes,
    colors,
    nativeFontFamily,
    nativeFontStyle,
    onSelectCell,
    triggerHaptic,
}) => {
    const isCorrect = cell.userChar === cell.char;
    const isWrong = cell.userChar && cell.userChar !== cell.char;

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const liftAnim = useRef(new Animated.Value(0)).current;

    // Teardown ongoing animations on unmount
    useEffect(() => {
        return () => {
            scaleAnim.stopAnimation();
            liftAnim.stopAnimation();
        };
    }, [scaleAnim, liftAnim]);

    // Second-order damped spring on user entry / letter update
    const prevCharRef = useRef(cell.userChar);
    useEffect(() => {
        if (isReducedMotion) {
            scaleAnim.setValue(1);
            prevCharRef.current = cell.userChar;
            return;
        }

        if (cell.userChar && cell.userChar !== prevCharRef.current) {
            scaleAnim.setValue(1.18);
            Animated.spring(scaleAnim, {
                toValue: 1,
                ...SPRING_PRESETS.CELL_INPUT_POP,
            }).start();
        }
        prevCharRef.current = cell.userChar;
    }, [cell.userChar, isReducedMotion, scaleAnim]);

    // Lift spring on cursor focus
    useEffect(() => {
        if (isReducedMotion) {
            liftAnim.setValue(0);
            return;
        }

        Animated.spring(liftAnim, {
            toValue: isSelected ? -3 : 0,
            ...SPRING_PRESETS.MAGNETIC_LOCK,
        }).start();
    }, [isSelected, isReducedMotion, liftAnim]);

    // Resonance wave pulse with spatial 2D Euclidean phase delay radiating from active cell
    useEffect(() => {
        if (isMatching && !isReducedMotion) {
            const delay = sourceIndex !== null
                ? calculateWaveDelay(sourceIndex, index, 10)
                : Math.min(240, (index % 12) * 20);

            const timer = setTimeout(() => {
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.10, duration: 80, useNativeDriver: true }),
                    Animated.spring(scaleAnim, { toValue: 1, ...SPRING_PRESETS.RIPPLE_NODE }),
                ]).start();
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [isMatching, sourceIndex, index, isReducedMotion, scaleAnim]);

    return (
        <Pressable
            key={cell.id}
            onPress={() => {
                if (!isCorrect) {
                    triggerHaptic('key_down');
                    onSelectCell(index);
                }
            }}
            disabled={isCorrect}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isCorrect }}
            accessibilityLabel={`Cell ${index + 1}, Cipher letter ${cell.cipherChar}${
                cell.userChar ? `, entered ${cell.userChar}` : ', empty'
            }${isCorrect ? ', solved' : ''}`}
            style={styles.cellContainer}
        >
            {/* User Input Slot */}
            <Animated.View
                style={[
                    styles.cell,
                    {
                        width: wordSizes.cellWidth,
                        height: wordSizes.cellHeight,
                        transform: [
                            { scale: scaleAnim },
                            { translateY: liftAnim }
                        ],
                    },
                    // Three distinct visual states:
                    // 1. SOLVED cells = transparent, no border
                    // 2. CURRENT cell = green (colors.successBg / colors.success)
                    // 3. OTHER empty gaps = blue (colors.matchingBg / colors.matching)
                    // (and isWrong = red for incorrect guesses)
                    isCorrect && {
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                        borderBottomWidth: 0,
                    },
                    !isCorrect && isSelected && {
                        backgroundColor: colors.successBg,
                        borderColor: colors.success,
                        borderBottomColor: colors.success,
                    },
                    !isCorrect && !isSelected && isWrong && {
                        backgroundColor: colors.errorBg,
                        borderColor: colors.error,
                        borderBottomColor: colors.error,
                    },
                    !isCorrect && !isSelected && !isWrong && {
                        backgroundColor: colors.matchingBg,
                        borderColor: colors.matching,
                        borderBottomColor: colors.matching,
                    },
                ]}
            >
                <Text
                    disableScaling
                    style={[
                        styles.cellText,
                        {
                            fontSize: isCorrect ? wordSizes.fontSize + 2 : wordSizes.fontSize,
                            fontFamily: nativeFontFamily,
                            fontStyle: nativeFontStyle,
                            color: isWrong ? colors.error : colors.text,
                            fontWeight: isCorrect ? '900' : '700',
                        },
                    ]}
                >
                    {cell.userChar || ''}
                </Text>
            </Animated.View>

            {/* Cipher Clue */}
            <Text
                disableScaling
                style={[
                    styles.cipherClue,
                    {
                        fontSize: wordSizes.clueFontSize,
                        fontFamily: 'monospace',
                        color: isSelected
                            ? colors.success
                            : isWrong
                                ? colors.error
                                : colors.matching,
                        opacity: isCorrect ? 0 : 1,
                    },
                ]}
            >
                {cell.cipherChar}
            </Text>
        </Pressable>
    );
}, (prev, next) => {
    return (
        prev.cell.userChar === next.cell.userChar &&
        prev.cell.char === next.cell.char &&
        prev.isSelected === next.isSelected &&
        prev.isMatching === next.isMatching &&
        prev.sourceIndex === next.sourceIndex &&
        prev.isReducedMotion === next.isReducedMotion &&
        prev.wordSizes.cellWidth === next.wordSizes.cellWidth &&
        prev.colors === next.colors &&
        prev.nativeFontFamily === next.nativeFontFamily &&
        prev.nativeFontStyle === next.nativeFontStyle
    );
});

export const PuzzleBoard: React.FC<PuzzleBoardProps> = React.memo(({
    cells,
    selectedCellIndex,
    onSelectCell,
}) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const { settings, colors, triggerHaptic } = useGame();
    const { fontSize, fontFamily } = settings;
    const [isReducedMotion, setIsReducedMotion] = useState(false);

    // Reduced motion listener with safe error catch
    useEffect(() => {
        let isMounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then(enabled => {
                if (isMounted) setIsReducedMotion(enabled);
            })
            .catch(() => {});

        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
            if (isMounted) setIsReducedMotion(enabled);
        });

        return () => {
            isMounted = false;
            subscription?.remove();
        };
    }, []);

    // Group cells into words for proper wrapping
    const words = useMemo(() => {
        const wordGroups: CellData[][] = [];
        let currentWord: CellData[] = [];

        cells.forEach((cell) => {
            if (cell.char === ' ') {
                if (currentWord.length > 0) wordGroups.push(currentWord);
                wordGroups.push([cell]); // Space is its own 'word'
                currentWord = [];
            } else {
                currentWord.push(cell);
            }
        });
        if (currentWord.length > 0) wordGroups.push(currentWord);
        return wordGroups;
    }, [cells]);

    // Base size configuration from font setting
    const baseSizes = useMemo(() => {
        switch (fontSize) {
            case 'small':
                return { cellWidth: 28, cellHeight: 40, fontSize: 16, clueFontSize: 10 };
            case 'large':
                return { cellWidth: 38, cellHeight: 50, fontSize: 22, clueFontSize: 12 };
            case 'medium':
            default:
                return { cellWidth: 32, cellHeight: 44, fontSize: 18, clueFontSize: 11 };
        }
    }, [fontSize]);

    // Dynamic per-word sizing to avoid breaking single words
    const getWordSizes = useMemo(() => {
        const padding = 16;
        // Each cell container carries 1.5dp horizontal margin per side; include it
        // so the fit calculation matches what is actually rendered.
        const cellMargin = 3;
        const availableWidth = SCREEN_WIDTH - padding * 2;

        return (wordLen: number) => {
            if (wordLen <= 1) return baseSizes;

            const totalWordWidth = wordLen * (baseSizes.cellWidth + cellMargin);
            if (totalWordWidth <= availableWidth) return baseSizes;

            // Downscale proportionally so the word fits without breaking
            const maxCellWidth = Math.floor((availableWidth - wordLen * cellMargin) / wordLen);
            const scale = maxCellWidth / baseSizes.cellWidth;

            return {
                cellWidth: Math.max(18, maxCellWidth),
                cellHeight: Math.max(26, Math.floor(baseSizes.cellHeight * scale)),
                fontSize: Math.max(11, Math.floor(baseSizes.fontSize * scale)),
                clueFontSize: Math.max(8, Math.floor(baseSizes.clueFontSize * scale)),
            };
        };
    }, [baseSizes, SCREEN_WIDTH]);

    const nativeFontFamily = useMemo(() => {
        return getFontFamilyNative(fontFamily);
    }, [fontFamily]);

    const nativeFontStyle: 'italic' | 'normal' = useMemo(() => {
        if (fontFamily === 'cursive') return 'italic';
        return 'normal';
    }, [fontFamily]);

    // Active cipher char for matching highlighting
    const activeCipherChar = useMemo(() => {
        if (selectedCellIndex === null) return null;
        const cell = cells[selectedCellIndex];
        return cell ? cell.cipherChar : null;
    }, [selectedCellIndex, cells]);

    return (
        <View style={styles.container}>
            <View style={styles.wordsContainer}>
                {words.map((word, wordIdx) => {
                    if (word[0].char === ' ') {
                        return <View key={`space-${wordIdx}`} style={styles.spaceItem} />;
                    }

                    const wordSizes = getWordSizes(word.length);

                    return (
                        <View key={`word-${wordIdx}`} style={styles.word}>
                            {word.map((cell) => {
                                if (cell.isPunctuation) {
                                    return (
                                        <View key={cell.id} style={styles.punctuation}>
                                            <Text
                                                disableScaling
                                                style={[
                                                    styles.punctuationText,
                                                    { fontSize: wordSizes.fontSize, color: colors.textSecondary }
                                                ]}
                                            >
                                                {cell.char}
                                            </Text>
                                        </View>
                                    );
                                }

                                const index = parseInt(cell.id.split('-')[1], 10);
                                const isCursor = index === selectedCellIndex;
                                const isMatching = !isCursor && !!activeCipherChar && cell.cipherChar === activeCipherChar;

                                return (
                                    <AnimatedPuzzleCell
                                        key={cell.id}
                                        cell={cell}
                                        index={index}
                                        sourceIndex={selectedCellIndex}
                                        isSelected={isCursor}
                                        isMatching={isMatching}
                                        isReducedMotion={isReducedMotion}
                                        wordSizes={wordSizes}
                                        colors={colors}
                                        nativeFontFamily={nativeFontFamily}
                                        nativeFontStyle={nativeFontStyle}
                                        onSelectCell={onSelectCell}
                                        triggerHaptic={triggerHaptic}
                                    />
                                );
                            })}
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    wordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    word: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'flex-end',
        marginVertical: 4,
    },
    spaceItem: {
        width: 8,
        height: 10,
    },
    cellContainer: {
        alignItems: 'center',
        marginHorizontal: 1.5,
    },
    cell: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderBottomWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    cellText: {
        textAlign: 'center',
        paddingHorizontal: 1,
    },
    cipherClue: {
        marginTop: 2,
        fontWeight: '800',
        textAlign: 'center',
        height: 16,
    },
    punctuation: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 8,
        paddingHorizontal: 2,
    },
    punctuationText: {
        fontWeight: '700',
    },
});
