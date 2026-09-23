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

    test('a wrong pick resolves as wrong and costs nothing', () => {
        const onResolved = jest.fn();
        let tree: any;
        ReactTestRenderer.act(() => { tree = renderModal('Mitochondria', onResolved); });

        pressOption(tree, 'Vacuole');

        expect(onResolved).toHaveBeenCalledTimes(1);
        expect(onResolved).toHaveBeenCalledWith(false);
        ReactTestRenderer.act(() => tree.unmount());
    });
});
