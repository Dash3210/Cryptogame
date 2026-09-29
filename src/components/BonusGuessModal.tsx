import React, { useCallback, useRef, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import { Icon } from './Icon';
import { useGame } from '../context/GameContext';
import { RADIUS } from '../styles/theme';

interface BonusGuessModalProps {
    visible: boolean;
    definition: string;
    options: string[];
    correctAnswer: string;
    /** Called exactly once, when the player commits to an answer. */
    onResolved: (correct: boolean) => void;
    onClose: () => void;
}

/**
 * Optional post-solve comprehension bonus: guess the term behind the definition from four
 * options. Correct awards a guaranteed +50% bonus; a wrong guess costs nothing.
 */
export const BonusGuessModal: React.FC<BonusGuessModalProps> = ({
    visible,
    definition,
    options,
    correctAnswer,
    onResolved,
    onClose,
}) => {
    const { colors, triggerHaptic } = useGame();
    const [picked, setPicked] = useState<string | null>(null);
    const resolvedRef = useRef(false);

    const handlePick = useCallback((option: string) => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        setPicked(option);
        const correct = option.trim() === correctAnswer.trim();
        triggerHaptic(correct ? 'success' : 'error');
        onResolved(correct);
    }, [correctAnswer, onResolved, triggerHaptic]);

    const handleClose = useCallback(() => {
        setPicked(null);
        resolvedRef.current = false;
        onClose();
    }, [onClose]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <SafeAreaView style={styles.backdrop}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={[styles.badge, { backgroundColor: colors.goldBg }]}>
                            <Icon name="sparkle-burst" size={18} color={colors.gold} />
                            <Text style={[styles.badgeText, { color: colors.gold }]}>COMPREHENSION BONUS</Text>
                        </View>

                        <Text style={[styles.title, { color: colors.text }]}>
                            Comprehension Bonus
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {picked === null
                                ? 'Answer correctly to earn a +50% bonus on your level reward. A wrong guess costs you nothing.'
                                : picked === correctAnswer
                                    ? 'Correct. +50% comprehension bonus awarded.'
                                    : 'Not quite. No bonus this time.'}
                        </Text>

                        <View style={[styles.definitionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.definition, { color: colors.text }]}>
                                {definition}
                            </Text>
                        </View>

                        <View style={styles.options}>
                            {options.map(option => {
                                const isCorrect = option.trim() === correctAnswer.trim();
                                const isPicked = option === picked;
                                const revealCorrect = picked !== null && isPicked && isCorrect;
                                const revealWrong = picked !== null && isPicked && !isCorrect;

                                return (
                                    <Pressable
                                        key={option}
                                        disabled={picked !== null}
                                        onPress={() => handlePick(option)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Answer ${option}`}
                                        style={({ pressed }) => [
                                            styles.option,
                                            {
                                                backgroundColor: revealCorrect
                                                    ? colors.successBg
                                                    : revealWrong
                                                        ? colors.errorBg
                                                        : colors.surfaceHighlight,
                                                borderColor: revealCorrect
                                                    ? colors.success
                                                    : revealWrong
                                                        ? colors.error
                                                        : colors.border,
                                            },
                                            pressed && picked === null && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                                        ]}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            {
                                                color: revealCorrect
                                                    ? colors.success
                                                    : revealWrong
                                                        ? colors.error
                                                        : colors.text,
                                            },
                                        ]}>
                                            {option}
                                        </Text>
                                        {revealCorrect && <Icon name="check" size={16} color={colors.success} />}
                                        {revealWrong && <Icon name="close" size={16} color={colors.error} />}
                                    </Pressable>
                                );
                            })}
                        </View>

                        {picked === null ? (
                            <Pressable
                                onPress={handleClose}
                                accessibilityRole="button"
                                accessibilityLabel="Skip bonus"
                                style={styles.skip}
                            >
                                <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={handleClose}
                                accessibilityRole="button"
                                accessibilityLabel="Continue"
                                style={({ pressed }) => [
                                    styles.continue,
                                    { backgroundColor: colors.primary },
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                                ]}
                            >
                                <Text style={styles.continueText}>Continue</Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        borderRadius: RADIUS.sheet,
        borderWidth: 1,
        maxHeight: '88%',
        overflow: 'hidden',
    },
    content: {
        padding: 20,
        gap: 12,
    },
    badge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        fontFamily: 'serif',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
    },
    definitionCard: {
        padding: 14,
        borderRadius: RADIUS.card,
        borderWidth: 1,
    },
    definition: {
        fontSize: 15,
        lineHeight: 22,
        fontFamily: 'serif',
        fontStyle: 'italic',
    },
    options: {
        gap: 8,
    },
    option: {
        minHeight: 52,
        paddingHorizontal: 16,
        borderRadius: RADIUS.chip,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '700',
        flexShrink: 1,
    },
    skip: {
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '700',
    },
    continue: {
        minHeight: 52,
        borderRadius: RADIUS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
});
