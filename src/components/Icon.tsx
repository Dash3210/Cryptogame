import React from 'react';
import { StyleProp, ViewStyle, View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useGame } from '../context/GameContext';
import { ICON_XML, IconName } from './iconRegistry';

export { ICON_NAMES } from './iconRegistry';
export type { IconName } from './iconRegistry';

export const DETERMINISTIC_ACCENTS = [
    '#38bdf8', // Sky / Cyan
    '#818cf8', // Indigo
    '#c084fc', // Purple
    '#f472b6', // Pink
    '#fb7185', // Rose
    '#f97316', // Orange
    '#fbbf24', // Amber
    '#34d399', // Emerald
    '#2dd4bf', // Teal
    '#a78bfa', // Violet
    '#60a5fa', // Blue
    '#4ade80', // Green
] as const;

/**
 * Deterministically derives an accent color from an ID or string key using a stable hash.
 */
export function getDeterministicAccent(key: string): string {
    const str = key || 'default';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % DETERMINISTIC_ACCENTS.length;
    return DETERMINISTIC_ACCENTS[index];
}

/**
 * Derives a clean single-character monogram for display in the fallback container.
 */
export function getMonogramLetter(name: string, fallbackLabel?: string): string {
    const raw = (fallbackLabel && fallbackLabel.trim()) || '';
    if (raw.length > 0) {
        const match = raw.match(/[a-zA-Z0-9]/);
        if (match) return match[0].toUpperCase();
        return raw[0].toUpperCase();
    }
    const clean = (name || '').replace(/^(subject|branch|icon|theme)[-_]/i, '').trim();
    const match = clean.match(/[a-zA-Z0-9]/);
    if (match) return match[0].toUpperCase();
    const fallbackMatch = (name || '').trim();
    return (fallbackMatch[0] || '?').toUpperCase();
}

/**
 * Helper to convert hex colors to rgba strings.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface IconProps {
    /** Slug from the icon kit, or custom subject/branch icon slug. */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Tint. Defaults to the current theme's primary text colour. */
    color?: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    /** Optional subject/branch label used to derive monogram letter for fallback. */
    fallbackLabel?: string;
    /** Optional identifier used to seed the deterministic accent color. Defaults to name. */
    id?: string;
}

export interface IconBaseProps {
    /** Slug from the icon kit, or custom subject/branch icon slug. */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Resolved colour string to tint the icon. */
    resolvedColor: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    /** Optional subject/branch label used to derive monogram letter for fallback. */
    fallbackLabel?: string;
    /** Optional identifier used to seed the deterministic accent color. Defaults to name. */
    id?: string;
}

export interface ThemedIconProps {
    /** Slug from the icon kit, or custom subject/branch icon slug. */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Tint. When omitted or falsy, defaults to the theme text colour. */
    color?: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    /** Optional subject/branch label used to derive monogram letter for fallback. */
    fallbackLabel?: string;
    /** Optional identifier used to seed the deterministic accent color. Defaults to name. */
    id?: string;
}

/**
 * Presentational icon primitive rendering SvgXml from ICON_XML with a deterministic
 * monogram fallback for unrecognised slugs.
 * Does NOT subscribe to GameContext; requires an explicit resolvedColor.
 */
export const IconBase: React.FC<IconBaseProps> = React.memo(({
    name,
    size = 24,
    resolvedColor,
    style,
    accessibilityLabel,
    fallbackLabel,
    id,
}) => {
    const xml = name ? ICON_XML[name as keyof typeof ICON_XML] : undefined;
    if (xml) {
        return (
            <SvgXml
                xml={xml}
                width={size}
                height={size}
                color={resolvedColor}
                style={style}
                accessible={!!accessibilityLabel}
                accessibilityRole="image"
                accessibilityLabel={accessibilityLabel}
            />
        );
    }

    const letter = getMonogramLetter(name, fallbackLabel);
    const accent = getDeterministicAccent(id || name || fallbackLabel || 'default');
    const fontSize = Math.max(10, Math.round(size * 0.5));
    const borderRadius = Math.max(3, Math.round(size * 0.28));

    return (
        <View
            testID="icon-fallback-monogram"
            style={[
                styles.fallbackContainer,
                {
                    width: size,
                    height: size,
                    borderRadius,
                    backgroundColor: hexToRgba(accent, 0.16),
                    borderColor: hexToRgba(accent, 0.4),
                },
                style,
            ]}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel || `${fallbackLabel || name || 'subject'} icon`}
        >
            <Text
                testID="icon-fallback-letter"
                style={[
                    styles.fallbackText,
                    {
                        color: accent,
                        fontSize,
                        lineHeight: fontSize + 2,
                    }
                ]}
            >
                {letter}
            </Text>
        </View>
    );
});

IconBase.displayName = 'IconBase';

/**
 * Themed icon wrapper that subscribes to useGame() and resolves the theme text colour.
 */
export const ThemedIcon: React.FC<ThemedIconProps> = React.memo(({
    name,
    size = 24,
    color,
    style,
    accessibilityLabel,
    fallbackLabel,
    id,
}) => {
    const { colors } = useGame();
    return (
        <IconBase
            name={name}
            size={size}
            resolvedColor={color || colors.text}
            style={style}
            accessibilityLabel={accessibilityLabel}
            fallbackLabel={fallbackLabel}
            id={id}
        />
    );
});

ThemedIcon.displayName = 'ThemedIcon';

/**
 * Monochrome icon from the BrainCipher icon kit, with deterministic monogram fallback.
 *
 * For known icons, SVGs use `currentColor` and tint to the resolved color.
 * For unknown or custom slugs, renders an optically-aligned monogram badge on a stable
 * accent colour without throwing or causing compile errors.
 */
export const Icon: React.FC<IconProps> = React.memo(({
    name,
    size = 24,
    color,
    style,
    accessibilityLabel,
    fallbackLabel,
    id,
}) => {
    if (color) {
        return (
            <IconBase
                name={name}
                size={size}
                resolvedColor={color}
                style={style}
                accessibilityLabel={accessibilityLabel}
                fallbackLabel={fallbackLabel}
                id={id}
            />
        );
    }

    return (
        <ThemedIcon
            name={name}
            size={size}
            color={color}
            style={style}
            accessibilityLabel={accessibilityLabel}
            fallbackLabel={fallbackLabel}
            id={id}
        />
    );
});

Icon.displayName = 'Icon';

const styles = StyleSheet.create({
    fallbackContainer: {
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    fallbackText: {
        fontWeight: '800',
        textAlign: 'center',
        includeFontPadding: false,
    },
});

