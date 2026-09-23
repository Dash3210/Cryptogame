import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { Genre } from '../types';
import { useGame } from '../context/GameContext';
import { Icon, IconName } from './Icon';

export interface GenreCardProps {
    genre: Genre;
    onClick?: () => void;
    onSelect?: () => void;
    isCompleted?: boolean;
    completedCount?: number;
    totalCount?: number;
}

export const GenreCard: React.FC<GenreCardProps> = ({
    genre,
    onClick,
    onSelect,
    isCompleted,
    completedCount,
    totalCount,
}) => {
    const { colors, triggerHaptic } = useGame();
    const handlePress = () => {
        triggerHaptic('light');
        if (onSelect) onSelect();
        else if (onClick) onClick();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: isCompleted ? colors.gold : colors.border,
                },
                isCompleted && { borderWidth: 2 },
                pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
            ]}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHighlight }]}>
                <Icon name={genre.icon as IconName} size={24} color={colors.text} />
            </View>

            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                    {genre.label}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                    {genre.description}
                </Text>
                {totalCount !== undefined && completedCount !== undefined && (
                    <View style={styles.progressRow}>
                        <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceHighlight }]}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min(100, Math.round((completedCount / (totalCount || 1)) * 100))}%`,
                                        backgroundColor: isCompleted ? colors.gold : colors.primary
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progress, { color: isCompleted ? colors.gold : colors.textMuted }]}>
                            {completedCount}/{totalCount}
                        </Text>
                    </View>
                )}
            </View>

            {isCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: colors.gold }]}>
                    <Text style={styles.badgeCheck}>✓</Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 12,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 24,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 3,
    },
    label: {
        fontSize: 15,
        fontWeight: '800',
    },
    description: {
        fontSize: 12,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    progressBarBg: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 4,
        borderRadius: 2,
    },
    progress: {
        fontSize: 11,
        fontWeight: '800',
        fontFamily: 'monospace',
    },
    completedBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeCheck: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '900',
        marginTop: -1,
    },
});
