import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Pressable, Alert, Modal, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { AppSettings, Difficulty, FontFamily, FontSize, Theme } from '../types';
import { THEME_NAMES } from '../styles/theme';

// ==================== HOW TO PLAY MODAL ====================
const HowToPlayModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const { colors, triggerHaptic } = useGame();

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={[htpStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={[htpStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            onClose();
                        }}
                        hitSlop={12}
                        style={({ pressed }) => [
                            htpStyles.closeBtn,
                            { backgroundColor: colors.surfaceHighlight },
                            pressed && { opacity: 0.5 }
                        ]}
                    >
                        <Text style={[htpStyles.closeBtnText, { color: colors.text }]}>â€¹</Text>
                    </Pressable>
                    <Text style={[htpStyles.headerTitle, { color: colors.text }]}>How to Play</Text>
                </View>

                <ScrollView contentContainerStyle={htpStyles.content} showsVerticalScrollIndicator={false}>
                    {/* The Goal */}
                    <View style={htpStyles.section}>
                        <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>The Mission</Text>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Every puzzle presents an encrypted definition where each English letter has been substituted with a unique cipher code. Decrypt the clues to reveal the scientific concept or quote!
                        </Text>
                        <View style={[htpStyles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[htpStyles.exampleCipher, { color: colors.error }]}>X KWRT VIB</Text>
                            <Text style={[htpStyles.exampleArrow, { color: colors.text }]}>â¬‡</Text>
                            <Text style={[htpStyles.exampleSolved, { color: colors.success }]}>I LOVE YOU</Text>
                        </View>
                    </View>

                    {/* Pro Gamer Tips */}
                    <View style={htpStyles.section}>
                        <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Cryptanalysis Tips</Text>

                        <View style={[htpStyles.tipCard, { backgroundColor: colors.primaryBg }]}>
                            <Text style={[htpStyles.tipTitle, { color: colors.primary }]}>1. Frequency Analysis</Text>
                            <Text style={[htpStyles.tipText, { color: colors.textSecondary }]}>
                                In English, E, T, A, O, I, N appear most frequently. Use the Frequency Tool at the top of the screen to quickly spot common vowels!
                            </Text>
                        </View>

                        <View style={[htpStyles.tipCard, { backgroundColor: colors.goldBg }]}>
                            <Text style={[htpStyles.tipTitle, { color: colors.gold }]}>2. Word Lengths & Patterns</Text>
                            <Text style={[htpStyles.tipText, { color: colors.textSecondary }]}>
                                Single-letter words are almost always 'A' or 'I'. Common two-letter words include 'OF', 'TO', 'IN', 'IS', 'IT'.
                            </Text>
                        </View>

                        <View style={[htpStyles.tipCard, { backgroundColor: colors.successBg }]}>
                            <Text style={[htpStyles.tipTitle, { color: colors.success }]}>3. Combo Multipliers</Text>
                            <Text style={[htpStyles.tipText, { color: colors.textSecondary }]}>
                                Correctly placing letters consecutively without errors builds your Combo Multiplier up to 2.5x score bonus!
                            </Text>
                        </View>
                    </View>

                    {/* Grading System */}
                    <View style={htpStyles.section}>
                        <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Solve Grades</Text>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Solve with 95%+ accuracy and 0 hints to earn the coveted S-Rank!
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const htpStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: { fontSize: 24, fontWeight: '800', marginTop: -2 },
    headerTitle: { fontSize: 20, fontWeight: '900', fontFamily: 'serif' },
    content: { padding: 20, gap: 24, paddingBottom: 40 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    bodyText: { fontSize: 14, lineHeight: 22 },
    exampleBox: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        gap: 4,
    },
    exampleCipher: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
    exampleArrow: { fontSize: 18 },
    exampleSolved: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
    tipCard: { padding: 14, borderRadius: 12, gap: 4 },
    tipTitle: { fontSize: 14, fontWeight: '800' },
    tipText: { fontSize: 13, lineHeight: 18 },
});

// ==================== SETTINGS SCREEN ====================
export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const {
        settings,
        updateSettings,
        setTheme,
        unlockedThemes,
        resetAllProgress,
        colors,
        triggerHaptic,
    } = useGame();

    const [showHowToPlay, setShowHowToPlay] = useState(false);

    const handleUpdate = (key: keyof AppSettings, value: any) => {
        triggerHaptic('light');
        updateSettings({ ...settings, [key]: value });
    };

    const difficulties: Difficulty[] = ['Easy', 'Normal', 'Hard', 'Legendary'];
    // 'system' is the default value, so it must be selectable or a fresh install
    // shows no active chip.
    const fontSizes: FontSize[] = ['system', 'small', 'medium', 'large'];
    const fontFamilies: FontFamily[] = ['system', 'sans', 'serif', 'mono', 'cursive', 'handwritten'];
    const fontSizeLabel = (size: FontSize) =>
        size === 'system' ? 'System' : size === 'small' ? 'Compact' : size === 'medium' ? 'Standard' : 'Large';

    const getFontFamilyNative = (font: FontFamily) => {
        switch (font) {
            case 'mono': return 'monospace';
            case 'serif': return 'serif';
            case 'cursive': return 'serif';
            case 'handwritten': return 'sans-serif-condensed';
            case 'sans':
            default: return 'System';
        }
    };

    const handleResetAll = () => {
        triggerHaptic('heavy');
        Alert.alert(
            "Reset All Progress?",
            "This will reset all your solved puzzles, scores, and statistics. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset Everything",
                    style: "destructive",
                    onPress: () => {
                        resetAllProgress();
                        Alert.alert("Reset Complete", "All game data has been reset.");
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {/* Settings is a root tab; a back arrow here just jumped to a random
                    previously visited tab, so the header is title-only. */}
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* How to Play Card */}
                <Pressable
                    onPress={() => {
                        triggerHaptic('light');
                        setShowHowToPlay(true);
                    }}
                    style={({ pressed }) => [
                        styles.howToPlayButton,
                        { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder },
                        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                    ]}
                >
                    <Text style={{ fontSize: 24, color: colors.primary }}>â–¤</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.howToPlayTitle, { color: colors.primary }]}>How to Play & Pro Tips</Text>
                        <Text style={[styles.howToPlaySub, { color: colors.textSecondary }]}>
                            Rules, cryptanalysis tips & scoring guide
                        </Text>
                    </View>
                    <Text style={[styles.howToPlayArrow, { color: colors.primary }]}>â€º</Text>
                </Pressable>

                {/* Difficulty */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Difficulty</Text>
                    <View style={styles.optionsRow}>
                        {difficulties.map((diff) => (
                            <Pressable
                                key={diff}
                                style={({ pressed }) => [
                                    styles.optionChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    settings.difficulty === diff && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={() => handleUpdate('difficulty', diff)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                accessibilityRole="button"
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: colors.textSecondary },
                                    settings.difficulty === diff && { color: colors.primary, fontWeight: '800' }
                                ]}>
                                    {diff}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={[styles.hintText, { color: colors.textMuted }]}>
                        {settings.difficulty === 'Easy' && 'Most starter hints (45%). Smaller base coin reward.'}
                        {settings.difficulty === 'Normal' && '25% starter hints. Standard balance.'}
                        {settings.difficulty === 'Hard' && '10% starter hints. Higher base coin reward.'}
                        {settings.difficulty === 'Legendary' && 'No starter hints. Highest base coin reward.'}
                    </Text>
                </View>

                {/* Themes */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Theme</Text>
                    <View style={styles.optionsRow}>
                        {(['dark', 'cyberpunk', 'terminal', 'gold', 'midnight', 'ocean', 'light'] as Theme[]).map((tKey) => {
                            const isOwned = unlockedThemes.has(tKey);
                            const isActive = settings.theme === tKey;

                            return (
                                <Pressable
                                    key={tKey}
                                    style={({ pressed }) => [
                                        styles.themeChip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        isActive && { backgroundColor: colors.primaryBg, borderColor: colors.primary, borderWidth: 2 },
                                        !isOwned && { opacity: 0.5 },
                                        pressed && { opacity: 0.7 },
                                    ]}
                                    onPress={() => {
                                        if (isOwned) {
                                            setTheme(tKey);
                                        } else {
                                            navigation.navigate('Store');
                                        }
                                    }}
                                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                    accessibilityRole="button"
                                >
                                    <Text style={{ fontSize: 16 }}>{THEME_NAMES[tKey].icon}</Text>
                                    <Text style={[
                                        styles.chipText,
                                        { color: colors.text },
                                        isActive && { color: colors.primary, fontWeight: '800' }
                                    ]}>
                                        {THEME_NAMES[tKey].name} {!isOwned && 'â–£'}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Controls & Gameplay */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Gameplay & Controls</Text>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Tactile Haptics</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Vibration on keystrokes and victories</Text>
                        </View>
                        <Switch
                            value={settings.hapticsEnabled}
                            onValueChange={(val) => handleUpdate('hapticsEnabled', val)}
                            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Frequency Analysis Bar</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Show letter occurrence counts above grid</Text>
                        </View>
                        <Switch
                            value={settings.showFrequencyBar}
                            onValueChange={(val) => handleUpdate('showFrequencyBar', val)}
                            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Auto-Advance Cursor</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Move to next cell after correct letter</Text>
                        </View>
                        <Switch
                            value={settings.autoAdvance}
                            onValueChange={(val) => handleUpdate('autoAdvance', val)}
                            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Block Used Letters</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Disable keyboard keys once assigned</Text>
                        </View>
                        <Switch
                            value={settings.blockUsedLetters}
                            onValueChange={(val) => handleUpdate('blockUsedLetters', val)}
                            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Hide Timer</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Hide the clock for a calmer solve</Text>
                        </View>
                        <Switch
                            value={settings.hideTimer}
                            onValueChange={(val) => handleUpdate('hideTimer', val)}
                            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                        />
                    </View>
                </View>

                {/* Typography Settings */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Typography</Text>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Font Size</Text>
                    <View style={styles.optionsRow}>
                        {fontSizes.map((size) => (
                            <Pressable
                                key={size}
                                style={({ pressed }) => [
                                    styles.optionChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    settings.fontSize === size && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={() => handleUpdate('fontSize', size)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                accessibilityRole="button"
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: colors.textSecondary },
                                    settings.fontSize === size && { color: colors.primary, fontWeight: '800' }
                                ]}>
                                    {fontSizeLabel(size)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Font Family</Text>
                    <View style={styles.optionsRow}>
                        {fontFamilies.map((font) => (
                            <Pressable
                                key={font}
                                style={({ pressed }) => [
                                    styles.optionChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    settings.fontFamily === font && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={() => handleUpdate('fontFamily', font)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                accessibilityRole="button"
                            >
                                <RNText style={[
                                    styles.chipText,
                                    { color: colors.textSecondary },
                                    settings.fontFamily === font && { color: colors.primary, fontWeight: '800' },
                                    {
                                        fontFamily: getFontFamilyNative(font),
                                        fontStyle: font === 'cursive' ? 'italic' : 'normal'
                                    },
                                ]}>
                                    {font === 'system' ? 'System' :
                                        font === 'sans' ? 'Sans' :
                                        font === 'serif' ? 'Serif' :
                                            font === 'mono' ? 'Mono' :
                                                font === 'cursive' ? 'Cursive' : 'Hand'}
                                </RNText>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Reset Progress */}
                <View style={styles.section}>
                    <Pressable
                        onPress={handleResetAll}
                        style={({ pressed }) => [
                            styles.resetBtn,
                            { backgroundColor: colors.errorBg, borderColor: colors.error },
                            pressed && { opacity: 0.8 }
                        ]}
                    >
                        <Text style={[styles.resetBtnText, { color: colors.error }]}>Reset All Game Progress</Text>
                    </Pressable>

                    <Text style={[styles.versionText, { color: colors.textMuted }]}>BrainCipher v1.0.0 â€¢ Production Build</Text>
                </View>
            </ScrollView>

            <HowToPlayModal visible={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: { fontSize: 24, fontWeight: '800', marginTop: -2 },
    title: { fontSize: 22, fontWeight: '900', fontFamily: 'serif' },
    content: { padding: 20, gap: 24, paddingBottom: 40 },
    howToPlayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 12,
    },
    howToPlayTitle: { fontSize: 15, fontWeight: '800' },
    howToPlaySub: { fontSize: 12, marginTop: 2 },
    howToPlayArrow: { fontSize: 24, fontWeight: '800' },
    section: { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '800' },
    label: { fontSize: 13, fontWeight: '700', marginTop: 4 },
    optionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionChip: {
        minHeight: 48,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeChip: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: '600' },
    hintText: { fontSize: 12, fontStyle: 'italic' },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 48,
        paddingVertical: 8,
    },
    switchLabel: { fontSize: 15, fontWeight: '700' },
    switchSub: { fontSize: 11, marginTop: 2 },
    resetBtn: {
        minHeight: 48,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginTop: 10,
    },
    resetBtnText: { fontSize: 14, fontWeight: '800' },
    versionText: { textAlign: 'center', fontSize: 12, marginTop: 6 },
});
