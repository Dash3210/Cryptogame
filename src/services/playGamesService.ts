import { NativeModules, Platform } from 'react-native';

/**
 * Google Play Games Leaderboard Configuration
 * Replace with Leaderboard IDs created in Google Play Console (Play Games Services > Leaderboards)
 */
export const PLAY_GAMES_CONFIG = {
    // Default 12/13-digit Project ID from Play Console (matches strings.xml)
    PROJECT_ID: 'YOUR_PLAY_GAMES_PROJECT_ID',

    // Leaderboard IDs created in Google Play Console
    LEADERBOARDS: {
        GLOBAL_CIPHER_IQ: 'YOUR_GLOBAL_LEADERBOARD_ID', // e.g. "CgkI..."
        BLITZ_RUSH_HIGH_SCORE: 'YOUR_BLITZ_LEADERBOARD_ID',
    },
};

export interface PlayGamesUser {
    isAuthenticated: boolean;
    displayName: string | null;
}

class PlayGamesService {
    private cachedUser: PlayGamesUser = {
        isAuthenticated: false,
        displayName: null,
    };

    private getModule() {
        return NativeModules?.PlayGamesModule;
    }

    private isAvailable(): boolean {
        const isTestEnv = Boolean((globalThis as any)?.process?.env?.NODE_ENV === 'test');
        return (Platform.OS === 'android' || isTestEnv) && !!this.getModule();
    }

    /**
     * Silent / Direct Sign-In on App Launch
     * In Play Games Services v2, this triggers the native "Welcome back [GamerTag]" popup
     */
    async directSignIn(): Promise<PlayGamesUser> {
        if (!this.isAvailable()) {
            return this.cachedUser;
        }

        try {
            const name = await this.getModule().signIn();
            this.cachedUser = {
                isAuthenticated: true,
                displayName: name || 'Authenticated Player',
            };
            return this.cachedUser;
        } catch {
            this.cachedUser = {
                isAuthenticated: false,
                displayName: null,
            };
            return this.cachedUser;
        }
    }

    /**
     * Check if player is currently authenticated
     */
    async checkAuth(): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            const auth = await this.getModule().isAuthenticated();
            this.cachedUser.isAuthenticated = auth;
            return auth;
        } catch {
            return false;
        }
    }

    /**
     * Get player's Google Play Games GamerTag
     */
    async getPlayerName(): Promise<string | null> {
        if (!this.isAvailable()) return null;
        try {
            const name = await this.getModule().getPlayerName();
            if (name) {
                this.cachedUser.displayName = name;
                this.cachedUser.isAuthenticated = true;
            }
            return name;
        } catch {
            return null;
        }
    }

    /**
     * Submit score to Google Play Games Leaderboard
     */
    submitScore(score: number, leaderboardId: string = PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ): void {
        if (!this.isAvailable() || score <= 0) return;
        try {
            // Only submit if a valid leaderboard ID is configured (not placeholder)
            if (leaderboardId && !leaderboardId.startsWith('YOUR_')) {
                this.getModule().submitScore(leaderboardId, score);
            }
        } catch {
            // Graceful fallback
        }
    }

    /**
     * Show Google Play Games Leaderboard Native Modal
     */
    async showLeaderboard(leaderboardId: string = PLAY_GAMES_CONFIG.LEADERBOARDS.GLOBAL_CIPHER_IQ): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            if (leaderboardId && !leaderboardId.startsWith('YOUR_')) {
                await this.getModule().showLeaderboard(leaderboardId);
                return true;
            } else {
                // Fallback to all leaderboards if specific ID is not set yet
                await this.getModule().showAllLeaderboards();
                return true;
            }
        } catch {
            return false;
        }
    }

    /**
     * Show all Leaderboards for this game
     */
    async showAllLeaderboards(): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            await this.getModule().showAllLeaderboards();
            return true;
        } catch {
            return false;
        }
    }

    getCachedUser(): PlayGamesUser {
        return this.cachedUser;
    }
}

export const playGamesService = new PlayGamesService();
