import { describe, expect, it } from 'vitest';
import { createDemoPriceHistory, runStrategyLab } from './strategyLab';
import { strategyResultToMarkdown, strategyTradesToCsv } from './strategyExport';

describe('Strategy Lab exports', () => {
  const result = runStrategyLab(createDemoPriceHistory(), {
    fastWindow: 12,
    slowWindow: 36,
    feeBps: 10,
    slippageBps: 8,
    initialCapital: 10_000,
  });

  it('creates a reproducible markdown report with gates and provenance', () => {
    const report = strategyResultToMarkdown(result);
    expect(report).toContain('# CryptoPulse Strategy Lab report');
    expect(report).toContain(result.receipt.experimentId);
    expect(report).toContain(result.dataset.checksum);
    expect(report).toContain('Paper-only research artifact');
    expect(report).toContain('## Quality gates');
    expect(report).toContain('## Independent review');
  });

  it('exports paper trades as escaped UTF-8 CSV without secrets', () => {
    const csv = strategyTradesToCsv(result);
    expect(csv.startsWith('\uFEFF"Entry date"')).toBe(true);
    expect(csv).toContain('"Net return %"');
    expect(csv).not.toMatch(/api[_-]?key|token|broker/i);
  });
});
