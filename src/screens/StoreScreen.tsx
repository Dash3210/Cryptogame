import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { EXTENSIONS } from '../data/quotes';
import { Theme } from '../types';
import { THEME_NAMES } from '../styles/theme';
import { adService } from '../services/adService';
import { Icon, IconName } from '../components/Icon';
import { getShopItem, getExtensionPrice, getThemePrice } from '../data/shop';

export const StoreScreen = () => {
    const {
        coins,
        addCoins,
        purchase,
        myExtensions,
        unlockExtension,
        unlockedThemes,
        setTheme,
        settings,
        colors,
        triggerHaptic,
    } = useGame();

    const [activeTab, setActiveTab] = useState<'extensions' | 'themes'>('extensions');

    const handleUnlockExtensionWithCoins = (id: string, label: string) => {
        triggerHaptic('light');
        const item = getShopItem('ext_' + id) || getShopItem(id);
        const price = item?.price ?? 100;
        const itemId = item?.id ?? ('ext_' + id);

        if (coins < price) {
            Alert.alert(
                "Not Enough Coins",
                `You need ${price} coins to unlock "${label}". You currently have ${coins} coins. Would you like to watch an ad to unlock it for free?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Watch Ad",
                        onPress: () => handleUnlockExtensionWithAd(id, label)
                    }
                ]
            );
            return;
        }

        Alert.alert(
            "Unlock Subject",
            `Spend ${price} coins to unlock "${label}"?\n\nCurrent balance: ${coins} coins`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unlock",
                    onPress: () => {
                        const result = purchase(itemId);
                        if (result === 'OK') {
                            Alert.alert("Unlocked!", `${label} is now available in your Library!`);
                        } else if (result === 'INSUFFICIENT_FUNDS') {
                            Alert.alert("Not Enough Coins", `You need ${price} coins to unlock "${label}". You currently have ${coins} coins.`);
                        } else if (result === 'ALREADY_OWNED') {
                            Alert.alert("Already Owned", `"${label}" is already unlocked in your Library.`);
                        }
                    }
                }
            ]
        );
    };

    const handleUnlockExtensionWithAd = (id: string, label: string) => {
        adService.show(() => {
            unlockExtension(id);
            Alert.alert("Unlocked!", `${label} is now available in your Library!`);
        });
    };

    const handleUnlockThemeWithCoins = (themeKey: Theme, themeName: string) => {
        triggerHaptic('light');
        const item = getShopItem('theme_' + themeKey) || getShopItem(themeKey);
        const price = item?.price ?? 120;
        const itemId = item?.id ?? ('theme_' + themeKey);

        if (coins < price) {
            Alert.alert(
                "Not Enough Coins",
                `You need ${price} coins to unlock the "${themeName}" theme. You currently have ${coins} coins.`,
                [
                    { text: "OK", style: "cancel" },
                    {
                        text: "Watch Ad for +50 Coins",
                        onPress: handleWatchAdForCoins
                    }
                ]
            );
            return;
        }

        Alert.alert(
            "Unlock Theme",
            `Spend ${price} coins to unlock "${themeName}"?\n\nCurrent balance: ${coins} coins`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unlock",
                    onPress: () => {
                        const result = purchase(itemId);
                        if (result === 'OK') {
                            setTheme(themeKey);
                            Alert.alert("Theme Unlocked!", `The "${themeName}" theme is now active!`);
                        } else if (result === 'INSUFFICIENT_FUNDS') {
                            Alert.alert("Not Enough Coins", `You need ${price} coins to unlock the "${themeName}" theme. You currently have ${coins} coins.`);
                        } else if (result === 'ALREADY_OWNED') {
                            setTheme(themeKey);
                            Alert.alert("Theme Applied!", `The "${themeName}" theme is now active!`);
                        }
                    }
                }
            ]
        );
    };

    const handleWatchAdForCoins = () => {
        triggerHaptic('light');
        adService.show(() => {
            addCoins(50);
            Alert.alert("Coins Rewarded!", "You earned +50 Cipher Coins.");
        });
    };

    const themesList: Theme[] = ['dark', 'cyberpunk', 'terminal', 'gold', 'midnight', 'ocean', 'light'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={[styles.headerSub, { color: colors.textMuted }]}>CIPHER SHOP</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Store</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <View style={[styles.coinBadge, { backgroundColor: colors.goldBg, borderColor: colors.gold }]}>
                            <Icon name="coin" size={15} color={colors.gold} />
                            <Text tabular style={[styles.coinVal, { color: colors.gold }]}>{coins}</Text>
                        </View>

                        <Pressable
                            onPress={handleWatchAdForCoins}
                            style={({ pressed }) => [
                                styles.freeCoinBtn,
                                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                                pressed && { opacity: 0.7 }
                            ]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityRole="button"
                            accessibilityLabel="Watch ad for 50 coins"
                        >
                            <Text style={[styles.freeCoinText, { color: colors.primary }]}>+50 Ad</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabBar, { borderTopColor: colors.border }]}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            setActiveTab('extensions');
                        }}
                        style={[
                            styles.tabItem,
                            activeTab === 'extensions' && { borderBottomColor: colors.primary }
                        ]}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        accessibilityRole="tab"
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'extensions' ? colors.primary : colors.textMuted }
                        ]}>
                            Subject Packs
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            setActiveTab('themes');
                        }}
                        style={[
                            styles.tabItem,
                            activeTab === 'themes' && { borderBottomColor: colors.primary }
                        ]}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        accessibilityRole="tab"
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'themes' ? colors.primary : colors.textMuted }
                        ]}>
                            Pro Themes
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* EXTENSIONS TAB */}
                {activeTab === 'extensions' && (
                    <View style={styles.list}>
                        {EXTENSIONS.map((ext) => {
                            const isOwned = myExtensions.has(ext.id);
                            const price = getExtensionPrice(ext.id);

                            return (
                                <View
                                    key={ext.id}
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: isOwned ? colors.successBorder : colors.border
                                        }
                                    ]}
                                >
                                    <View style={styles.cardInfo}>
                                        <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
                                            <Icon name={ext.icon} fallbackLabel={ext.label} id={ext.id} size={24} color={colors.text} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cardTitle, { color: colors.text }]}>{ext.label}</Text>
                                            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                                {ext.description}
                                            </Text>
                                        </View>
                                    </View>

                                    {isOwned ? (
                                        <View style={[styles.ownedBadge, { backgroundColor: colors.successBg }]}>
                                            <Text style={[styles.ownedText, { color: colors.success }]}>✓ In Library</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buyBtnRow}>
                                            <Pressable
                                                onPress={() => handleUnlockExtensionWithCoins(ext.id, ext.label)}
                                                style={({ pressed }) => [
                                                    styles.buyCoinBtn,
                                                    { backgroundColor: colors.primary },
                                                    pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                                                ]}
                                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Unlock ${ext.label} for ${price} coins`}
                                            >
                                                <Text style={styles.buyCoinText}>{price} coins</Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => handleUnlockExtensionWithAd(ext.id, ext.label)}
                                                style={({ pressed }) => [
                                                    styles.buyAdBtn,
                                                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                                                    pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                                                ]}
                                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Unlock ${ext.label} with ad`}
                                            >
                                                <Text style={[styles.buyAdText, { color: colors.textSecondary }]}>Ad</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* THEMES TAB */}
                {activeTab === 'themes' && (
                    <View style={styles.list}>
                        {themesList.map((themeKey) => {
                            const meta = THEME_NAMES[themeKey];
                            const isOwned = unlockedThemes.has(themeKey);
                            const isActive = settings.theme === themeKey;
                            const themePrice = getThemePrice(themeKey);

                            return (
                                <View
                                    key={themeKey}
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: isActive ? colors.primary : colors.border
                                        },
                                        isActive && { borderWidth: 2 }
                                    ]}
                                >
                                    <View style={styles.cardInfo}>
                                        <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
                                            <Icon name={meta.icon as IconName} size={24} color={colors.text} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cardTitle, { color: colors.text }]}>{meta.name}</Text>
                                            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                                {meta.description}
                                            </Text>
                                        </View>
                                    </View>

                                    {isActive ? (
                                        <View style={[styles.activeThemeBadge, { backgroundColor: colors.primaryBg }]}>
                                            <Text style={[styles.activeThemeText, { color: colors.primary }]}>Active</Text>
                                        </View>
                                    ) : isOwned ? (
                                        <Pressable
                                            onPress={() => setTheme(themeKey)}
                                            style={({ pressed }) => [
                                                styles.applyBtn,
                                                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                                                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }
                                            ]}
                                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Apply ${meta.name} theme`}
                                        >
                                            <Text style={[styles.applyBtnText, { color: colors.text }]}>Apply</Text>
                                        </Pressable>
                                    ) : (
                                        <Pressable
                                            onPress={() => handleUnlockThemeWithCoins(themeKey, meta.name)}
                                            style={({ pressed }) => [
                                                styles.buyCoinBtn,
                                                { backgroundColor: colors.gold },
                                                pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }
                                            ]}
                                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Unlock ${meta.name} theme for ${themePrice} coins`}
                                        >
                                            <Text tabular style={styles.buyCoinText}>{themePrice} coins</Text>
                                        </Pressable>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 14,
        borderBottomWidth: 1,
        gap: 14,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerSub: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        fontFamily: 'serif',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    coinVal: {
        fontSize: 15,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    freeCoinBtn: {
        minHeight: 44,
        paddingHorizontal: 10,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    freeCoinText: {
        fontSize: 11,
        fontWeight: '800',
    },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    tabItem: {
        flex: 1,
        minHeight: 48,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    list: {
        gap: 14,
    },
    card: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    cardDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    ownedBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    ownedText: {
        fontSize: 12,
        fontWeight: '800',
    },
    buyBtnRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    buyCoinBtn: {
        minHeight: 48,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyCoinText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
        marginTop: -1,
    },
    buyAdBtn: {
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyAdText: {
        fontSize: 12,
        fontWeight: '700',
    },
    activeThemeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    activeThemeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    applyBtn: {
        minHeight: 48,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
