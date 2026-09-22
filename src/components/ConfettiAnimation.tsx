import React, { useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Easing, useWindowDimensions } from 'react-native';

const CONFETTI_COLORS = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#22c55e', // emerald
    '#ef4444', // ruby red
    '#3b82f6', // electric blue
    '#ec4899', // hot pink
    '#8b5cf6', // neon violet
    '#14b8a6', // teal
    '#f97316', // orange
    '#fbbf24', // sparkling gold
];

const PARTICLE_COUNT = 45;

interface BallisticParticle {
    x: Animated.Value;
    y: Animated.Value;
    rotX: Animated.Value;
    rotY: Animated.Value;
    rotZ: Animated.Value;
    scale: Animated.Value;
    opacity: Animated.Value;
    color: string;
    width: number;
    height: number;
    isCircle: boolean;
    cannonOriginX: number;
    cannonOriginY: number;
    targetX: number;
    apexY: number;
    rotXEnd: number;
    rotYEnd: number;
    rotZEnd: number;
    delay: number;
    riseDuration: number;
    fallDuration: number;
}

export const ConfettiAnimation: React.FC = () => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Rebuilt when the viewport changes so rotation/foldables stay correct.
    const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, index) => {
            // Dual cannon origins: left (25% screen) and right (75% screen)
            const isLeftCannon = index % 2 === 0;
            const cannonOriginX = isLeftCannon
                ? screenWidth * 0.2 + (Math.random() - 0.5) * 40
                : screenWidth * 0.8 + (Math.random() - 0.5) * 40;
            const cannonOriginY = screenHeight * 0.9;

            // Target X dispersion fanning across entire screen width
            const targetX = Math.random() * screenWidth;
            // Apex height: random altitude in upper third of screen
            const apexY = screenHeight * (0.12 + Math.random() * 0.32);

            return {
                x: new Animated.Value(cannonOriginX),
                y: new Animated.Value(cannonOriginY),
                rotX: new Animated.Value(0),
                rotY: new Animated.Value(0),
                rotZ: new Animated.Value(0),
                scale: new Animated.Value(0),
                opacity: new Animated.Value(1),
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                width: 7 + Math.random() * 7,
                height: 5 + Math.random() * 9,
                isCircle: Math.random() > 0.75,
                cannonOriginX,
                cannonOriginY,
                targetX,
                apexY,
                rotXEnd: 2 + Math.random() * 4,
                rotYEnd: 3 + Math.random() * 5,
                rotZEnd: 2 + Math.random() * 4,
                delay: (index % 12) * 45 + Math.random() * 120,
                riseDuration: 550 + Math.random() * 250,
                fallDuration: 1300 + Math.random() * 500,
            };
    }), [screenWidth, screenHeight]);

    useEffect(() => {
        const animations = particles.map(p => {
            const totalDuration = p.riseDuration + p.fallDuration;

            return Animated.sequence([
                Animated.delay(p.delay),
                Animated.parallel([
                    // Horizontal ballistic dispersion
                    Animated.timing(p.x, {
                        toValue: p.targetX,
                        duration: totalDuration,
                        easing: Easing.out(Easing.sin),
                        useNativeDriver: true,
                    }),
                    // Parabolic ballistic trajectory: Launch UP to apex, then plunge under gravity
                    Animated.sequence([
                        Animated.timing(p.y, {
                            toValue: p.apexY,
                            duration: p.riseDuration,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                        Animated.timing(p.y, {
                            toValue: screenHeight + 50,
                            duration: p.fallDuration,
                            easing: Easing.in(Easing.quad),
                            useNativeDriver: true,
                        }),
                    ]),
                    // 3D tumbling rotation tensor: pitch (rotX), yaw (rotY), roll (rotZ)
                    Animated.timing(p.rotX, {
                        toValue: p.rotXEnd,
                        duration: totalDuration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.rotY, {
                        toValue: p.rotYEnd,
                        duration: totalDuration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.rotZ, {
                        toValue: p.rotZEnd,
                        duration: totalDuration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    // Elastic particle pop at muzzle burst
                    Animated.sequence([
                        Animated.timing(p.scale, {
                            toValue: 1.15,
                            duration: 160,
                            easing: Easing.out(Easing.back(1.5)),
                            useNativeDriver: true,
                        }),
                        Animated.timing(p.scale, {
                            toValue: 0.7 + Math.random() * 0.3,
                            duration: totalDuration - 160,
                            useNativeDriver: true,
                        }),
                    ]),
                    // Smooth terminal fade out
                    Animated.sequence([
                        Animated.delay(totalDuration * 0.72),
                        Animated.timing(p.opacity, {
                            toValue: 0,
                            duration: totalDuration * 0.28,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]);
        });

        const compositeAnimation = Animated.parallel(animations);
        compositeAnimation.start();

        return () => {
            compositeAnimation.stop();
            particles.forEach((p: BallisticParticle) => {
                p.x.stopAnimation();
                p.y.stopAnimation();
                p.rotX.stopAnimation();
                p.rotY.stopAnimation();
                p.rotZ.stopAnimation();
                p.scale.stopAnimation();
                p.opacity.stopAnimation();
            });
        };
    }, [particles, screenHeight]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: p.width,
                        height: p.height,
                        backgroundColor: p.color,
                        borderRadius: p.isCircle ? p.width / 2 : 2,
                        opacity: p.opacity,
                        transform: [
                            { translateX: p.x },
                            { translateY: p.y },
                            {
                                rotateX: p.rotX.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            },
                            {
                                rotateY: p.rotY.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            },
                            {
                                rotateZ: p.rotZ.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            },
                            { scale: p.scale },
                        ],
                    }}
                />
            ))}
        </View>
    );
};

