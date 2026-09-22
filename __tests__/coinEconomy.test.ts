import { calculateCoinReward } from '../src/utils/cipher';

describe('Unified Transparent Coins Economy', () => {
    test('rewards full base coins + clean bonus on flawless Normal solve', () => {
        const reward = calculateCoinReward({
            difficulty: 'Normal',
            timerSeconds: 60,
            hintsUsed: 0,
            mistakesCount: 0,
            accuracy: 100,
        });

        expect(reward.baseCoins).toBe(50);
        expect(reward.mistakeDeduction).toBe(0);
        expect(reward.hintDeduction).toBe(0);
        expect(reward.timeDeduction).toBe(0);
        expect(reward.keyDeduction).toBe(0);
        expect(reward.cleanBonus).toBe(5);
        expect(reward.netCoins).toBe(55);
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

        expect(reward.baseCoins).toBe(50);
        expect(reward.mistakeDeduction).toBe(6);
        expect(reward.hintDeduction).toBe(6);
        expect(reward.timeDeduction).toBe(0);
        expect(reward.keyDeduction).toBe(0);
        expect(reward.cleanBonus).toBe(0);
        expect(reward.netCoins).toBe(38); // 50 - 6 - 6 = 38
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

        expect(reward.baseCoins).toBe(50);
        expect(reward.timeDeduction).toBe(3);
        expect(reward.cleanBonus).toBe(5);
        expect(reward.netCoins).toBe(52); // 50 - 3 + 5 = 52
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

        expect(reward.baseCoins).toBe(50);
        expect(reward.keyDeduction).toBe(35);
        expect(reward.cleanBonus).toBe(0);
        expect(reward.netCoins).toBe(15); // 50 - 35 = 15
        expect(reward.grade).toBe('D');
    });

    test('respects guaranteed floor of 5 coins even with catastrophic deductions', () => {
        const reward = calculateCoinReward({
            difficulty: 'Easy', // 40 base
            timerSeconds: 500, // overtime deduction: 10 max
            hintsUsed: 10, // hint deduction: 15 max
            mistakesCount: 20, // mistake deduction: 20 max
            accuracy: 30,
            usedMasterKey: true, // 35 key deduction
        });

        expect(reward.netCoins).toBe(5);
    });

    test('scales base coins across game modes and difficulties', () => {
        const easy = calculateCoinReward({ difficulty: 'Easy', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const hard = calculateCoinReward({ difficulty: 'Hard', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const legendary = calculateCoinReward({ difficulty: 'Legendary', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100 });
        const daily = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'daily' });
        const blitz = calculateCoinReward({ difficulty: 'Normal', timerSeconds: 60, hintsUsed: 0, mistakesCount: 0, accuracy: 100, mode: 'blitz' });

        expect(easy.baseCoins).toBe(40);
        expect(hard.baseCoins).toBe(65);
        expect(legendary.baseCoins).toBe(80);
        expect(daily.baseCoins).toBe(60);
        expect(blitz.baseCoins).toBe(25);
    });
});
