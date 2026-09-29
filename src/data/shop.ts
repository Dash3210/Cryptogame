import { Theme } from '../types';

export type ShopItemKind = 'extension' | 'theme' | 'consumable';

export type PurchaseResult =
    | 'OK'
    | 'INSUFFICIENT_FUNDS'
    | 'ALREADY_OWNED'
    | 'NOT_UNLOCKED'
    | 'UNKNOWN_ITEM';

export interface ShopItem<T = any> {
    id: string;
    kind: ShopItemKind;
    price: number;
    payload: T;
    repeatable: boolean;
    requiresUnlock?: (context: any) => boolean;
    label: string;
    description?: string;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
    // ------------------------------------------------------------------------
    // EXTENSIONS (Subject Packs)
    // ------------------------------------------------------------------------
    ext_compsci: {
        id: 'ext_compsci',
        kind: 'extension',
        price: 100,
        payload: { extensionId: 'compsci' },
        repeatable: false,
        label: 'Comp Sci',
        description: 'Bits, Algorithms & Logic',
    },
    ext_anatomy: {
        id: 'ext_anatomy',
        kind: 'extension',
        price: 100,
        payload: { extensionId: 'anatomy' },
        repeatable: false,
        label: 'Anatomy',
        description: 'The Human Machine',
    },
    ext_music: {
        id: 'ext_music',
        kind: 'extension',
        price: 120,
        payload: { extensionId: 'music' },
        repeatable: false,
        label: 'Music Theory',
        description: 'Harmony, Notes & Rhythm',
    },
    ext_economics: {
        id: 'ext_economics',
        kind: 'extension',
        price: 120,
        payload: { extensionId: 'economics' },
        repeatable: false,
        label: 'Economics',
        description: 'Markets, Capital & Wealth',
    },
    ext_mythology: {
        id: 'ext_mythology',
        kind: 'extension',
        price: 150,
        payload: { extensionId: 'mythology' },
        repeatable: false,
        label: 'Mythology',
        description: 'Legends, Gods & Lore',
    },

    // ------------------------------------------------------------------------
    // PRO THEMES
    // ------------------------------------------------------------------------
    theme_cyberpunk: {
        id: 'theme_cyberpunk',
        kind: 'theme',
        price: 120,
        payload: { theme: 'cyberpunk' as Theme },
        repeatable: false,
        label: 'Cyberpunk Neon',
        description: 'Electric cyan & magenta on near-black',
    },
    theme_terminal: {
        id: 'theme_terminal',
        kind: 'theme',
        price: 120,
        payload: { theme: 'terminal' as Theme },
        repeatable: false,
        label: 'Matrix Terminal',
        description: 'Phosphor green on pure black',
    },
    theme_gold: {
        id: 'theme_gold',
        kind: 'theme',
        price: 120,
        payload: { theme: 'gold' as Theme },
        repeatable: false,
        label: 'Obsidian Gold',
        description: 'Onyx black with royal gold',
    },
    theme_midnight: {
        id: 'theme_midnight',
        kind: 'theme',
        price: 150,
        payload: { theme: 'midnight' as Theme },
        repeatable: false,
        label: 'Midnight Galaxy',
        description: 'Cosmic violet & starlight',
    },
    theme_ocean: {
        id: 'theme_ocean',
        kind: 'theme',
        price: 150,
        payload: { theme: 'ocean' as Theme },
        repeatable: false,
        label: 'Ocean Depths',
        description: 'Deep navy, seafoam & pearl',
    },

    // ------------------------------------------------------------------------
    // REPEATABLE CONSUMABLE SINKS
    // ------------------------------------------------------------------------
    master_key: {
        id: 'master_key',
        kind: 'consumable',
        price: 60,
        payload: { type: 'master_key' },
        repeatable: true,
        label: 'Master Key',
        description: 'Instantly reveal entire cipher (D grade, 10 coins)',
    },
    skip_puzzle: {
        id: 'skip_puzzle',
        kind: 'consumable',
        price: 150,
        payload: { type: 'skip_puzzle' },
        repeatable: true,
        label: 'Skip Puzzle',
        description: 'Advances to next puzzle without solving (pays nothing)',
    },
    blitz_time_15: {
        id: 'blitz_time_15',
        kind: 'consumable',
        price: 40,
        payload: { type: 'blitz_time', seconds: 15 },
        repeatable: true,
        label: 'Blitz Rush +15s',
        description: 'Add 15 seconds to remaining Blitz Rush clock',
    },
    streak_freeze: {
        id: 'streak_freeze',
        kind: 'consumable',
        price: 200,
        payload: { type: 'streak_freeze', days: 1 },
        repeatable: true,
        label: 'Streak Freeze',
        description: 'Protects one missed day on your daily streak',
    },
};

/**
 * Robust resolver for shop items supporting canonical IDs, aliases, and prefix-free keys.
 */
export function getShopItem(id: string): ShopItem | undefined {
    if (!id) return undefined;
    if (SHOP_ITEMS[id]) return SHOP_ITEMS[id];

    // Check extension prefix alias
    if (SHOP_ITEMS[`ext_${id}`]) return SHOP_ITEMS[`ext_${id}`];

    // Check theme prefix alias
    if (SHOP_ITEMS[`theme_${id}`]) return SHOP_ITEMS[`theme_${id}`];

    // Check blitz time alias
    if (id === 'blitz_time' || id === 'blitz_rush_15') return SHOP_ITEMS['blitz_time_15'];

    // Reverse lookup by extension payload
    for (const item of Object.values(SHOP_ITEMS)) {
        if (item.kind === 'extension' && item.payload?.extensionId === id) {
            return item;
        }
        if (item.kind === 'theme' && item.payload?.theme === id) {
            return item;
        }
    }

    return undefined;
}

/**
 * Get extension price from the single source of truth.
 */
export function getExtensionPrice(extensionId: string): number {
    const item = getShopItem(`ext_${extensionId}`) || getShopItem(extensionId);
    return item ? item.price : 100;
}

/**
 * Get theme price from the single source of truth.
 */
export function getThemePrice(theme: Theme): number {
    const item = getShopItem(`theme_${theme}`) || getShopItem(theme);
    return item ? item.price : 120;
}
