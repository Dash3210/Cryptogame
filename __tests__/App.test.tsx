import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App Root', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders correctly and initializes safely', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      jest.runOnlyPendingTimers();
    });

    expect(renderer).toBeDefined();

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
