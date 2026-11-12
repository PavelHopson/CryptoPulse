import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, CheckCircle2, Download, FlaskConical, Play, ShieldCheck, XCircle } from 'lucide-react';
import { createDemoPriceHistory, runStrategyLab, StrategyLabConfig, StrategyLabResult } from '../services/strategyLab';
import { strategyResultToMarkdown, strategyTradesToCsv } from '../services/strategyExport';
import { DEFAULT_STRATEGY_CSV_LIMITS, parseStrategyPricesCsv, StrategyCsvImportError } from '../services/strategyCsvImport';
import type { StrategyLabDataset } from '../services/strategyEvidence';
import { listResearchRuns, ResearchApiError, saveResearchRun } from '../services/researchApi';

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const percent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const STRATEGY_HISTORY_KEY = 'cryptopulse_strategy_history_v1';
const scenarioPresets: Record<string, { name: string; fastWindow: number; slowWindow: number }> = {
  t1: { name: 'Momentum', fastWindow: 12, slowWindow: 36 },
  t2: { name: 'Breakout', fastWindow: 8, slowWindow: 24 },
  t3: { name: 'Trend', fastWindow: 16, slowWindow: 48 },
  t4: { name: 'Mean reversion', fastWindow: 10, slowWindow: 30 },
  t5: { name: 'Range', fastWindow: 6, slowWindow: 18 },
  t6: { name: 'Defensive', fastWindow: 20, slowWindow: 60 },
  t7: { name: 'Low volatility', fastWindow: 14, slowWindow: 42 },
  t8: { name: 'Stress test', fastWindow: 24, slowWindow: 72 },
};

function isStrategyResult(value: unknown): value is StrategyLabResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<StrategyLabResult>;
  return candidate.mode === 'paper'
    && Array.isArray(candidate.trades)
    && Array.isArray(candidate.qualityGates)
    && Boolean(candidate.receipt && typeof candidate.receipt.experimentId === 'string');
}

