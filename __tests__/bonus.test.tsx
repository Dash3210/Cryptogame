import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GameProvider } from '../src/context/GameContext';
import { BonusGuessModal } from '../src/components/BonusGuessModal';
import { getAnswerOptions } from '../src/services/quoteService';

describe('Post-solve bonus round', () => {
    test('getAnswerOptions returns 4 unique options including the correct answer', () => {
        const options = getAnswerOptions('biology', 'Mitochondria', 4);
        expect(options).toHaveLength(4);
        expect(options).toContain('Mitochondria');
        expect(new Set(options).size).toBe(4);
    });

    test('getAnswerOptions still returns 4 for an unknown category (daily/blitz)', () => {
        const options = getAnswerOptions('Daily Cipher', 'John Muir', 4);
        expect(options).toHaveLength(4);
        expect(options).toContain('John Muir');
    });

    const renderModal = (correctAnswer: string, onResolved: (c: boolean) => void) =>
        ReactTestRenderer.create(
            <GameProvider>
                <BonusGuessModal
                    visible
                    definition="The powerhouse of the cell."
                    options={['Mitochondria', 'Nucleus', 'Ribosome', 'Vacuole']}
                    correctAnswer={correctAnswer}
                    onResolved={onResolved}
                    onClose={jest.fn()}
                />
            </GameProvider>
        );

    const pressOption = (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
        const node = tree.root.find(
            n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === `Answer ${label}`
        );
        ReactTestRenderer.act(() => { node.props.onPress(); });
    };

    test('a correct pick resolves as correct exactly once', () => {
        const onResolved = jest.fn();
        let tree: any;
        ReactTestRenderer.act(() => { tree = renderModal('Mitochondria', onResolved); });

        pressOption(tree, 'Mitochondria');
        pressOption(tree, 'Nucleus'); // ignored after resolving

        expect(onResolved).toHaveBeenCalledTimes(1);
        expect(onResolved).toHaveBeenCalledWith(true);
        ReactTestRenderer.act(() => tree.unmount());
    });

    test('a wrong pick resolves as wrong and does not leak the correct answer', () => {
        const onResolved = jest.fn();
        let tree: any;
        ReactTestRenderer.act(() => { tree = renderModal('Mitochondria', onResolved); });

        pressOption(tree, 'Vacuole');

        expect(onResolved).toHaveBeenCalledTimes(1);
        expect(onResolved).toHaveBeenCalledWith(false);

        const json = JSON.stringify(tree.toJSON());
        expect(json).toContain('Double or Nothing');
        expect(json).toContain('Not quite. No bonus this time.');
        // The modal must never show the correct answer as revealed if user picked wrong
        expect(json).not.toContain('Correct. Your reward is doubled.');

        ReactTestRenderer.act(() => tree.unmount());
    });

    test('Regression: Master-Key solve never sets bonusOptions / never doubles, awards flat 10 coins and 0 points', async () => {
        const { calculateCoinReward, calculateScoreAndCoins } = require('../src/utils/cipher');
        const reward = calculateCoinReward({
            difficulty: 'Hard',
            timerSeconds: 15,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            usedMasterKey: true,
            mode: 'standard',
        });

        // (2) Key Economy: Master-Key solve => flat 10 coins, 0 points, grade D, no bonus
        expect(reward.netCoins).toBe(10);
        expect(reward.grade).toBe('D');
        expect(reward.stars).toBe(1);

        const scoreAndCoins = calculateScoreAndCoins(
            'Test quote',
            'Hard',
            15,
            0,
            0,
            5,
            100,
            true // usedMasterKey
        );
        expect(scoreAndCoins.score).toBe(0);
        expect(scoreAndCoins.coinsEarned).toBe(10);
        expect(scoreAndCoins.timeBonus).toBe(0);
    });

    test('Regression: GameScreen master-key solve never sets bonusOptions / never doubles rewards', async () => {
        const { Alert } = require('react-native');
        const { adService } = require('../src/services/adService');
        const { NavigationContainer } = require('@react-navigation/native');
        const { createNativeStackNavigator } = require('@react-navigation/native-stack');
        const { GameScreen } = require('../src/screens/GameScreen');
        const { WinCelebrationModal } = require('../src/components/WinCelebrationModal');

        jest.useFakeTimers();
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title: any, _msg: any, buttons: any) => {
            const solveBtn = buttons?.find((b: any) => b.text === 'Solve All');
            solveBtn?.onPress?.();
        });
        const adSpy = jest.spyOn(adService, 'show').mockImplementation((onReward: any) => {
            onReward();
        });

        const Stack = createNativeStackNavigator();
        let renderer: any;
        await ReactTestRenderer.act(async () => {
            renderer = ReactTestRenderer.create(
                <NavigationContainer>
                    <GameProvider>
                        <Stack.Navigator>
                            <Stack.Screen
                                name="Game"
                                component={GameScreen}
                                initialParams={{ genreId: 'biology', mode: 'standard' }}
                            />
                        </Stack.Navigator>
                    </GameProvider>
                </NavigationContainer>
            );
            jest.advanceTimersByTime(500);
        });

        // Find the "Use Key" button in Header
        const useKeyBtn = renderer.root.find(
            (n: any) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Use Key'
        );
        expect(useKeyBtn).toBeDefined();

        await ReactTestRenderer.act(async () => {
            useKeyBtn.props.onPress();
            jest.advanceTimersByTime(500);
        });

        // 1. BonusGuessModal must NEVER be rendered
        const bonusModals = renderer.root.findAllByType(BonusGuessModal);
        expect(bonusModals.length).toBe(0);

        // 2. WinCelebrationModal must be rendered
        const winModals = renderer.root.findAllByType(WinCelebrationModal);
        expect(winModals.length).toBe(1);

        const winProps = winModals[0].props;
        // Never doubles: bonusCoins is 0, coinsEarned is 10, score is 0, grade is D
        expect(winProps.bonusCoins).toBe(0);
        expect(winProps.coinsEarned).toBe(10);
        expect(winProps.score).toBe(0);
        expect(winProps.grade.grade).toBe('D');

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('+10');
        expect(json).not.toContain('Double or Nothing Bonus');

        alertSpy.mockRestore();
        adSpy.mockRestore();

        await ReactTestRenderer.act(async () => {
            renderer.unmount();
        });
        jest.clearAllTimers();
        jest.useRealTimers();
    });
});
