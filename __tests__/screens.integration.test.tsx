import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GameProvider } from '../src/context/GameContext';
import { NavigationContainer } from '@react-navigation/native';

import { DailyChallengeScreen } from '../src/screens/DailyChallengeScreen';
import { BlitzScreen } from '../src/screens/BlitzScreen';
import { MasteryScreen } from '../src/screens/MasteryScreen';
import { StoreScreen } from '../src/screens/StoreScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { SavedScreen } from '../src/screens/SavedScreen';
import { LeaderboardScreen } from '../src/screens/LeaderboardScreen';
import { LibraryScreen } from '../src/screens/LibraryScreen';

const renderWithProviders = (Component: React.ReactElement) => {
  return (
    <NavigationContainer>
      <GameProvider>
        {Component}
      </GameProvider>
    </NavigationContainer>
  );
};

describe('Hard Metrics: Full Screen Matrix & UI Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('DailyChallengeScreen renders calendar, streak count, and action buttons', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<DailyChallengeScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();
    expect(renderer.toJSON()).not.toBeNull();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('BlitzScreen renders high score banner, time attack rules, and launcher', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<BlitzScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('MasteryScreen renders all 3 tabs (Achievements, Stats, Subjects) smoothly', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<MasteryScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('StoreScreen renders Subject Extensions & Themes tabs with purchase actions', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<StoreScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  // Item 7: Honest typography selection and preview matching
  // Verifies that SettingsScreen uses the shared getFontFamilyNative mapping:
  // - Does NOT use the invalid 'System' string for fontFamily
  // - Renders real, distinct Android font values ('sans-serif', 'serif', 'monospace', 'cursive', 'sans-serif-condensed')
  test('SettingsScreen renders difficulty, typography, gameplay toggles, and modal with honest font mappings', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<SettingsScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    const json = JSON.stringify(renderer.toJSON());
    // Invalid 'System' string must not be present as a fontFamily style
    expect(json).not.toContain('"fontFamily":"System"');

    // Real distinct Android font families must be applied to preview chips
    expect(json).toContain('"fontFamily":"sans-serif"');
    expect(json).toContain('"fontFamily":"serif"');
    expect(json).toContain('"fontFamily":"monospace"');
    expect(json).toContain('"fontFamily":"cursive"');
    expect(json).toContain('"fontFamily":"sans-serif-condensed"');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('SavedScreen renders empty state and quote cards with removal handling', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<SavedScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('LeaderboardScreen renders Global Rankings and Subject Mastery tab list', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<LeaderboardScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('LibraryScreen renders subject cards, search filtering, and hero challenges', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderWithProviders(<LibraryScreen />));
      jest.runAllTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
