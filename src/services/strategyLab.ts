export interface PricePoint { date: string; close: number }

export interface StrategyLabConfig {
  fastWindow: number;
  slowWindow: number;
  feeBps: number;
  slippageBps: number;
  initialCapital: number;
}

export interface PaperTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  netReturnPct: number;
}

export interface StrategyLabResult {
  mode: 'paper';
  netReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  tradeCount: number;
  estimatedCosts: number;
  monteCarlo: { p10ReturnPct: number; medianReturnPct: number; p90ReturnPct: number; simulations: number };
  walkForward: { trainReturnPct: number; testReturnPct: number; warning: string | null };
  trades: PaperTrade[];
  reviews: Array<{ role: 'Optimist' | 'Skeptic' | 'Risk Manager'; verdict: string }>;
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function assertConfig(config: StrategyLabConfig, points: PricePoint[]) {
  if (points.length < 60 || points.some((point) => !Number.isFinite(point.close) || point.close <= 0)) {
    throw new Error('Нужно минимум 60 корректных исторических цен');
  }
  if (!Number.isInteger(config.fastWindow) || config.fastWindow < 2 || config.fastWindow > 60) {
    throw new Error('Быстрое окно: целое число от 2 до 60');
  }
  if (!Number.isInteger(config.slowWindow) || config.slowWindow <= config.fastWindow || config.slowWindow > 200) {
    throw new Error('Медленное окно должно быть больше быстрого и не больше 200');
  }
  if (config.slowWindow >= points.length) throw new Error('Медленное окно должно быть короче истории');
  if (![config.feeBps, config.slippageBps].every((value) => Number.isFinite(value) && value >= 0 && value <= 500)) {
    throw new Error('Комиссия и проскальзывание: от 0 до 500 bps');
  }
  if (!Number.isFinite(config.initialCapital) || config.initialCapital < 100 || config.initialCapital > 1_000_000_000) {
    throw new Error('Начальный капитал: от 100 до 1 000 000 000');
  }
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function simulate(points: PricePoint[], config: StrategyLabConfig) {
  const oneWayCost = (config.feeBps + config.slippageBps) / 10_000;
  let cash = config.initialCapital;
  let shares = 0;
  let entry: { date: string; price: number; equityBefore: number } | null = null;
  let estimatedCosts = 0;
  let peak = config.initialCapital;
  let maxDrawdown = 0;
  const trades: PaperTrade[] = [];

  for (let index = config.slowWindow; index < points.length; index += 1) {
    const current = points[index];
    const fast = average(points.slice(index - config.fastWindow + 1, index + 1).map((point) => point.close));
    const slow = average(points.slice(index - config.slowWindow + 1, index + 1).map((point) => point.close));
    const shouldHold = fast > slow;

    if (shouldHold && shares === 0) {
      const executionPrice = current.close * (1 + oneWayCost);
      estimatedCosts += cash * oneWayCost;
      entry = { date: current.date, price: executionPrice, equityBefore: cash };
      shares = cash / executionPrice;
      cash = 0;
    } else if (!shouldHold && shares > 0 && entry) {
      const executionPrice = current.close * (1 - oneWayCost);
      cash = shares * executionPrice;
      estimatedCosts += shares * current.close * oneWayCost;
      trades.push({
        entryDate: entry.date,
        exitDate: current.date,
        entryPrice: entry.price,
        exitPrice: executionPrice,
        netReturnPct: ((cash / entry.equityBefore) - 1) * 100,
      });
      shares = 0;
      entry = null;
    }

    const equity = cash + shares * current.close;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - equity) / peak : 0);
  }

  if (shares > 0 && entry) {
    const last = points[points.length - 1];
    const executionPrice = last.close * (1 - oneWayCost);
    cash = shares * executionPrice;
    estimatedCosts += shares * last.close * oneWayCost;
    trades.push({
      entryDate: entry.date,
      exitDate: last.date,
      entryPrice: entry.price,
      exitPrice: executionPrice,
      netReturnPct: ((cash / entry.equityBefore) - 1) * 100,
    });
  }

  return {
    returnPct: ((cash / config.initialCapital) - 1) * 100,
    maxDrawdownPct: maxDrawdown * 100,
    estimatedCosts,
    trades,
  };
}

export function runStrategyLab(points: PricePoint[], config: StrategyLabConfig): StrategyLabResult {
  assertConfig(config, points);
  const base = simulate(points, config);
  const split = Math.max(config.slowWindow + 2, Math.floor(points.length * 0.6));
  const train = simulate(points.slice(0, split), { ...config, slowWindow: Math.min(config.slowWindow, split - 1) });
  const testPoints = points.slice(Math.max(0, split - config.slowWindow));
  const test = simulate(testPoints, config);

  const tradeReturns = base.trades.map((trade) => trade.netReturnPct / 100);
  const random = seededRandom(20260802);
  const simulations = 500;
  const outcomes = Array.from({ length: simulations }, () => {
    let equity = config.initialCapital;
    for (let index = 0; index < Math.max(1, tradeReturns.length); index += 1) {
      const sampled = tradeReturns.length ? tradeReturns[Math.floor(random() * tradeReturns.length)] : 0;
      equity *= 1 + sampled;
    }
    return ((equity / config.initialCapital) - 1) * 100;
  }).sort((a, b) => a - b);

  const winRatePct = base.trades.length
    ? (base.trades.filter((trade) => trade.netReturnPct > 0).length / base.trades.length) * 100
    : 0;
  const overfitWarning = train.returnPct > 0 && test.returnPct < 0
    ? 'Параметры прибыльны на train, но убыточны на test — возможное переобучение.'
    : null;

  return {
    mode: 'paper',
    netReturnPct: base.returnPct,
    maxDrawdownPct: base.maxDrawdownPct,
    winRatePct,
    tradeCount: base.trades.length,
    estimatedCosts: base.estimatedCosts,
    monteCarlo: {
      p10ReturnPct: percentile(outcomes, 0.1),
      medianReturnPct: percentile(outcomes, 0.5),
      p90ReturnPct: percentile(outcomes, 0.9),
      simulations,
    },
    walkForward: { trainReturnPct: train.returnPct, testReturnPct: test.returnPct, warning: overfitWarning },
    trades: base.trades,
    reviews: [
      { role: 'Optimist', verdict: base.returnPct > 0 ? `После costs стратегия дала ${base.returnPct.toFixed(1)}%. Это гипотеза для дальнейшей проверки.` : 'Положительный edge на выбранном периоде не подтверждён.' },
      { role: 'Skeptic', verdict: `${base.trades.length} сделок недостаточно для уверенного вывода без других режимов рынка и независимого dataset.` },
      { role: 'Risk Manager', verdict: `Максимальная историческая просадка ${base.maxDrawdownPct.toFixed(1)}%. Live execution запрещён; результат не является советом.` },
    ],
  };
}

export function createDemoPriceHistory(days = 240): PricePoint[] {
  const start = Date.UTC(2025, 11, 5);
  return Array.from({ length: days }, (_, index) => {
    const trend = 42_000 + index * 95;
    const cycle = Math.sin(index / 9) * 3_800 + Math.sin(index / 31) * 5_200;
    const shock = index > 120 && index < 145 ? -6_000 * Math.sin(((index - 120) / 25) * Math.PI) : 0;
    return { date: new Date(start + index * 86_400_000).toISOString().slice(0, 10), close: Math.max(1, trend + cycle + shock) };
  });
}
