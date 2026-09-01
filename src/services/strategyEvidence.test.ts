import { describe, expect, it } from 'vitest';
import { buildStrategyEvidence } from './strategyEvidence';

const points = Array.from({ length: 240 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
  close: 100 + index * 0.4 + Math.sin(index / 7) * 3,
}));
const config = { fastWindow: 12, slowWindow: 36, feeBps: 10, slippageBps: 8, initialCapital: 10_000 };
const metrics = {
  netReturnPct: 22,
  maxDrawdownPct: 12,
  tradeCount: 10,
  estimatedCosts: 42,
  walkForwardTestReturnPct: 4,
  monteCarloP10ReturnPct: -6,
};

describe('Strategy evidence', () => {
  it('builds a deterministic paper-only receipt with baseline and regimes', () => {
    const first = buildStrategyEvidence(points, config, metrics, (segment) => segment.length / 10, {
      id: 'demo-v1', kind: 'synthetic', source: 'Deterministic demo',
    });
    const second = buildStrategyEvidence(points, config, metrics, (segment) => segment.length / 10, {
      id: 'demo-v1', kind: 'synthetic', source: 'Deterministic demo',
    });
    expect(first.executionAllowed).toBe(false);
    expect(first.receipt.executionAllowed).toBe(false);
    expect(first.receipt.experimentId).toBe(second.receipt.experimentId);
    expect(first.dataset.checksum).toBe(second.dataset.checksum);
    expect(first.regimes).toHaveLength(3);
    expect(Number.isFinite(first.baseline.excessReturnPct)).toBe(true);
    expect(first.qualityGates.every((gate) => gate.passed)).toBe(true);
  });

  it('sanitizes local dataset labels and fails research gates closed', () => {
    const evidence = buildStrategyEvidence(points.slice(0, 90), config, {
      ...metrics, tradeCount: 1, estimatedCosts: 0, walkForwardTestReturnPct: -2, maxDrawdownPct: 40,
    }, () => 0, { id: 'bad\nname', kind: 'local-import', source: 'local\tfile' });
    expect(evidence.dataset.id).toBe('bad name');
    expect(evidence.dataset.source).toBe('local file');
    expect(evidence.decision).toBe('needs-research');
    expect(evidence.qualityGates.some((gate) => !gate.passed)).toBe(true);
  });
});
