import { calculateCoinReward, convertBlitzPointsToCoins, calculateScoreAndCoins } from '../src/utils/cipher';

describe('Unified Transparent Coins Economy', () => {
    test('rewards full base coins + clean bonus on flawless Normal solve', () => {
        const reward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 60,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
        });

        expect(reward.baseCoins).toBe(38);
        expect(reward.mistakeDeduction).toBe(0);
        expect(reward.hintDeduction).toBe(0);
        expect(reward.timeDeduction).toBe(0);
        expect(reward.keyDeduction).toBe(0);
        expect(reward.cleanBonus).toBe(5);
        expect(reward.netCoins).toBe(43); // 38 + 5 = 43
        expect(reward.grade).toBe('S');
    });

    test('deducts 2 coins per mistake and 3 coins per hint used', () => {
        const reward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 80,
            hintsUsed: 2, // -6
            mistakesCount: 3, // -6
            accuracy: 85,
        });

        expect(reward.baseCoins).toBe(38);
        expect(reward.mistakeDeduction).toBe(6);
        expect(reward.hintDeduction).toBe(6);
        expect(reward.timeDeduction).toBe(0);
        expect(reward.keyDeduction).toBe(0);
        expect(reward.cleanBonus).toBe(0);
        expect(reward.netCoins).toBe(26); // 38 - 6 - 6 = 26
        expect(reward.grade).toBe('B');
    });

    test('deducts for overtime past par time limit', () => {
        // Normal par time is 120s. 180s is 60s overtime => Math.floor(60 / 20) = 3 coins deducted.
        const reward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 180,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
        });

        expect(reward.baseCoins).toBe(38);
        expect(reward.timeDeduction).toBe(3);
        expect(reward.cleanBonus).toBe(5);
        expect(reward.netCoins).toBe(40); // 38 - 3 + 5 = 40
    });

    test('applies heavy penalty and forces grade D on Master Key usage', () => {
        const reward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 30,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            usedMasterKey: true,
        });

        expect(reward.baseCoins).toBe(38);
        // Ratified Key Economy (Item 2): Master-Key solve yields flat 10 coins, grade D
        expect(reward.keyDeduction).toBe(28);
        expect(reward.cleanBonus).toBe(0);
        expect(reward.netCoins).toBe(10); // Flat 10 coins
        expect(reward.grade).toBe('D');
    });

    test('respects guaranteed floor of 15 coins even with catastrophic deductions (Item 3)', () => {
        const reward = calculateCoinReward({
            difficulty: 'Easy', // 30 base
            timerSeconds: 500, // overtime deduction: 10 max
            hintsUsed: 10, // hint deduction: 15 max
            mistakesCount: 20, // mistake deduction: 20 max
            accuracy: 30,
        });

        // Ratified Spec Item 3: Guaranteed honest floor raised from 5 to 15 coins
        expect(reward.netCoins).toBe(15);
    });

    test('scales base coins across game modes and difficulties', () => {
        const easy = calculateCoinReward({ difficulty: 'Easy', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const hard = calculateCoinReward({ difficulty: 'Hard', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const legendary = calculateCoinReward({ difficulty: 'Legendary', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const daily = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'daily' });
        const blitz = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'blitz' });

        expect(easy.baseCoins).toBe(30);
        expect(hard.baseCoins).toBe(48);
        expect(legendary.baseCoins).toBe(60);
        expect(daily.baseCoins).toBe(45);
        expect(blitz.baseCoins).toBe(18);
    });

    test('Item 3: getLengthTier and length tier bonuses (Short +0, Medium +15, Long +30, Epic +45)', () => {
        const { getLengthTier } = require('../src/utils/cipher');
        expect(getLengthTier(30)).toEqual({ tier: 'Short', bonus: 0 });
        expect(getLengthTier(59)).toEqual({ tier: 'Short', bonus: 0 });
        expect(getLengthTier(60)).toEqual({ tier: 'Medium', bonus: 15 });
        expect(getLengthTier(100)).toEqual({ tier: 'Medium', bonus: 15 });
        expect(getLengthTier(101)).toEqual({ tier: 'Long', bonus: 30 });
        expect(getLengthTier(150)).toEqual({ tier: 'Long', bonus: 30 });
        expect(getLengthTier(151)).toEqual({ tier: 'Epic', bonus: 45 });
        expect(getLengthTier(200)).toEqual({ tier: 'Epic', bonus: 45 });
    });

    test('Item 3: calculateCoinReward applies length tier bonus and formats baseLabel correctly', () => {
        // Hard base is 65. With 120 alpha characters (Long: +30), baseCoins should be 95
        const longReward = calculateCoinReward({
            difficulty: 'Hard',
            timerSeconds: 60,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            alphaCount: 120
        });

        expect(longReward.lengthTier).toBe('Long');
        expect(longReward.lengthBonus).toBe(30);
        expect(longReward.baseCoins).toBe(78);
        expect(longReward.baseLabel).toBe('Base Level Reward (Hard - Long)');
        expect(longReward.netCoins).toBe(83); // 78 base + 5 cleanBonus

        // Epic quote (>150 alpha) on Legendary difficulty (60 base + 45 bonus = 105 base)
        const epicReward = calculateCoinReward({
            difficulty: 'Legendary',
            timerSeconds: 60,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            alphaCount: 160
        });

        expect(epicReward.lengthTier).toBe('Epic');
        expect(epicReward.lengthBonus).toBe(45);
        expect(epicReward.baseCoins).toBe(105);
        expect(epicReward.baseLabel).toBe('Base Level Reward (Legendary - Epic)');

        // Daily mode ledger label
        const dailyReward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 60,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            alphaCount: 80,
            mode: 'daily'
        });
        expect(dailyReward.baseCoins).toBe(60); // 45 daily base + 15 medium bonus
        expect(dailyReward.baseLabel).toBe('Base Level Reward (Daily - Medium)');
    });

    test('Item 5: calculateDynamicPoints scales points with length, gaps, grace window, and decay', () => {
        const { calculateDynamicPoints } = require('../src/utils/cipher');

        // Short vs Long quote points scaling
        const shortScoring = calculateDynamicPoints({
            alphaCount: 30,
            difficulty: 'Normal',
            timerSeconds: 30,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            comboMax: 0
        });

        const longScoring = calculateDynamicPoints({
            alphaCount: 120,
            difficulty: 'Normal',
            timerSeconds: 30,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            comboMax: 0
        });

        expect(shortScoring.score).toBeLessThan(longScoring.score);
        expect(shortScoring.maxScore).toBeGreaterThanOrEqual(shortScoring.score);
        expect(longScoring.maxScore).toBeGreaterThanOrEqual(longScoring.score);

        // Grace window: zero time loss within grace window
        expect(shortScoring.timeLossPercent).toBe(0);
        expect(shortScoring.timeFactor).toBe(1.0);

        // Smooth decay capped at 50% max time loss
        const overtimeScoring = calculateDynamicPoints({
            alphaCount: 30,
            difficulty: 'Normal',
            timerSeconds: 1000, // very long time
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            comboMax: 0
        });

        expect(overtimeScoring.timeLossPercent).toBe(50);
        expect(overtimeScoring.timeFactor).toBe(0.5);

        // Master-Key solve gives 0 points
        const keyScoring = calculateDynamicPoints({
            alphaCount: 80,
            difficulty: 'Normal',
            timerSeconds: 30,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            comboMax: 0,
            usedMasterKey: true
        });
        expect(keyScoring.score).toBe(0);
        expect(keyScoring.maxScore).toBeGreaterThan(0);

        // Edge case: empty quote / 0 alpha
        const zeroAlpha = calculateDynamicPoints({
            quoteText: '',
            difficulty: 'Easy',
            timerSeconds: 10,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 0,
            comboMax: 0
        });
        expect(zeroAlpha.score).toBeGreaterThanOrEqual(10);
        expect(zeroAlpha.maxScore).toBeGreaterThanOrEqual(zeroAlpha.score);

        // Accuracy floor at 50%
        expect(zeroAlpha.accuracyFactor).toBe(0.5);

        // Max combo 10 gives 2.5x multiplier
        const maxComboScoring = calculateDynamicPoints({
            alphaCount: 50,
            difficulty: 'Normal',
            timerSeconds: 10,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
            comboMax: 10
        });
        expect(maxComboScoring.comboMultiplier).toBe(2.5);
    });

    test('Item 5: Blitz points to coins conversion (50:1, min 5, capped at 100 coins)', () => {
        // Weak run: floors at 5 coins
        expect(convertBlitzPointsToCoins(0)).toBe(5); // minimum 5 coins
        expect(convertBlitzPointsToCoins(-50)).toBe(5); // negative points floor to 5
        expect(convertBlitzPointsToCoins(100)).toBe(5); // floor of 5 (100 / 50 = 2 < 5)
        expect(convertBlitzPointsToCoins(250)).toBe(5); // 250 / 50 = 5

        // Mid run
        expect(convertBlitzPointsToCoins(500)).toBe(10); // 500 / 50 = 10
        expect(convertBlitzPointsToCoins(1000)).toBe(20); // 1000 / 50 = 20
        expect(convertBlitzPointsToCoins(2000)).toBe(40); // 2000 / 50 = 40

        // Strong run: lands roughly 60-100 coins
        expect(convertBlitzPointsToCoins(3000)).toBe(60); // 3000 / 50 = 60
        expect(convertBlitzPointsToCoins(4000)).toBe(80); // 4000 / 50 = 80
        expect(convertBlitzPointsToCoins(5000)).toBe(100); // 5000 / 50 = 100 (cap)
        expect(convertBlitzPointsToCoins(6000)).toBe(100); // capped at 100 coins
    });

    test('Master Key solve yields 0 timeBonus in calculateScoreAndCoins', () => {
        const result = calculateScoreAndCoins(
            'The quick brown fox jumps over the lazy dog',
            'Normal',
            30,
            0,
            0,
            0,
            100,
            true // usedMasterKey
        );
        expect(result.score).toBe(0);
        expect(result.coinsEarned).toBe(10);
        expect(result.timeBonus).toBe(0);
    });
});
