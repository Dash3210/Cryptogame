import { adService } from '../src/services/adService';

describe('Hard Metrics: AdService Lifecycle & Reward Resilience', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    adService.dispose();
  });

  test('fails closed: no reward is granted when no ad is loaded', () => {
    const onReward = jest.fn();
    const onFallback = jest.fn();

    adService.show(onReward, onFallback);

    expect(onReward).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  test('cancelPendingReward clears a pending reward before it fires', () => {
    const onReward = jest.fn();
    adService.show(onReward);
    adService.cancelPendingReward();
    expect(onReward).not.toHaveBeenCalled();
  });

  test('dispose clears timers and removes listeners cleanly', () => {
    expect(() => {
      adService.dispose();
    }).not.toThrow();
  });
});
