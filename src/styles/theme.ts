import { Theme, FontSize, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    fontSize: 'system',
    fontFamily: 'system',
    difficulty: 'Normal',
    blockUsedLetters: true,
    autoAdvance: true,
    hideTimer: false,
    hapticsEnabled: true,
    showFrequencyBar: true,
};

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceHighlight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryBg: string;
    primaryBorder: string;
    success: string;
    successBg: string;
    successBorder: string;
    error: string;
    errorBg: string;
    matching: string;
    matchingBg: string;
    gold: string;
    goldBg: string;
    shadow: string;
    cardGlow?: string;
}

export const RADIUS = {
    micro: 4,      // badges, chips, progress tracks
    element: 8,    // buttons, inputs, keyboard keys
    container: 12, // cards, panels, dialogs
} as const;

/**
 * Semantic Type Scale (adhering to /better-typography principles):
 * - Role-based sizing and descending visual hierarchy
 * - Deliberate line heights (1.1-1.2 headings, 1.4-1.6 body)
 * - Negative letter-spacing for large display text, positive for small uppercase labels
 * - Hardware tabular numbers ('tabular-nums') for dynamic numeric data
 */
export const TYPOGRAPHY = {
    display: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    title: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },
    headline: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '600' as const,
        letterSpacing: 0,
    },
    body: {
        fontSize: 15,
        lineHeight: 22, // 1.47 ratio for comfortable reading
        fontWeight: '400' as const,
        letterSpacing: 0,
    },
    bodySm: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400' as const,
        letterSpacing: 0,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500' as const,
        letterSpacing: 0.2,
    },
    label: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '700' as const,
        letterSpacing: 0.8,
        textTransform: 'uppercase' as const,
    },
    tabular: {
        fontFamily: 'monospace',
        fontVariant: ['tabular-nums'] as ('tabular-nums')[],
        fontWeight: '700' as const,
    },
} as const;

export type TypographyVariant = keyof typeof TYPOGRAPHY;

export const THEME_NAMES: Record<Theme, { name: string; icon: string; description: string }> = {
    dark: { name: 'Dark Slate', icon: '🌑', description: 'Midnight graphite & vibrant indigo' },
    cyberpunk: { name: 'Cyberpunk Neon', icon: '⚡', description: 'Electric cyan, magenta & neon vibes' },
    terminal: { name: 'Matrix Terminal', icon: '💻', description: 'Retro hacker green on pure black' },
    gold: { name: 'Obsidian Gold', icon: '👑', description: 'Onyx black with rich royal gold' },
    midnight: { name: 'Midnight Galaxy', icon: '🌌', description: 'Cosmic purple, mystic violet & starlight' },
    ocean: { name: 'Ocean Depths', icon: '🌊', description: 'Deep maritime navy, seafoam & pearl cream' },
    light: { name: 'Clean Paper', icon: '☀️', description: 'Crisp editorial warm daylight' },
};

