import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Pressable, Alert, Modal, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../components/AppText';
import { useGame } from '../context/GameContext';
import { AppSettings, Difficulty, FontFamily, FontSize, Theme } from '../types';
import { THEME_NAMES, getFontFamilyNative } from '../styles/theme';
import { Icon, IconName } from '../components/Icon';

// ==================== HOW TO PLAY MODAL ====================
export const HowToPlayModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const { colors, triggerHaptic } = useGame();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[htpStyles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                {/* Header with accessible min-48dp close button */}
                <View style={[htpStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Text style={[htpStyles.headerTitle, { color: colors.text }]}>How to Play</Text>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light');
                            onClose();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Close how to play"
                        hitSlop={8}
                        style={({ pressed }) => [
                            htpStyles.closeBtn,
                            { backgroundColor: colors.surfaceHighlight },
                            pressed && { opacity: 0.7 }
                        ]}
                    >
                        <Icon name="close" size={20} color={colors.text} />
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={htpStyles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Section 1: The Goal */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="puzzle" size={20} color={colors.primary} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>The Goal</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Every cipher puzzle encrypts a scientific DEFINITION where each letter is substituted with a unique cipher symbol. Decrypt the clues to reveal the definition, then name the TERM it describes.
                        </Text>
                        <View style={[htpStyles.flowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={htpStyles.flowStep}>
                                <Text style={[htpStyles.flowLabel, { color: colors.textMuted }]}>ENCRYPTED DEFINITION</Text>
                                <Text style={[htpStyles.flowCipher, { color: colors.error }]}>X KWRT VIB</Text>
                            </View>
                            <View style={htpStyles.flowArrowCol}>
                                <Icon name="chevron-right" size={16} color={colors.textMuted} />
                            </View>
                            <View style={htpStyles.flowStep}>
                                <Text style={[htpStyles.flowLabel, { color: colors.textMuted }]}>SOLVED DEFINITION</Text>
                                <Text style={[htpStyles.flowSolved, { color: colors.success }]}>I LOVE YOU</Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 2: Solving & Board States */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="target" size={20} color={colors.primary} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Solving & Cell Navigation</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Tap any empty gap on the puzzle board to focus it. As you type, the cursor automatically advances to the next empty cell in the definition.
                        </Text>
                        <View style={htpStyles.stateRowContainer}>
                            {/* Active Gap */}
                            <View style={[htpStyles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[htpStyles.miniCell, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                                    <Text style={[htpStyles.miniCellText, { color: colors.success }]}>A</Text>
                                </View>
                                <Text style={[htpStyles.stateTitle, { color: colors.success }]}>Active Gap</Text>
                                <Text style={[htpStyles.stateDesc, { color: colors.textSecondary }]}>
                                    Green outline. The current selected cell where your keystrokes land.
                                </Text>
                            </View>

                            {/* Other Empty Gaps */}
                            <View style={[htpStyles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[htpStyles.miniCell, { backgroundColor: colors.matchingBg, borderColor: colors.matching }]}>
                                    <Text style={[htpStyles.miniCellText, { color: colors.matching }]}> </Text>
                                </View>
                                <Text style={[htpStyles.stateTitle, { color: colors.matching }]}>Empty Gap</Text>
                                <Text style={[htpStyles.stateDesc, { color: colors.textSecondary }]}>
                                    Blue outline. Other empty gaps awaiting your input.
                                </Text>
                            </View>

                            {/* Solved Cells */}
                            <View style={[htpStyles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[htpStyles.miniCell, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                                    <Text style={[htpStyles.miniCellText, { color: colors.text, fontWeight: '900' }]}>T</Text>
                                </View>
                                <Text style={[htpStyles.stateTitle, { color: colors.text }]}>Solved Cell</Text>
                                <Text style={[htpStyles.stateDesc, { color: colors.textSecondary }]}>
                                    Plain and borderless once correctly placed in the text.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 3: Keyboard & Frequency Hints */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="frequency-wave" size={20} color={colors.primary} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Symmetric Keyboard</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            The virtual keyboard features balanced action controls on both sides for effortless thumb reach: Next on the left, 7 letters in the middle, and Delete on the right.
                        </Text>
                        <View style={[htpStyles.keyboardDiagram, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[htpStyles.diagramKeyAction, { backgroundColor: colors.surfaceHighlight }]}>
                                <Icon name="next-cell" size={16} color={colors.text} />
                                <Text style={[htpStyles.diagramKeyLabel, { color: colors.textMuted }]}>NEXT</Text>
                            </View>
                            <View style={htpStyles.diagramLetterGroup}>
                                {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((letter) => (
                                    <View key={letter} style={[htpStyles.diagramKeyLetter, { backgroundColor: colors.background }]}>
                                        <Text style={[htpStyles.diagramLetterText, { color: colors.text }]}>{letter}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={[htpStyles.diagramKeyAction, { backgroundColor: colors.surfaceHighlight }]}>
                                <Icon name="backspace" size={16} color={colors.text} />
                                <Text style={[htpStyles.diagramKeyLabel, { color: colors.textMuted }]}>DEL</Text>
                            </View>
                        </View>

                        <View style={[htpStyles.calloutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={htpStyles.calloutHeaderRow}>
                                <Icon name="hint" size={18} color={colors.gold} />
                                <Text style={[htpStyles.calloutTitle, { color: colors.gold }]}>Frequency Hints</Text>
                            </View>
                            <Text style={[htpStyles.calloutBody, { color: colors.textSecondary }]}>
                                Enable Frequency Hints in Settings to shade keyboard keys by their actual occurrence count in this puzzle. Keys are shaded only for letters you have already correctly decoded. Undecoded letters and letters not in the puzzle stay unlit, never leaking the solution.
                            </Text>
                        </View>
                    </View>

                    {/* Section 4: Coins & Economy */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="coin" size={20} color={colors.gold} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Coin Economy</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Base coin rewards scale by difficulty and puzzle length (Short, Medium, Long, Epic), minus deductions for mistakes, hints, and overtime, with a clean-solve bonus and a guaranteed floor.
                        </Text>
                        <View style={[htpStyles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.tableCellLabel, { color: colors.textSecondary }]}>Difficulty Base</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.text }]}>Easy: 40 · Normal: 50 · Hard: 65 · Leg.: 80</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.tableCellLabel, { color: colors.textSecondary }]}>Length Tiers</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.text }]}>Short (+0) · Med (+5) · Long (+10) · Epic (+15)</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.tableCellLabel, { color: colors.textSecondary }]}>Deductions</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.error }]}>Mistakes (-2) · Hints (-3) · Overtime (-1/20s)</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.tableCellLabel, { color: colors.textSecondary }]}>Clean Solve Bonus</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.success }]}>+5 coins (0 mistakes, 0 hints)</Text>
                            </View>
                            <View style={htpStyles.tableRowLast}>
                                <Text style={[htpStyles.tableCellLabel, { color: colors.textSecondary }]}>Guaranteed Floor</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.primary }]}>Minimum 15 coins for regular solves</Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 5: Master Key */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="masterkey" size={20} color={colors.primary} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Master Key</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            When completely stuck on a puzzle, unlock the Master Key by watching a rewarded ad to instantly reveal the solved cryptogram.
                        </Text>
                        <View style={[htpStyles.calloutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={htpStyles.specRow}>
                                <Text style={[htpStyles.specLabel, { color: colors.textSecondary }]}>Payout:</Text>
                                <Text style={[htpStyles.specValue, { color: colors.text }]}>Small flat 10 coins</Text>
                            </View>
                            <View style={htpStyles.specRow}>
                                <Text style={[htpStyles.specLabel, { color: colors.textSecondary }]}>Solve Grade:</Text>
                                <Text style={[htpStyles.specValue, { color: colors.text }]}>Grade D (1 Star, 0 pts)</Text>
                            </View>
                            <View style={htpStyles.specRow}>
                                <Text style={[htpStyles.specLabel, { color: colors.textSecondary }]}>Streaks & Bonus:</Text>
                                <Text style={[htpStyles.specValue, { color: colors.error }]}>No win streak advance, no bonus round</Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 6: Comprehension Bonus */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="bolt" size={20} color={colors.gold} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Comprehension Bonus (+50%)</Text>
                        </View>
                        <Text style={[htpStyles.bodyText, { color: colors.textSecondary }]}>
                            Right after solving a puzzle, the Comprehension Bonus appears first: identify the scientific term described by the definition from 4 options, or tap Skip. The results breakdown with the revealed term appears only after that.
                        </Text>
                        <View style={[htpStyles.bonusOutcomeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={htpStyles.bonusCol}>
                                <Text style={[htpStyles.bonusBadgeTitle, { color: colors.success }]}>CORRECT GUESS</Text>
                                <Text style={[htpStyles.bonusBadgeDesc, { color: colors.textSecondary }]}>
                                    Awards a guaranteed +50% bonus on your earned coins and score.
                                </Text>
                            </View>
                            <View style={[htpStyles.bonusDivider, { backgroundColor: colors.border }]} />
                            <View style={htpStyles.bonusCol}>
                                <Text style={[htpStyles.bonusBadgeTitle, { color: colors.textMuted }]}>WRONG OR SKIP</Text>
                                <Text style={[htpStyles.bonusBadgeDesc, { color: colors.textSecondary }]}>
                                    Costs nothing—keep 100% of your earned coins and points.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 7: Grades, Combos, Streaks & Modes */}
                    <View style={htpStyles.section}>
                        <View style={htpStyles.sectionHeaderRow}>
                            <Icon name="trophy" size={20} color={colors.gold} />
                            <Text style={[htpStyles.sectionTitle, { color: colors.text }]}>Grades, Combos & Modes</Text>
                        </View>

                        {/* Grades */}
                        <View style={[htpStyles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[htpStyles.cardInnerHeading, { color: colors.text }]}>Solve Grades & Stars</Text>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.gradeBadge, { color: colors.gold }]}>Grade S (★★★)</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>95%+ accuracy and 0 hints used</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.gradeBadge, { color: colors.primary }]}>Grade A (★★★)</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>85%+ accuracy, ≤1 hint</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.gradeBadge, { color: colors.text }]}>Grade B (★★☆)</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>70%+ accuracy, ≤2 hints</Text>
                            </View>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text style={[htpStyles.gradeBadge, { color: colors.textSecondary }]}>Grade C (★☆☆)</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>50%+ accuracy</Text>
                            </View>
                            <View style={htpStyles.tableRowLast}>
                                <Text style={[htpStyles.gradeBadge, { color: colors.error }]}>Grade D (★☆☆)</Text>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>&lt;50% accuracy or Master Key</Text>
                            </View>
                        </View>

                        {/* Combos & Streaks */}
                        <View style={[htpStyles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[htpStyles.cardInnerHeading, { color: colors.text }]}>Combos & Daily Streaks</Text>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <View style={htpStyles.specRowItem}>
                                    <Icon name="combo" size={18} color={colors.gold} />
                                    <Text style={[htpStyles.specLabel, { color: colors.text }]}>Combo Multiplier</Text>
                                </View>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>
                                    Placing correct letters in succession without errors scales your score up to 2.5x.
                                </Text>
                            </View>
                            <View style={htpStyles.tableRowLast}>
                                <View style={htpStyles.specRowItem}>
                                    <Icon name="flame" size={18} color={colors.error} />
                                    <Text style={[htpStyles.specLabel, { color: colors.text }]}>Daily Streak</Text>
                                </View>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>
                                    Solve the Daily Challenge each calendar day to grow your consecutive streak.
                                </Text>
                            </View>
                        </View>

                        {/* Game Modes */}
                        <View style={[htpStyles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[htpStyles.cardInnerHeading, { color: colors.text }]}>Daily vs. Blitz Rush</Text>
                            <View style={[htpStyles.tableRow, { borderBottomColor: colors.border }]}>
                                <View style={htpStyles.specRowItem}>
                                    <Icon name="calendar" size={18} color={colors.primary} />
                                    <Text style={[htpStyles.specLabel, { color: colors.text }]}>Daily Challenge</Text>
                                </View>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>
                                    One uniform puzzle every day. Builds your streak and pays full base coins (50 + length tier).
                                </Text>
                            </View>
                            <View style={htpStyles.tableRowLast}>
                                <View style={htpStyles.specRowItem}>
                                    <Icon name="timer" size={18} color={colors.primary} />
                                    <Text style={[htpStyles.specLabel, { color: colors.text }]}>Blitz Rush</Text>
                                </View>
                                <Text style={[htpStyles.tableCellValue, { color: colors.textSecondary }]}>
                                    A fast-paced 90-second sprint. Solve definitions back-to-back; points convert to coins at 50:1 (minimum 5, capped at 100 coins).
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const htpStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeBtn: {
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 48,
        gap: 28,
    },
    section: {
        gap: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    bodyText: {
        fontSize: 14,
        lineHeight: 21,
    },
    flowCard: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flowStep: {
        flex: 1,
        gap: 4,
    },
    flowArrowCol: {
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flowLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    flowCipher: {
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 2,
    },
    flowSolved: {
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 2,
    },
    stateRowContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    stateCard: {
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    miniCell: {
        width: 38,
        height: 42,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    miniCellText: {
        fontSize: 18,
        fontWeight: '700',
    },
    stateTitle: {
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    stateDesc: {
        fontSize: 11,
        lineHeight: 15,
        textAlign: 'center',
    },
    keyboardDiagram: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    diagramKeyAction: {
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        gap: 4,
        minWidth: 44,
    },
    diagramKeyLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    diagramLetterGroup: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    diagramKeyLetter: {
        width: 26,
        height: 34,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    diagramLetterText: {
        fontSize: 13,
        fontWeight: '700',
    },
    calloutCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    calloutHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    calloutTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    calloutBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    tableCard: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    cardInnerHeading: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    tableRowLast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        gap: 12,
    },
    tableCellLabel: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    tableCellValue: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1.5,
        textAlign: 'right',
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    specLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    specValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    bonusOutcomeCard: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
    },
    bonusCol: {
        flex: 1,
        gap: 4,
    },
    bonusDivider: {
        width: StyleSheet.hairlineWidth,
        height: '100%',
    },
    bonusBadgeTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    bonusBadgeDesc: {
        fontSize: 12,
        lineHeight: 17,
    },
    gradeBadge: {
        fontSize: 13,
        fontWeight: '800',
        flex: 1,
    },
    specRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
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
                    <Icon name="book" size={24} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.howToPlayTitle, { color: colors.primary }]}>How to Play & Pro Tips</Text>
                        <Text style={[styles.howToPlaySub, { color: colors.textSecondary }]}>
                            Rules, cryptanalysis tips & scoring guide
                        </Text>
                    </View>
                    <Text style={[styles.howToPlayArrow, { color: colors.primary }]}>›</Text>
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
                                    <Icon name={THEME_NAMES[tKey].icon as IconName} size={16} color={isActive ? colors.primary : colors.text} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[
                                            styles.chipText,
                                            { color: colors.text },
                                            isActive && { color: colors.primary, fontWeight: '800' }
                                        ]}>
                                            {THEME_NAMES[tKey].name}
                                        </Text>
                                        {!isOwned && <Icon name="lock" size={11} color={colors.textMuted} />}
                                    </View>
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
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Frequency Hints</Text>
                            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Shade keyboard keys by frequency for letters you have decoded</Text>
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

                    <Text style={[styles.versionText, { color: colors.textMuted }]}>BrainCipher v1.0.0 • Production Build</Text>
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
