import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NativeModules } from 'react-native';
import { playGamesService } from '../src/services/playGamesService';
import { GameProvider, useGame } from '../src/context/GameContext';
import { LeaderboardScreen } from '../src/screens/LeaderboardScreen';

// Mock Navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    return {
        SafeAreaView: ({ children, style }: any) => React.createElement('View', { style }, children),
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

describe('Google Play Games Integration Suite', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        NativeModules.PlayGamesModule = {
            signIn: jest.fn().mockResolvedValue('MasterMind42'),
            isAuthenticated: jest.fn().mockResolvedValue(true),
            getPlayerName: jest.fn().mockResolvedValue('MasterMind42'),
            submitScore: jest.fn(),
            showLeaderboard: jest.fn().mockResolvedValue(true),
            showAllLeaderboards: jest.fn().mockResolvedValue(true),
        };
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('playGamesService gracefully signs in and caches user', async () => {
        const user = await playGamesService.directSignIn();
        expect(user.isAuthenticated).toBe(true);
        expect(user.displayName).toBe('MasterMind42');
        expect(playGamesService.getCachedUser().isAuthenticated).toBe(true);
    });

    test('playGamesService checks auth state correctly', async () => {
        const isAuth = await playGamesService.checkAuth();
        expect(isAuth).toBe(true);
        expect(NativeModules.PlayGamesModule.isAuthenticated).toHaveBeenCalled();
    });

    test('playGamesService ignores placeholder leaderboard IDs and submits real ones', () => {
        // Placeholder should NOT invoke native submitScore
        playGamesService.submitScore(1500, 'YOUR_GLOBAL_LEADERBOARD_ID');
        expect(NativeModules.PlayGamesModule.submitScore).not.toHaveBeenCalled();

        // Real leaderboard ID should invoke native submitScore
        playGamesService.submitScore(2500, 'CgkI9_3d8bQBEAIQAQ');
        expect(NativeModules.PlayGamesModule.submitScore).toHaveBeenCalledWith('CgkI9_3d8bQBEAIQAQ', 2500);
    });

    test('playGamesService showLeaderboard falls back to showAllLeaderboards if placeholder ID', async () => {
        await playGamesService.showLeaderboard('YOUR_GLOBAL_LEADERBOARD_ID');
        expect(NativeModules.PlayGamesModule.showAllLeaderboards).toHaveBeenCalled();

        await playGamesService.showLeaderboard('CgkI9_3d8bQBEAIQAQ');
        expect(NativeModules.PlayGamesModule.showLeaderboard).toHaveBeenCalledWith('CgkI9_3d8bQBEAIQAQ');
    });

    test('GameContext provides Google Play Games state and submits scores', async () => {
        let capturedContext: ReturnType<typeof useGame> | null = null;
        const TestReceiver = () => {
            const ctx = useGame();
            React.useEffect(() => {
                capturedContext = ctx;
            }, [ctx]);
            return null;
        };

        await ReactTestRenderer.act(async () => {
            ReactTestRenderer.create(
                <GameProvider>
                    <TestReceiver />
                </GameProvider>
            );
            jest.runAllTimers();
        });

        expect(capturedContext).not.toBeNull();
        expect(capturedContext!.playGamesUser).toBeDefined();
        expect(typeof capturedContext!.signInPlayGames).toBe('function');
        expect(typeof capturedContext!.openPlayGamesLeaderboard).toBe('function');

        // Test sign in through context
        await ReactTestRenderer.act(async () => {
            const res = await capturedContext!.signInPlayGames();
            expect(res.isAuthenticated).toBe(true);
        });

        // Test addPoints
        await ReactTestRenderer.act(async () => {
            capturedContext!.addPoints(250);
        });
        expect(capturedContext!.totalPoints).toBeGreaterThanOrEqual(250);

        // Test blitz high score update
        await ReactTestRenderer.act(async () => {
            capturedContext!.updateBlitzHighScore(1200);
        });
        expect(capturedContext!.stats.blitzHighScore).toBe(1200);
    });

    test('LeaderboardScreen renders successfully with Google Play Games UI', async () => {
        let tree: any;
        await ReactTestRenderer.act(async () => {
            tree = ReactTestRenderer.create(
                <GameProvider>
                    <LeaderboardScreen />
                </GameProvider>
            );
            jest.runAllTimers();
        });

        const json = tree.toJSON();
        expect(json).toBeDefined();
    });
});
