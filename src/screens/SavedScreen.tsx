import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { QuoteData } from '../types';
import { getQuoteById } from '../services/quoteService';

export const SavedScreen = () => {
    const { favorites, toggleFavorite, colors, triggerHaptic } = useGame();

    const handleShare = async (item: QuoteData) => {
        try {
            triggerHaptic('medium');
            await Share.share({
                message: `🧠 "${item.text}"\n— ${item.author} [${item.category}]\n\nDeciphered with BrainCipher: https://braincipher.app`
            });
        } catch {}
    };

    const favoriteItems = useMemo(() => {
        return favorites
            .map((id: string) => getQuoteById(id))
            .filter((item): item is QuoteData => item !== null);
    }, [favorites]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Saved Quotes</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {favoriteItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={{ fontSize: 48, marginBottom: 8 }}>❤️</Text>
                        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No saved quotes yet</Text>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Tap the heart icon after deciphering a quote to bookmark your favorite wisdom and definitions here.
                        </Text>
                    </View>
                ) : (
                    favoriteItems.map((item) => (
                        <View key={item.id} style={[
                            styles.card,
                            { backgroundColor: colors.surface, borderColor: colors.border }
                        ]}>
                            <View style={styles.categoryBadge}>
                                <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>
                                    {item.category.toUpperCase()}
                                </Text>
                            </View>
                            {item.category === 'Daily Cipher' ? (
                                <>
                                    <Text style={[styles.quoteText, { color: colors.text }]}>"{item.text}"</Text>
                                    <Text style={[styles.authorText, { color: colors.primary }]}>— {item.author}</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={[styles.definitionLabel, { color: colors.textMuted }]}>DEFINITION</Text>
                                    <Text style={[styles.quoteText, { color: colors.text }]}>{item.text}</Text>
                                    <Text style={[styles.answerText, { color: colors.primary }]}>Answer: {item.author}</Text>
                                </>
                            )}
                            <View style={styles.cardActionsRow}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.actionBtn,
                                        { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                                        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                                    ]}
                                    onPress={() => handleShare(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Share quote by ${item.author}`}
                                >
                                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>📤 Share</Text>
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.actionBtn,
                                        { backgroundColor: colors.errorBg, borderColor: colors.error },
                                        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                                    ]}
                                    onPress={() => {
                                        triggerHaptic('light');
                                        toggleFavorite(item.id);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove quote by ${item.author}`}
                                >
                                    <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: { fontSize: 24, fontWeight: '900', fontFamily: 'serif' },
    content: { padding: 20, gap: 14, paddingBottom: 40 },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 8,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 20,
    },
    card: {
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        gap: 6,
    },
    categoryBadge: {
        marginBottom: 2,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    quoteText: {
        fontSize: 16,
        fontFamily: 'serif',
        fontStyle: 'italic',
        lineHeight: 24,
    },
    authorText: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'right',
        marginTop: 4,
    },
    definitionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    answerText: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 4,
    },
    cardActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    actionBtn: {
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    removeText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