export const COLORS: Record<Theme, ThemeColors> = {
    dark: {
        background: '#070b12',
        surface: '#0c1322',
        surfaceHighlight: '#141d30',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#1e293b',
        primary: '#00e5ff',
        primaryBg: 'rgba(0, 229, 255, 0.18)',
        primaryBorder: 'rgba(0, 229, 255, 0.4)',
        success: '#10b981',
        successBg: 'rgba(16, 185, 129, 0.18)',
        successBorder: 'rgba(16, 185, 129, 0.4)',
        error: '#f43f5e',
        errorBg: 'rgba(244, 63, 94, 0.18)',
        matching: '#38bdf8',
        matchingBg: 'rgba(56, 189, 248, 0.18)',
        gold: '#f59e0b',
        goldBg: 'rgba(245, 158, 11, 0.18)',
        shadow: '#000000',
        cardGlow: 'rgba(0, 229, 255, 0.25)',
    },
    cyberpunk: {
        background: '#080514',
        surface: '#120d2b',
        surfaceHighlight: '#1d1544',
        text: '#fdf4ff',
        textSecondary: '#c084fc',
        textMuted: '#7e22ce',
        border: '#2e1065',
        primary: '#06b6d4',
        primaryBg: 'rgba(6, 182, 212, 0.2)',
        primaryBorder: '#06b6d4',
        success: '#22d3ee',
        successBg: 'rgba(34, 211, 238, 0.2)',
        successBorder: '#22d3ee',
        error: '#f43f5e',
        errorBg: 'rgba(244, 63, 94, 0.2)',
        matching: '#ec4899',
        matchingBg: 'rgba(236, 72, 153, 0.2)',
        gold: '#fbbf24',
        goldBg: 'rgba(251, 191, 36, 0.2)',
        shadow: '#000000',
        cardGlow: 'rgba(6, 182, 212, 0.3)',
    },
    terminal: {
        background: '#030704',
        surface: '#07140b',
        surfaceHighlight: '#0e2414',
        text: '#4ade80',
        textSecondary: '#22c55e',
        textMuted: '#15803d',
        border: '#14532d',
        primary: '#22c55e',
        primaryBg: 'rgba(34, 197, 94, 0.18)',
        primaryBorder: '#22c55e',
        success: '#4ade80',
        successBg: 'rgba(74, 222, 128, 0.2)',
        successBorder: '#4ade80',
        error: '#ef4444',
        errorBg: 'rgba(239, 68, 68, 0.2)',
        matching: '#86efac',
        matchingBg: 'rgba(134, 239, 172, 0.18)',
        gold: '#eab308',
        goldBg: 'rgba(234, 179, 8, 0.18)',
        shadow: '#000000',
        cardGlow: 'rgba(34, 197, 94, 0.25)',
    },
    gold: {
        background: '#09090b',
        surface: '#18181b',
        surfaceHighlight: '#27272a',
        text: '#fafafa',
        textSecondary: '#d4d4d8',
        textMuted: '#71717a',
        border: '#27272a',
        primary: '#f59e0b',
        primaryBg: 'rgba(245, 158, 11, 0.18)',
        primaryBorder: 'rgba(245, 158, 11, 0.45)',
        success: '#10b981',
        successBg: 'rgba(16, 185, 129, 0.18)',
        successBorder: 'rgba(16, 185, 129, 0.4)',
        error: '#ef4444',
        errorBg: 'rgba(239, 68, 68, 0.18)',
        matching: '#fbbf24',
        matchingBg: 'rgba(251, 191, 36, 0.18)',
        gold: '#f59e0b',
        goldBg: 'rgba(245, 158, 11, 0.25)',
        shadow: '#000000',
        cardGlow: 'rgba(245, 158, 11, 0.3)',
    },
    midnight: {
        background: '#130c24',
        surface: '#1c1335',
        surfaceHighlight: '#291c4d',
        text: '#f5f3ff',
        textSecondary: '#c084fc',
        textMuted: '#8b5cf6',
        border: '#3b2064',
        primary: '#a855f7',
        primaryBg: 'rgba(168, 85, 247, 0.2)',
        primaryBorder: 'rgba(168, 85, 247, 0.45)',
        success: '#34d399',
        successBg: 'rgba(52, 211, 153, 0.18)',
        successBorder: 'rgba(52, 211, 153, 0.4)',
        error: '#f43f5e',
        errorBg: 'rgba(244, 63, 94, 0.2)',
        matching: '#e879f9',
        matchingBg: 'rgba(232, 121, 249, 0.2)',
        gold: '#fbbf24',
        goldBg: 'rgba(251, 191, 36, 0.2)',
        shadow: '#000000',
        cardGlow: 'rgba(168, 85, 247, 0.28)',
    },
    ocean: {
        background: '#0a141e',
        surface: '#122234',
        surfaceHighlight: '#1a314b',
        text: '#f0fdfa',
        textSecondary: '#99f6e4',
        textMuted: '#2dd4bf',
        border: '#164e63',
        primary: '#14b8a6',
        primaryBg: 'rgba(20, 184, 166, 0.18)',
        primaryBorder: 'rgba(20, 184, 166, 0.45)',
        success: '#10b981',
        successBg: 'rgba(16, 185, 129, 0.18)',
        successBorder: 'rgba(16, 185, 129, 0.4)',
        error: '#f43f5e',
        errorBg: 'rgba(244, 63, 94, 0.18)',
        matching: '#38bdf8',
        matchingBg: 'rgba(56, 189, 248, 0.18)',
        gold: '#f59e0b',
        goldBg: 'rgba(245, 158, 11, 0.18)',
        shadow: '#000000',
        cardGlow: 'rgba(20, 184, 166, 0.25)',
    },
    light: {
        background: '#f8fafc',
        surface: '#ffffff',
        surfaceHighlight: '#f1f5f9',
        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        primary: '#4f46e5',
        primaryBg: '#e0e7ff',
        primaryBorder: '#c7d2fe',
        success: '#16a34a',
        successBg: '#dcfce7',
        successBorder: '#86efac',
        error: '#e11d48',
        errorBg: '#ffe4e6',
        matching: '#0284c7',
        matchingBg: '#e0f2fe',
        gold: '#d97706',
        goldBg: '#fef3c7',
        shadow: '#000000',
        cardGlow: 'rgba(79, 70, 229, 0.15)',
    }
};

export const getTheme = (mode: Theme | 'system' = 'dark', sysFallback: 'light' | 'dark' = 'dark'): ThemeColors => {
    if (mode === 'system') return COLORS[sysFallback];
    return COLORS[mode] || COLORS.dark;
};

export const getFontScale = (size: FontSize): number => {
    switch (size) {
        case 'small': return 0.85;
        case 'large': return 1.18;
        case 'system':
        case 'medium':
        default: return 1.0;
    }
};

export const getFontFamilyNative = (font: string): string | undefined => {
    switch (font) {
        case 'mono': return 'monospace';
        case 'serif': return 'serif';
        case 'cursive': return 'serif';
        case 'handwritten': return 'sans-serif-condensed';
        case 'sans':
        case 'system':
        default: return undefined;
    }
};
