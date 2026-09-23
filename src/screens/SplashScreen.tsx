import React, { useEffect, useRef, useState } from 'react';
import { View,
    Pressable,
    StyleSheet,
    Animated,
    StatusBar,
    Image,
    Text,
    AccessibilityInfo } from 'react-native';
import { useGame } from '../context/GameContext';
import { Icon } from '../components/Icon';

interface SplashScreenProps {
    onStart: () => void;
}

const TITLE = 'BrainCipher';
const SCRAMBLED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?';

// Generate a random character
const randomChar = () => SCRAMBLED_CHARS[Math.floor(Math.random() * SCRAMBLED_CHARS.length)];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Use a ref to track revealed count to avoid stale closures
    const revealedRef = useRef(0);
    const [displayTitle, setDisplayTitle] = useState(TITLE);

    useEffect(() => {
        // Entry animations — faster
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true }),
            ]),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true }),
        ]).start();

        // Pulse animation on logo (skipped when reduced motion is requested)
        let pulse: Animated.CompositeAnimation | null = null;
        let cancelled = false;
        AccessibilityInfo.isReduceMotionEnabled()
            .then(enabled => {
                if (cancelled || enabled) return;
                pulse = Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                    ])
                );
                pulse.start();
            })
            .catch(() => {});

        // Cipher decode via a single interval; reveals one letter per 80ms tick.
        const interval = setInterval(() => {
            const revealed = revealedRef.current;
            if (revealed >= TITLE.length) {
                clearInterval(interval);
                setDisplayTitle(TITLE);
                return;
            }

            // Build display: revealed chars are real, rest are random
            const chars = TITLE.split('').map((ch, idx) => {
                if (idx < revealed) return ch;
                return randomChar();
            });
            setDisplayTitle(chars.join(''));

            revealedRef.current = revealed + 1;
        }, 80);

        return () => {
            cancelled = true;
            pulse?.stop();
            clearInterval(interval);
        };
    }, [fadeAnim, scaleAnim, slideAnim, pulseAnim]);

    const { colors, settings } = useGame();
    const isLight = settings.theme === 'light';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />

            {/* Background decoration (subtle, theme-aware) */}
            <View style={[styles.bgCircle1, { backgroundColor: colors.surfaceHighlight }]} />
            <View style={[styles.bgCircle2, { backgroundColor: colors.surfaceHighlight }]} />
            <View style={[styles.bgCircle3, { backgroundColor: colors.surfaceHighlight }]} />

            <View style={styles.content}>
                {/* Logo Image */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] },
                    ]}
                >
                    <View style={styles.logoShadow} />
                    <Image
                        source={require('../assets/app_icon.png')}
                        style={styles.logoImage}
                        resizeMode="cover"
                    />
                </Animated.View>

                {/* Animated Title — cipher decode effect */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {displayTitle}
                    </Text>
                    <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                        Test your intellect.{'\n'}Decrypt definitions.{'\n'}Master subjects.
                    </Text>
                </Animated.View>

                {/* Features */}
                <Animated.View
                    style={[
                        styles.featuresContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <View style={styles.featureRow}>
                        <Icon name="sparkle" size={20} color={colors.primary} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>7+ Subject Categories</Text>
                    </View>
                    <View style={styles.featureRow}>
                        <Icon name="puzzle" size={20} color={colors.primary} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>Cryptogram Puzzles</Text>
                    </View>
                    <View style={styles.featureRow}>
                        <Icon name="medal" size={20} color={colors.primary} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>Track Your Mastery</Text>
                    </View>
                </Animated.View>
            </View>

            {/* Start Button */}
            <Animated.View
                style={[
                    styles.buttonContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }] },
                ]}
            >
                <Pressable
                    onPress={onStart}
                    style={({ pressed }) => [
                        styles.startButton,
                        { backgroundColor: colors.primary, shadowColor: colors.primary },
                        pressed && styles.startButtonPressed,
                    ]}
                >
                    <Text style={[styles.startText, { color: isLight ? '#ffffff' : colors.background }]}>START LEARNING</Text>
                    <Text style={[styles.startArrow, { color: isLight ? '#ffffff' : colors.background }]}>→</Text>
                </Pressable>

                <Text style={[styles.version, { color: colors.textMuted }]}>v1.0.0</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        overflow: 'hidden' },
    bgCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.5,
        top: -80,
        right: -80 },
    bgCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.4,
        bottom: 100,
        left: -60 },
    bgCircle3: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        opacity: 0.45,
        top: '40%' as any,
        right: -40 },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24 },
    logoContainer: {
        marginBottom: 8 },
    logoShadow: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.25)',
        transform: [{ rotate: '12deg' }, { translateX: 6 }, { translateY: 6 }] },
    logoImage: {
        width: 110,
        height: 110,
        borderRadius: 28,
        transform: [{ rotate: '-3deg' }] },
    title: {
        fontSize: 36,
        fontWeight: '900',
        fontFamily: 'serif',
        textAlign: 'center',
        letterSpacing: 0.5 },
    tagline: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: 8 },
    featuresContainer: {
        gap: 12,
        marginTop: 16 },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12 },
    featureIcon: {
        fontSize: 20 },
    featureText: {
        fontSize: 15,
        fontWeight: '600' },
    buttonContainer: {
        alignItems: 'center',
        gap: 16 },
    startButton: {
        minHeight: 56,
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12 },
    startButtonPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.96 }] },
    startText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1 },
    startArrow: {
        fontSize: 20,
        fontWeight: '700' },
    version: {
        fontSize: 12,
        fontWeight: '600' } });
