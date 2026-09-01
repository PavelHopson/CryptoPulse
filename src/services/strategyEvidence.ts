export interface StrategyEvidencePoint { date: string; close: number }

export interface StrategyEvidenceConfig {
  fastWindow: number;
  slowWindow: number;
  feeBps: number;
  slippageBps: number;
  initialCapital: number;
}

export interface StrategyLabDataset {
  id: string;
  kind: 'synthetic' | 'local-import';
  source: string;
}

export interface StrategyQualityGate {
  id: 'sample' | 'costs' | 'trades' | 'out-of-sample' | 'drawdown' | 'tail-risk';
  label: string;
  passed: boolean;
  detail: string;
}

export interface StrategyRegimeResult {
  label: string;
  startDate: string;
  endDate: string;
  strategyReturnPct: number;
  baselineReturnPct: number;
}

export interface StrategyExperimentReceipt {
  schemaVersion: 'cryptopulse.strategy-receipt.v1';
  experimentId: string;
  executionAllowed: false;
  dataset: StrategyEvidence['dataset'];
  config: StrategyEvidenceConfig;
  metrics: {
    netReturnPct: number;
    baselineReturnPct: number;
    excessReturnPct: number;
    maxDrawdownPct: number;
    tradeCount: number;
    walkForwardTestReturnPct: number;
    monteCarloP10ReturnPct: number;
  };
  gates: StrategyQualityGate[];
}

export interface StrategyEvidence {
  executionAllowed: false;
  decision: 'paper-forward-test' | 'needs-research';
  dataset: {
    id: string;
    kind: StrategyLabDataset['kind'];
    source: string;
    checksum: string;
    pointCount: number;
    startDate: string;
    endDate: string;
  };
  baseline: { buyAndHoldReturnPct: number; excessReturnPct: number };
  regimes: StrategyRegimeResult[];
  qualityGates: StrategyQualityGate[];
  receipt: StrategyExperimentReceipt;
}

interface EvidenceMetrics {
  netReturnPct: number;
  maxDrawdownPct: number;
  tradeCount: number;
  estimatedCosts: number;
  walkForwardTestReturnPct: number;
  monteCarloP10ReturnPct: number;
}

const DEFAULT_DATASET: StrategyLabDataset = Object.freeze({
  id: 'local-series',
  kind: 'local-import',
  source: 'Локальный набор без внешнего API',
});

const finite = (value: number) => Number.isFinite(value) ? value : 0;

function hashText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function cleanDataset(dataset: StrategyLabDataset): StrategyLabDataset {
  const clean = (value: string, fallback: string) => {
    const next = typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 120) : '';
    return next || fallback;
  };
  return {
    id: clean(dataset?.id, DEFAULT_DATASET.id),
    kind: dataset?.kind === 'synthetic' ? 'synthetic' : 'local-import',
    source: clean(dataset?.source, DEFAULT_DATASET.source),
  };
}

function datasetChecksum(points: StrategyEvidencePoint[]): string {
  return hashText(points.map(({ date, close }) => `${date}:${finite(close).toFixed(6)}`).join('|'));
}

function baselineReturn(points: StrategyEvidencePoint[], config: StrategyEvidenceConfig): number {
  if (points.length <= config.slowWindow) return 0;
  const oneWayCost = (config.feeBps + config.slippageBps) / 10_000;
  const entry = points[config.slowWindow].close * (1 + oneWayCost);
  const exit = points[points.length - 1].close * (1 - oneWayCost);
  return entry > 0 ? ((exit / entry) - 1) * 100 : 0;
}

export function buildStrategyEvidence(
  points: StrategyEvidencePoint[],
  config: StrategyEvidenceConfig,
  metrics: EvidenceMetrics,
  evaluate: (segment: StrategyEvidencePoint[]) => number,
  descriptor: StrategyLabDataset = DEFAULT_DATASET,
): StrategyEvidence {
  const source = cleanDataset(descriptor);
  const checksum = datasetChecksum(points);
  const baseline = baselineReturn(points, config);
  const excess = metrics.netReturnPct - baseline;
  const segmentSize = Math.floor(points.length / 3);
  const regimes = ['Ранний период', 'Средний период', 'Поздний период'].map((label, index) => {
    const start = index * segmentSize;
    const end = index === 2 ? points.length : (index + 1) * segmentSize;
    const segment = points.slice(start, end);
    return {
      label,
      startDate: segment[0]?.date || '',
      endDate: segment[segment.length - 1]?.date || '',
      strategyReturnPct: segment.length > config.slowWindow ? finite(evaluate(segment)) : 0,
      baselineReturnPct: baselineReturn(segment, config),
    };
  });
  const qualityGates: StrategyQualityGate[] = [
    { id: 'sample', label: 'Достаточная история', passed: points.length >= 180, detail: `${points.length} точек; минимум для пилота — 180.` },
    { id: 'costs', label: 'Costs учтены', passed: config.feeBps + config.slippageBps > 0 && metrics.estimatedCosts > 0, detail: `${config.feeBps + config.slippageBps} bps на сторону.` },
    { id: 'trades', label: 'Есть выборка сделок', passed: metrics.tradeCount >= 8, detail: `${metrics.tradeCount} сделок; для пилота нужно минимум 8.` },
    { id: 'out-of-sample', label: 'Положительный test', passed: metrics.walkForwardTestReturnPct > 0, detail: `Walk-forward test: ${metrics.walkForwardTestReturnPct.toFixed(1)}%.` },
    { id: 'drawdown', label: 'Просадка ограничена', passed: metrics.maxDrawdownPct <= 25, detail: `Max drawdown: ${metrics.maxDrawdownPct.toFixed(1)}%; лимит пилота — 25%.` },
    { id: 'tail-risk', label: 'Хвостовой сценарий приемлем', passed: metrics.monteCarloP10ReturnPct >= -20, detail: `Monte Carlo P10: ${metrics.monteCarloP10ReturnPct.toFixed(1)}%; floor — −20%.` },
  ];
  const dataset = {
    ...source,
    checksum,
    pointCount: points.length,
    startDate: points[0]?.date || '',
    endDate: points[points.length - 1]?.date || '',
  };
  const experimentId = `cpl-${hashText(JSON.stringify({ checksum, config, source }))}`;
  const receipt: StrategyExperimentReceipt = {
    schemaVersion: 'cryptopulse.strategy-receipt.v1',
    experimentId,
    executionAllowed: false,
    dataset,
    config: { ...config },
    metrics: {
      netReturnPct: metrics.netReturnPct,
      baselineReturnPct: baseline,
      excessReturnPct: excess,
      maxDrawdownPct: metrics.maxDrawdownPct,
      tradeCount: metrics.tradeCount,
      walkForwardTestReturnPct: metrics.walkForwardTestReturnPct,
      monteCarloP10ReturnPct: metrics.monteCarloP10ReturnPct,
    },
    gates: qualityGates,
  };
  return {
    executionAllowed: false,
    decision: qualityGates.every(({ passed }) => passed) ? 'paper-forward-test' : 'needs-research',
    dataset,
    baseline: { buyAndHoldReturnPct: baseline, excessReturnPct: excess },
    regimes,
    qualityGates,
    receipt,
  };
}
