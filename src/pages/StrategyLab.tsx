import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, FlaskConical, Play, ShieldCheck } from 'lucide-react';
import { createDemoPriceHistory, runStrategyLab, StrategyLabConfig, StrategyLabResult } from '../services/strategyLab';

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const percent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export const StrategyLab: React.FC = () => {
  const prices = useMemo(() => createDemoPriceHistory(), []);
  const [config, setConfig] = useState<StrategyLabConfig>({ fastWindow: 12, slowWindow: 36, feeBps: 10, slippageBps: 8, initialCapital: 10_000 });
  const [result, setResult] = useState<StrategyLabResult | null>(null);
  const [error, setError] = useState('');

  const update = (key: keyof StrategyLabConfig, value: number) => setConfig((current) => ({ ...current, [key]: value }));
  const run = () => {
    setError('');
    try { setResult(runStrategyLab(prices, config)); }
    catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : 'Не удалось выполнить backtest'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-cyber-cyan"><FlaskConical className="h-4 w-4" /> ECLIPSE STRATEGY LAB</div>
          <h1 className="font-display text-2xl font-black tracking-wide text-white sm:text-3xl">ПРОВЕРЬ ИДЕЮ, НЕ РИСКУЯ ДЕНЬГАМИ</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Исторический backtest с комиссиями, проскальзыванием, Monte Carlo и walk-forward. Здесь нет broker connection и кнопки live trade.</p>
        </div>
        <div className="flex w-fit items-center gap-2 border border-cyber-green/30 bg-cyber-green/5 px-3 py-2 font-mono text-xs text-cyber-green"><ShieldCheck className="h-4 w-4" /> PAPER ONLY</div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="cyber-card h-fit p-5 lg:sticky lg:top-28">
          <h2 className="font-display font-bold text-white">ПАРАМЕТРЫ ГИПОТЕЗЫ</h2>
          <p className="mt-1 text-xs text-gray-500">Демо: 240 дневных точек, deterministic dataset.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { key: 'fastWindow' as const, label: 'Fast MA', min: 2, max: 60 },
              { key: 'slowWindow' as const, label: 'Slow MA', min: 3, max: 200 },
              { key: 'feeBps' as const, label: 'Комиссия, bps', min: 0, max: 500 },
              { key: 'slippageBps' as const, label: 'Slippage, bps', min: 0, max: 500 },
            ].map((field) => (
              <label key={field.key} className="font-mono text-[11px] text-gray-500">{field.label}
                <input type="number" min={field.min} max={field.max} value={config[field.key]} onChange={(event) => update(field.key, Number(event.target.value))} className="mt-1 w-full border border-gray-800 bg-cyber-black px-3 py-2 text-sm text-white outline-none focus:border-cyber-cyan" />
              </label>
            ))}
          </div>
          <label className="mt-3 block font-mono text-[11px] text-gray-500">Paper capital, USD
            <input type="number" min={100} max={1_000_000_000} value={config.initialCapital} onChange={(event) => update('initialCapital', Number(event.target.value))} className="mt-1 w-full border border-gray-800 bg-cyber-black px-3 py-2 text-sm text-white outline-none focus:border-cyber-cyan" />
          </label>
          {error && <div role="alert" className="mt-3 flex items-start gap-2 border border-cyber-pink/30 bg-cyber-pink/5 p-3 text-sm text-cyber-pink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <button type="button" onClick={run} className="cyber-button mt-4 flex w-full items-center justify-center gap-2"><Play className="h-4 w-4" /> ЗАПУСТИТЬ BACKTEST</button>
          <p className="mt-3 text-xs leading-5 text-gray-600">Результат зависит от периода и параметров. Он не прогнозирует будущую доходность и не является финансовым советом.</p>
        </section>

        <section aria-live="polite" className="space-y-5">
          {!result ? (
            <div className="cyber-card flex min-h-72 items-center justify-center p-8 text-center">
              <div><BarChart3 className="mx-auto h-10 w-10 text-cyber-cyan/50" /><h2 className="mt-3 font-display font-bold text-white">НАЖМИТЕ «ЗАПУСТИТЬ BACKTEST»</h2><p className="mt-2 max-w-md text-sm leading-6 text-gray-500">Система покажет net return после costs, просадку, устойчивость результата и три независимых review.</p></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: 'Net return', value: percent(result.netReturnPct), tone: result.netReturnPct >= 0 ? 'text-cyber-green' : 'text-cyber-pink' },
                  { label: 'Max drawdown', value: `-${result.maxDrawdownPct.toFixed(1)}%`, tone: 'text-cyber-yellow' },
                  { label: 'Win rate', value: `${result.winRatePct.toFixed(0)}%`, tone: 'text-white' },
                  { label: 'Сделки / costs', value: `${result.tradeCount} / ${money.format(result.estimatedCosts)}`, tone: 'text-white' },
                ].map((metric) => <div key={metric.label} className="cyber-card p-4"><div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{metric.label}</div><div className={`mt-2 font-display text-xl font-bold ${metric.tone}`}>{metric.value}</div></div>)}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="cyber-card p-5">
                  <h2 className="font-display font-bold text-white">MONTE CARLO · {result.monteCarlo.simulations}</h2>
                  <p className="mt-1 text-xs text-gray-500">Bootstrap последовательности исторических сделок.</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-sm"><div><span className="block text-[10px] text-gray-600">P10</span>{percent(result.monteCarlo.p10ReturnPct)}</div><div><span className="block text-[10px] text-gray-600">MEDIAN</span>{percent(result.monteCarlo.medianReturnPct)}</div><div><span className="block text-[10px] text-gray-600">P90</span>{percent(result.monteCarlo.p90ReturnPct)}</div></div>
                </article>
                <article className="cyber-card p-5">
                  <h2 className="font-display font-bold text-white">WALK-FORWARD</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm"><div><span className="block text-[10px] text-gray-600">TRAIN</span>{percent(result.walkForward.trainReturnPct)}</div><div><span className="block text-[10px] text-gray-600">TEST</span>{percent(result.walkForward.testReturnPct)}</div></div>
                  {result.walkForward.warning && <p className="mt-3 flex gap-2 text-xs leading-5 text-cyber-yellow"><AlertTriangle className="h-4 w-4 shrink-0" />{result.walkForward.warning}</p>}
                </article>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                {result.reviews.map((review) => <article key={review.role} className="cyber-card p-5"><div className="font-display text-sm font-bold text-cyber-cyan">{review.role.toUpperCase()}</div><p className="mt-2 text-sm leading-6 text-gray-300">{review.verdict}</p></article>)}
              </div>

              <article className="cyber-card overflow-hidden">
                <div className="border-b border-gray-800 px-5 py-4"><h2 className="font-display font-bold text-white">PAPER TRADE LOG</h2></div>
                {result.trades.length === 0 ? <p className="p-5 text-sm text-gray-500">На выбранных параметрах сигналов не было.</p> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[620px] font-mono text-xs"><thead className="bg-gray-900/40 text-gray-500"><tr><th className="px-5 py-3 text-left">Вход</th><th className="px-5 py-3 text-left">Выход</th><th className="px-5 py-3 text-right">Цена входа</th><th className="px-5 py-3 text-right">Цена выхода</th><th className="px-5 py-3 text-right">Net</th></tr></thead><tbody className="divide-y divide-gray-800">{result.trades.map((trade) => <tr key={`${trade.entryDate}-${trade.exitDate}`}><td className="px-5 py-3">{trade.entryDate}</td><td className="px-5 py-3">{trade.exitDate}</td><td className="px-5 py-3 text-right">{money.format(trade.entryPrice)}</td><td className="px-5 py-3 text-right">{money.format(trade.exitPrice)}</td><td className={`px-5 py-3 text-right ${trade.netReturnPct >= 0 ? 'text-cyber-green' : 'text-cyber-pink'}`}>{percent(trade.netReturnPct)}</td></tr>)}</tbody></table></div>
                )}
              </article>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