function mergeSavedRuns(current: StrategyLabResult[], incoming: StrategyLabResult[]): StrategyLabResult[] {
  const seen = new Set<string>();
  return [...incoming, ...current].filter((item) => {
    const id = item.receipt.experimentId;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 10);
}

export const StrategyLab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedScenario = searchParams.get('scenario') || '';
  const requestedAsset = searchParams.get('asset') || '';
  const preset = scenarioPresets[requestedScenario];
  const demoPrices = useMemo(() => createDemoPriceHistory(), []);
  const [prices, setPrices] = useState(demoPrices);
  const [dataset, setDataset] = useState<StrategyLabDataset>({ id: 'cryptopulse-demo-v1', kind: 'synthetic', source: 'Детерминированный синтетический ряд CryptoPulse' });
  const [config, setConfig] = useState<StrategyLabConfig>(() => ({ fastWindow: preset?.fastWindow ?? 12, slowWindow: preset?.slowWindow ?? 36, feeBps: 10, slippageBps: 8, initialCapital: 10_000 }));
  const [result, setResult] = useState<StrategyLabResult | null>(null);
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [resultStale, setResultStale] = useState(false);
  const [savedRuns, setSavedRuns] = useState<StrategyLabResult[]>(() => {
    try {
      const raw = localStorage.getItem(STRATEGY_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isStrategyResult).slice(0, 10) : [];
    } catch {
      return [];
    }
  });
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'auth-required' | 'error'>('local');
  const [pendingSave, setPendingSave] = useState<StrategyLabResult | null>(null);
  const importSequence = useRef(0);
  const navigate = useNavigate();

  const syncResearchRun = (nextResult: StrategyLabResult) => {
    setPendingSave(nextResult);
    setSyncState('syncing');
    void saveResearchRun(`Strategy Lab · ${nextResult.receipt.experimentId}`, nextResult)
      .then((response) => {
        setPendingSave(null);
        setSyncState(response.configured ? 'synced' : 'local');
      })
      .catch((caught) => {
        setSyncState(caught instanceof ResearchApiError && caught.code === 'UNAUTHORIZED' ? 'auth-required' : 'error');
      });
  };

  useEffect(() => {
    let active = true;
    setSyncState('syncing');
    void listResearchRuns<StrategyLabResult>()
      .then((response) => {
        if (!active) return;
        if (!response.configured) {
          setSyncState('local');
          return;
        }
        const incoming = response.runs.map((run) => run.payload).filter(isStrategyResult);
        setSavedRuns((current) => mergeSavedRuns(current, incoming));
        setSyncState('synced');
      })
      .catch((caught) => {
        if (!active) return;
        setSyncState(caught instanceof ResearchApiError && caught.code === 'UNAUTHORIZED' ? 'auth-required' : 'error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!preset) return;
    setConfig((current) => ({ ...current, fastWindow: preset.fastWindow, slowWindow: preset.slowWindow }));
    setResult(null);
    setError('');
    setResultStale(false);
  }, [requestedScenario]);

  const update = (key: keyof StrategyLabConfig, value: number) => {
    setConfig((current) => ({ ...current, [key]: value }));
    if (result) setResultStale(true);
  };
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const sequence = importSequence.current + 1;
    importSequence.current = sequence;
    setImportError('');
    setError('');
    setResult(null);
    setResultStale(false);
    setIsImporting(true);
    try {
      if (file.size > DEFAULT_STRATEGY_CSV_LIMITS.maxBytes) {
        throw new StrategyCsvImportError('FILE_TOO_LARGE', `CSV-файл больше ${Math.round(DEFAULT_STRATEGY_CSV_LIMITS.maxBytes / 1024 / 1024)} МБ`);
      }
      const imported = parseStrategyPricesCsv(await file.text());
      if (sequence !== importSequence.current) return;
      if (imported.length < 60) {
        throw new Error('Для backtest нужен CSV минимум на 60 дневных точек.');
      }
      setPrices(imported);
      setDataset({ id: `csv-${file.lastModified}-${file.size}`, kind: 'local-import', source: file.name });
      setResult(null);
      setError('');
    } catch (caught) {
      if (sequence === importSequence.current) setImportError(caught instanceof Error ? caught.message : 'Не удалось импортировать CSV');
    } finally {
      if (sequence === importSequence.current) setIsImporting(false);
    }
  };
  const resetDataset = () => {
    setPrices(demoPrices);
    setDataset({ id: 'cryptopulse-demo-v1', kind: 'synthetic', source: 'Детерминированный синтетический ряд CryptoPulse' });
    setResult(null);
    setError('');
    setImportError('');
    setResultStale(false);
  };
  const run = () => {
    if (isImporting) return;
    setError('');
    try {
      const nextResult = runStrategyLab(prices, config, dataset);
      setResult(nextResult);
      setSavedRuns((current) => {
        const nextHistory = [nextResult, ...current.filter((item) => item.receipt.experimentId !== nextResult.receipt.experimentId)].slice(0, 10);
        try { localStorage.setItem(STRATEGY_HISTORY_KEY, JSON.stringify(nextHistory)); } catch { /* local history is optional */ }
        return nextHistory;
      });
      syncResearchRun(nextResult);
      setResultStale(false);
    }
    catch (caught) { setResult(null); setResultStale(false); setError(caught instanceof Error ? caught.message : 'Не удалось выполнить backtest'); }
  };
  const syncCopy = {
    local: 'Локальная история: серверная синхронизация выключена.',
    syncing: 'Проверяем серверную историю…',
    synced: 'Серверная история подключена; локальная копия остаётся доступной.',
    'auth-required': 'Серверная история требует входа. Локальная копия продолжает работать.',
    error: 'Серверная история временно недоступна. Локальная копия продолжает работать.',
  }[syncState];
  const retryResearchSync = () => {
    if (pendingSave) syncResearchRun(pendingSave);
  };
  const clearSavedRuns = () => {
    setSavedRuns([]);
    try { localStorage.removeItem(STRATEGY_HISTORY_KEY); } catch { /* local history is optional */ }
  };
  const downloadReceipt = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.receipt, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.receipt.experimentId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const downloadText = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-cyber-cyan"><FlaskConical className="h-4 w-4" /> ECLIPSE STRATEGY LAB</div>
          <h1 className="font-display text-2xl font-black tracking-wide text-white sm:text-3xl">ПРОВЕРЬ ИДЕЮ, НЕ РИСКУЯ ДЕНЬГАМИ</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Исторический backtest с комиссиями, проскальзыванием, Monte Carlo и walk-forward. Здесь нет broker connection и кнопки live trade.</p>
          {(requestedScenario || requestedAsset) && <div className="mt-3 flex flex-wrap items-center gap-2 border border-cyber-yellow/30 bg-cyber-yellow/5 px-3 py-2 font-mono text-xs text-cyber-yellow">КОНТЕКСТ: {preset?.name ?? 'Свободная гипотеза'}{requestedAsset ? ` · ${requestedAsset.toUpperCase()}` : ''}{requestedAsset && <span className="text-gray-500">Актив выбран для контекста — загрузите CSV, чтобы проверить его историю.</span>}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit items-center gap-2 border border-cyber-green/30 bg-cyber-green/5 px-3 py-2 font-mono text-xs text-cyber-green"><ShieldCheck className="h-4 w-4" /> PAPER ONLY</div>
          <div className="flex w-fit items-center gap-2 border border-cyber-cyan/30 bg-cyber-cyan/5 px-3 py-2 font-mono text-xs text-cyber-cyan">{dataset.kind === 'synthetic' ? 'DEMO DATASET' : 'LOCAL CSV'}</div>
          <div className="flex w-fit items-center gap-2 border border-gray-800 px-3 py-2 font-mono text-xs text-gray-500">LOCAL HISTORY · {savedRuns.length}/10</div>
        </div>
      </header>

      {(savedRuns.length > 0 || syncState !== 'local') && (
        <div className="flex flex-col gap-3 border border-gray-800 bg-cyber-black/50 p-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span role="status" aria-live="polite">{syncCopy}</span>
            {syncState === 'auth-required' && <button type="button" onClick={() => navigate('/login')} className="border border-cyber-cyan/40 px-3 py-2 font-mono text-[10px] text-cyber-cyan hover:border-cyber-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan">ВОЙТИ</button>}
            {syncState === 'error' && pendingSave && <button type="button" onClick={retryResearchSync} className="border border-cyber-yellow/40 px-3 py-2 font-mono text-[10px] text-cyber-yellow hover:border-cyber-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-yellow">ПОВТОРИТЬ</button>}
          </div>
          {savedRuns.length > 0 && <button type="button" onClick={clearSavedRuns} className="w-fit border border-gray-800 px-3 py-2 font-mono text-[10px] text-gray-500 hover:border-cyber-pink/40 hover:text-cyber-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan">ОЧИСТИТЬ ИСТОРИЮ</button>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="cyber-card h-fit p-5 lg:sticky lg:top-28">
          <h2 className="font-display font-bold text-white">ПАРАМЕТРЫ ГИПОТЕЗЫ</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{dataset.kind === 'synthetic' ? 'Демо: 240 дневных точек, deterministic dataset.' : `Источник: ${dataset.source}`}</p>
          <div className="mt-4 border border-gray-800 bg-cyber-black/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-cyan">ИСТОРИЯ ЦЕН</div>
            <label className="mt-2 block cursor-pointer text-xs text-gray-300">
              <span className={`cyber-button inline-flex w-full items-center justify-center ${isImporting ? 'pointer-events-none opacity-60' : ''}`}>{isImporting ? 'ЧИТАЕМ CSV…' : 'ЗАГРУЗИТЬ CSV'}</span>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" />
            </label>
            <button type="button" onClick={resetDataset} className="mt-2 w-full border border-gray-800 px-3 py-2 text-[11px] font-mono text-gray-500 hover:border-cyber-cyan/40 hover:text-cyber-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan">ВЕРНУТЬ ДЕМО-НАБОР</button>
            <p className="mt-2 text-[11px] leading-5 text-gray-600">CSV: колонки <code>date</code> и <code>close</code>, формат даты YYYY-MM-DD, минимум 60 точек, максимум 2 МБ.</p>
            {importError && <div role="alert" className="mt-2 flex items-start gap-2 text-xs leading-5 text-cyber-pink"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{importError}</div>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { key: 'fastWindow' as const, label: 'Fast MA', min: 2, max: 60 },
              { key: 'slowWindow' as const, label: 'Slow MA', min: 3, max: 200 },
              { key: 'feeBps' as const, label: 'Комиссия, bps', min: 0, max: 500 },
              { key: 'slippageBps' as const, label: 'Slippage, bps', min: 0, max: 500 },
            ].map((field) => (
              <label key={field.key} className="font-mono text-[11px] text-gray-500">{field.label}
                <input type="number" min={field.min} max={field.max} value={config[field.key]} onChange={(event) => update(field.key, Number(event.target.value))} className="mt-1 w-full border border-gray-800 bg-cyber-black px-3 py-2 text-sm text-white outline-none focus:border-cyber-cyan focus-visible:ring-2 focus-visible:ring-cyber-cyan/70" />
              </label>
            ))}
          </div>
          <label className="mt-3 block font-mono text-[11px] text-gray-500">Paper capital, USD
            <input type="number" min={100} max={1_000_000_000} value={config.initialCapital} onChange={(event) => update('initialCapital', Number(event.target.value))} className="mt-1 w-full border border-gray-800 bg-cyber-black px-3 py-2 text-sm text-white outline-none focus:border-cyber-cyan focus-visible:ring-2 focus-visible:ring-cyber-cyan/70" />
          </label>
          {error && <div role="alert" className="mt-3 flex items-start gap-2 border border-cyber-pink/30 bg-cyber-pink/5 p-3 text-sm text-cyber-pink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <button type="button" onClick={run} disabled={isImporting} className="cyber-button mt-4 flex w-full items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-4 w-4" /> {isImporting ? 'ДОЖДИТЕСЬ ИМПОРТА' : 'ЗАПУСТИТЬ BACKTEST'}</button>
          <p className="mt-3 text-xs leading-5 text-gray-600">Результат зависит от периода и параметров. Он не прогнозирует будущую доходность и не является финансовым советом.</p>
        </section>

        <section aria-live="polite" aria-busy={isImporting} className="space-y-5">
          {resultStale && <div role="status" className="flex items-start gap-2 border border-cyber-yellow/30 bg-cyber-yellow/5 p-3 text-sm text-cyber-yellow"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Параметры изменились. Запустите backtest повторно, чтобы обновить результат.</div>}
          {!result ? (
            <div className="cyber-card flex min-h-72 items-center justify-center p-8 text-center">
              <div><BarChart3 className="mx-auto h-10 w-10 text-cyber-cyan/50" /><h2 className="mt-3 font-display font-bold text-white">НАЖМИТЕ «ЗАПУСТИТЬ BACKTEST»</h2><p className="mt-2 max-w-md text-sm leading-6 text-gray-500">Система покажет net return после costs, просадку, устойчивость результата и три независимых review.</p></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {[
                  { label: 'Net return', value: percent(result.netReturnPct), tone: result.netReturnPct >= 0 ? 'text-cyber-green' : 'text-cyber-pink' },
                  { label: 'Базовая динамика', value: percent(result.baseline.buyAndHoldReturnPct), tone: 'text-white' },
                  { label: 'Разница к базе', value: percent(result.baseline.excessReturnPct), tone: result.baseline.excessReturnPct >= 0 ? 'text-cyber-green' : 'text-cyber-pink' },
                  { label: 'Max drawdown', value: `-${result.maxDrawdownPct.toFixed(1)}%`, tone: 'text-cyber-yellow' },
                  { label: 'Доля положительных исходов', value: `${result.winRatePct.toFixed(0)}%`, tone: 'text-white' },
                  { label: 'Сценарии / издержки', value: `${result.tradeCount} / ${money.format(result.estimatedCosts)}`, tone: 'text-white' },
                ].map((metric) => <div key={metric.label} className="cyber-card p-4"><div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{metric.label}</div><div className={`mt-2 font-display text-xl font-bold ${metric.tone}`}>{metric.value}</div></div>)}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="cyber-card p-5">
                  <div className="flex items-start justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-cyan">RESEARCH GATES</div><h2 className="mt-1 font-display font-bold text-white">{result.decision === 'paper-forward-test' ? 'ГОТОВО К PAPER FORWARD-TEST' : 'НУЖНЫ ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ'}</h2></div><span className={`border px-2 py-1 font-mono text-[10px] ${result.decision === 'paper-forward-test' ? 'border-cyber-green/30 text-cyber-green' : 'border-cyber-yellow/30 text-cyber-yellow'}`}>{result.qualityGates.filter((gate) => gate.passed).length}/{result.qualityGates.length}</span></div>
                  <ul className="mt-4 space-y-3">{result.qualityGates.map((gate) => <li key={gate.id} className="flex items-start gap-3 text-sm"><span className="mt-0.5">{gate.passed ? <CheckCircle2 className="h-4 w-4 text-cyber-green" /> : <XCircle className="h-4 w-4 text-cyber-pink" />}</span><span><b className="block text-gray-200">{gate.label}</b><small className="text-gray-500">{gate.detail}</small></span></li>)}</ul>
                </article>
                <article className="cyber-card p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-cyan">REPRODUCIBLE RECEIPT</div>
                  <h2 className="mt-1 font-display font-bold text-white">{result.receipt.experimentId}</h2>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-mono text-[10px] text-gray-600">DATASET</dt><dd className="mt-1 text-gray-300">{result.dataset.source}</dd></div><div><dt className="font-mono text-[10px] text-gray-600">RANGE</dt><dd className="mt-1 text-gray-300">{result.dataset.startDate} — {result.dataset.endDate}</dd></div><div><dt className="font-mono text-[10px] text-gray-600">POINTS</dt><dd className="mt-1 text-gray-300">{result.dataset.pointCount}</dd></div><div><dt className="font-mono text-[10px] text-gray-600">CHECKSUM</dt><dd className="mt-1 font-mono text-gray-300">{result.dataset.checksum}</dd></div></dl>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => downloadText(strategyResultToMarkdown(result), `${result.receipt.experimentId}.md`, 'text/markdown;charset=utf-8')} className="cyber-button flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"><Download className="h-4 w-4" /> REPORT MD</button>
                    <button type="button" onClick={() => downloadText(strategyTradesToCsv(result), `${result.receipt.experimentId}-trades.csv`, 'text/csv;charset=utf-8')} className="cyber-button flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"><Download className="h-4 w-4" /> TRADES CSV</button>
                    <button type="button" onClick={downloadReceipt} className="cyber-button flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"><Download className="h-4 w-4" /> RECEIPT JSON</button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-gray-600">Receipt фиксирует dataset, параметры, метрики и gates. Он не содержит API-ключей и не разрешает live execution.</p>
                </article>
              </div>

              <article className="cyber-card overflow-hidden">
                <div className="border-b border-gray-800 px-5 py-4"><h2 className="font-display font-bold text-white">ПРОВЕРКА ПО ТРЁМ РЕЖИМАМ</h2><p className="mt-1 text-xs text-gray-500">Один хороший итог не должен скрывать слабый отдельный период.</p></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[620px] font-mono text-xs"><thead className="bg-gray-900/40 text-gray-500"><tr><th className="px-5 py-3 text-left">Период</th><th className="px-5 py-3 text-left">Диапазон</th><th className="px-5 py-3 text-right">Сценарий</th><th className="px-5 py-3 text-right">База</th></tr></thead><tbody className="divide-y divide-gray-800">{result.regimes.map((regime) => <tr key={regime.label}><td className="px-5 py-3 text-gray-200">{regime.label}</td><td className="px-5 py-3 text-gray-500">{regime.startDate} — {regime.endDate}</td><td className={`px-5 py-3 text-right ${regime.strategyReturnPct >= 0 ? 'text-cyber-green' : 'text-cyber-pink'}`}>{percent(regime.strategyReturnPct)}</td><td className="px-5 py-3 text-right text-gray-300">{percent(regime.baselineReturnPct)}</td></tr>)}</tbody></table></div>
              </article>

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
                <div className="border-b border-gray-800 px-5 py-4"><h2 className="font-display font-bold text-white">ЖУРНАЛ PAPER-СЦЕНАРИЕВ</h2></div>
                {result.trades.length === 0 ? <p className="p-5 text-sm text-gray-500">По выбранным правилам входов не было.</p> : (
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
