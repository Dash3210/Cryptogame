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
    const { colors } = useGame();
    const xml = ICON_XML[name];
    if (!xml) return null;

    return (
        <SvgXml
            xml={xml}
            width={size}
            height={size}
            color={color ?? colors.text}
            style={style}
            accessible={!!accessibilityLabel}
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
        />
    );
});

Icon.displayName = 'Icon';
