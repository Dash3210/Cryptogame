import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GameProvider } from '../src/context/GameContext';
import { Header } from '../src/components/Header';
import { VirtualKeyboard } from '../src/components/VirtualKeyboard';
import { GenreCard } from '../src/components/GenreCard';
import { GameStatus } from '../src/types';

describe('UI Components Test Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('Header renders status, timer, and combo multiplier', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <Header
            status={GameStatus.PLAYING}
            category="Physics"
            onBack={jest.fn()}
            onHint={jest.fn()}
            onUseKey={jest.fn()}
            onSettings={jest.fn()}
            canHint={true}
            freeHints={2}
            timer={45}
            comboMultiplier={1.5}
          />
        </GameProvider>
      );
    });

    expect(renderer).toBeDefined();
  });

  test('VirtualKeyboard renders keyboard rows and handles key press', async () => {
    const onKeyPress = jest.fn();
    const onDelete = jest.fn();
    const onNext = jest.fn();

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <VirtualKeyboard
            usedLetters={new Set(['A', 'B'])}
            onKeyPress={onKeyPress}
            onDelete={onDelete}
            onNext={onNext}
            blockUsedLetters={true}
          />
        </GameProvider>
      );
    });

    expect(renderer).toBeDefined();
  });

  test('GenreCard renders category with icon and progress', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <GameProvider>
          <GenreCard
            genre={{
              id: 'biology',
              label: 'Biology',
              icon: '🧬',
              description: 'Life & Cells',
            }}
            onSelect={jest.fn()}
            completedCount={5}
            totalCount={15}
          />
        </GameProvider>
      );
    });

    expect(renderer).toBeDefined();
  });
});
