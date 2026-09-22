import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { useGame } from '../context/GameContext';
import { getFontScale, getFontFamilyNative, DEFAULT_SETTINGS, TYPOGRAPHY, TypographyVariant } from '../styles/theme';

export interface AppTextProps extends RNTextProps {
    children?: React.ReactNode;
    disableScaling?: boolean;
    variant?: TypographyVariant;
    tabular?: boolean;
}

export const AppText: React.FC<AppTextProps> = React.memo(({
    variant,
    tabular,
    disableScaling,
    style,
    ...props
}) => {
    const game = useGame();
    const settings = game?.settings || DEFAULT_SETTINGS;

    const fontFamily = settings.fontFamily === 'system' ? undefined : getFontFamilyNative(settings.fontFamily);
    const defaultFontStyle = settings.fontFamily === 'cursive' ? 'italic' : undefined;

    const flatStyle = style ? StyleSheet.flatten(style) : undefined;
    const fontStyle = flatStyle?.fontStyle || defaultFontStyle;

    // Semantic typography preset from /better-typography scale
    const variantStyle: TextStyle | undefined = variant ? TYPOGRAPHY[variant] : undefined;

    const baseFontSize = flatStyle?.fontSize || variantStyle?.fontSize || 14;
    const baseLineHeight = flatStyle?.lineHeight || variantStyle?.lineHeight;

    let finalFontSize: number | undefined;
    let finalLineHeight: number | undefined;

    if (!disableScaling) {
        const scale = getFontScale(settings.fontSize);
        finalFontSize = Math.round(baseFontSize * scale);
        if (baseLineHeight) {
            finalLineHeight = Math.round(baseLineHeight * scale);
        }
    } else {
        finalFontSize = baseFontSize;
        finalLineHeight = baseLineHeight;
    }

    const isTabular = tabular || variant === 'tabular';

    return (
        <RNText 
            {...props} 
            allowFontScaling={true}
            // The app already scales text from the in-app size setting; cap the
            // system multiplier so fixed-height cells and keys cannot overflow
            // when a user also has a large Android font scale.
            maxFontSizeMultiplier={1.15}
            style={[
                variantStyle,
                style,
                fontFamily ? { fontFamily } : null,
                fontStyle ? { fontStyle } : null,
                finalFontSize ? { fontSize: finalFontSize } : null,
                finalLineHeight ? { lineHeight: finalLineHeight } : null,
                isTabular ? { fontVariant: ['tabular-nums'] } : null,
            ]} 
        />
    );
});

