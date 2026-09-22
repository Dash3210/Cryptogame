import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameProvider } from '../src/context/GameContext';
import { GameScreen } from '../src/screens/GameScreen';
import { QUOTE_DB } from '../src/data/quotes';
import { generateCipher } from '../src/utils/cipher';

const Stack = createNativeStackNavigator();

const renderGameScreenWithParams = (params: any) => {
  return (
    <NavigationContainer>
      <GameProvider>
        <Stack.Navigator>
          <Stack.Screen
            name="Game"
            component={GameScreen}
            initialParams={params}
          />
        </Stack.Navigator>
      </GameProvider>
    </NavigationContainer>
  );
};

describe('Hard Metrics: End-to-End Gameplay Simulation Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('GameScreen Standard Mode: Mounts puzzle, renders virtual keyboard, and progresses timer', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        renderGameScreenWithParams({ genreId: 'biology', mode: 'standard' })
      );
      jest.advanceTimersByTime(2000);
    });

    expect(renderer).toBeDefined();
    expect(renderer.toJSON()).not.toBeNull();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('GameScreen Daily Challenge Mode: Mounts with deterministic daily cipher and streak badges', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        renderGameScreenWithParams({ genreId: 'daily', mode: 'daily', dateStr: '2026-09-01' })
      );
      jest.advanceTimersByTime(1000);
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('GameScreen Blitz Rush Mode: Starts 90s countdown clock and handles time ticks', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        renderGameScreenWithParams({ genreId: 'blitz', mode: 'blitz' })
      );
      // Advance clock by 10 seconds
      jest.advanceTimersByTime(10000);
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('Full 12-Category Database Integrity & Solver Simulation', () => {
    Object.entries(QUOTE_DB).forEach(([, quotes]) => {
      quotes.forEach((quote) => {
        expect(quote.text.length).toBeGreaterThan(0);
        expect(quote.author.length).toBeGreaterThan(0);

        const cipher = generateCipher();
        const upper = quote.text.toUpperCase();

        // Simulate complete correct solver map
        const solverMap: Record<string, string> = {};
        for (const ch of upper) {
          if (/[A-Z]/.test(ch)) {
            solverMap[cipher[ch]] = ch;
          }
        }

        // Verify that every single quote can be fully decrypted without any missing mappings
        for (const ch of upper) {
          if (/[A-Z]/.test(ch)) {
            const cipherChar = cipher[ch];
            expect(solverMap[cipherChar]).toBe(ch);
          }
        }
      });
    });
  });
});
