import { AppText as Text } from './AppText';
import { CipherTransition } from './CipherTransition';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
    Animated,
    Easing,
    AccessibilityInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../context/GameContext';
import { DAILY_QUOTES } from '../data/quotes';
import { todayKey } from '../utils/date';

// Strong ease-out curve matching CSS cubic-bezier(0.23, 1, 0.32, 1)
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export const DailyQuoteModal = () => {
    const [visible, setVisible] = useState(false);
    const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
    const [isReducedMotion, setIsReducedMotion] = useState(false);
    const { colors, triggerHaptic } = useGame();

    const scaleAnim = useRef(new Animated.Value(0.96)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const isExitingRef = useRef(false);

    // Reduced motion listener
    useEffect(() => {
        let isMounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (isMounted) setIsReducedMotion(enabled);
            })
            .catch(() => {});

        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
            if (isMounted) setIsReducedMotion(enabled);
        });

        return () => {
            isMounted = false;
            sub?.remove();
        };
    }, []);

    useEffect(() => {
        checkDailyQuote();
    }, []);

    // Entrance animation when modal becomes visible
    useEffect(() => {
        if (visible) {
            isExitingRef.current = false;
            scaleAnim.setValue(isReducedMotion ? 1 : 0.96);
            opacityAnim.setValue(0);
            backdropAnim.setValue(0);

            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                }),
                ...(!isReducedMotion
                    ? [
                          Animated.timing(scaleAnim, {
                              toValue: 1,
                              duration: 250,
                              easing: EASE_OUT,
                              useNativeDriver: true,
                          }),
                      ]
                    : []),
            ]).start();
        }
    }, [visible, isReducedMotion, scaleAnim, opacityAnim, backdropAnim]);

    const handleDismiss = useCallback(() => {
        if (isExitingRef.current) return;
        isExitingRef.current = true;
        triggerHaptic('light');

        if (isReducedMotion) {
            setVisible(false);
            return;
        }

        // Snappy symmetrical exit: 180ms ease-out
        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 160,
                easing: EASE_OUT,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 160,
                easing: EASE_OUT,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 160,
                easing: EASE_OUT,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
        });
    }, [isReducedMotion, backdropAnim, opacityAnim, scaleAnim, triggerHaptic]);

    const checkDailyQuote = async () => {
        try {
            const today = todayKey();
            const lastDate = await AsyncStorage.getItem('brainCipherLastDailyQuoteDate');

            if (lastDate !== today) {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 0);
                const diff =
                    now.getTime() -
                    start.getTime() +
                    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
                const oneDay = 1000 * 60 * 60 * 24;
                const dayOfYear = Math.floor(diff / oneDay);
                const index = dayOfYear % DAILY_QUOTES.length;

                setQuote(DAILY_QUOTES[index]);
                setVisible(true);
                await AsyncStorage.setItem('brainCipherLastDailyQuoteDate', today);
            }
        } catch (error) {
            console.error('Error checking daily quote:', error);
        }
    };

    if (!quote) return null;

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[styles.centeredView, { opacity: backdropAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
                <Animated.View
                    style={[
                        styles.modalView,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Text style={[styles.title, { color: colors.textMuted }]}>Daily Knowledge</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        A bonus quote, separate from today's cipher.
                    </Text>

                    <View style={styles.quoteContainer}>
                        <CipherTransition
                            text={`"${quote.text}"`}
                            durationMs={700}
                            style={[styles.quoteText, { color: colors.text }]}
                        />
                        <CipherTransition
                            text={`— ${quote.author}`}
                            durationMs={450}
                            style={[styles.author, { color: colors.textSecondary }]}
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            { backgroundColor: colors.primary, shadowColor: colors.primary },
                            pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
                        ]}
                        onPress={handleDismiss}
                    >
                        <Text style={[styles.textStyle, { color: '#ffffff' }]}>Continue to Library</Text>
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
        padding: 24 },
    modalView: {
        width: '100%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1 },
    title: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 8 },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 24 },
    quoteContainer: {
        marginBottom: 32,
        alignItems: 'center' },
    quoteText: {
        fontSize: 22,
        fontWeight: '500',
        fontFamily: 'serif',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 32 },
    author: {
        fontSize: 16,
        fontWeight: '600' },
    button: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        width: '100%',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8 },
    textStyle: {
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16 } });
