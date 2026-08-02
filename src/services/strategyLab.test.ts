import { describe, expect, it } from 'vitest';
import { createDemoPriceHistory, runStrategyLab } from './strategyLab';

describe('Strategy Lab', () => {
  const prices = createDemoPriceHistory();

  it('is paper-only and includes fees, Monte Carlo and walk-forward validation', () => {
    const result = runStrategyLab(prices, { fastWindow: 12, slowWindow: 36, feeBps: 10, slippageBps: 8, initialCapital: 10_000 });
    expect(result.mode).toBe('paper');
    expect(result.estimatedCosts).toBeGreaterThan(0);
    expect(result.monteCarlo.simulations).toBe(500);
    expect(Number.isFinite(result.walkForward.testReturnPct)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('broker');
  });

  it('makes higher execution costs no better than the same zero-cost run', () => {
    const free = runStrategyLab(prices, { fastWindow: 12, slowWindow: 36, feeBps: 0, slippageBps: 0, initialCapital: 10_000 });
    const costly = runStrategyLab(prices, { fastWindow: 12, slowWindow: 36, feeBps: 25, slippageBps: 20, initialCapital: 10_000 });
    expect(costly.netReturnPct).toBeLessThanOrEqual(free.netReturnPct);
  });

  it('rejects invalid windows', () => {
    expect(() => runStrategyLab(prices, { fastWindow: 50, slowWindow: 20, feeBps: 5, slippageBps: 5, initialCapital: 10_000 })).toThrow('Медленное окно');
  });
});
