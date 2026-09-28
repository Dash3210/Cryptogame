import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useGame } from '../context/GameContext';
import { ICON_XML, IconName } from './iconRegistry';

export { ICON_NAMES } from './iconRegistry';
export type { IconName } from './iconRegistry';

export interface IconProps {
    /** Slug from the icon kit (see src/assets/icons). */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Tint. Defaults to the current theme's primary text colour. */
    color?: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

export interface IconBaseProps {
    /** Slug from the icon kit (see src/assets/icons). */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Resolved colour string to tint the icon. */
    resolvedColor: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

export interface ThemedIconProps {
    /** Slug from the icon kit (see src/assets/icons). */
    name: IconName;
    /** Square size in dp. Icons are authored on a 24x24 grid. */
    size?: number;
    /** Tint. When omitted or falsy, defaults to the theme text colour. */
    color?: string;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

/**
 * Presentational icon primitive rendering SvgXml from ICON_XML.
 * Does NOT subscribe to GameContext; requires an explicit resolvedColor.
 */
export const IconBase: React.FC<IconBaseProps> = React.memo(({
    name,
    size = 24,
    resolvedColor,
    style,
    accessibilityLabel,
}) => {
    const xml = ICON_XML[name];
    if (!xml) return null;

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
}) => {
    const { colors } = useGame();
    return (
        <IconBase
            name={name}
            size={size}
            resolvedColor={color || colors.text}
            style={style}
            accessibilityLabel={accessibilityLabel}
        />
    );
});

ThemedIcon.displayName = 'ThemedIcon';

/**
 * Monochrome icon from the BrainCipher icon kit.
 *
 * The SVGs use `currentColor`; pass `color` (or let it inherit the theme text
 * colour) and the whole icon tints to that single colour.
 */
export const Icon: React.FC<IconProps> = React.memo(({
    name,
    size = 24,
    color,
    style,
    accessibilityLabel,
}) => {
    if (color) {
        return (
            <IconBase
                name={name}
                size={size}
                resolvedColor={color}
                style={style}
                accessibilityLabel={accessibilityLabel}
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
        />
    );
});

Icon.displayName = 'Icon';
