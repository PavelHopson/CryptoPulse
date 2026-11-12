import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchCoinDetails, fetchCoinHistory } from '../services/cryptoService';
import { CoinData, AssetCategory, CandleData, Timeframe } from '../types';
import type { DataStatus } from '../services/cryptoService';
import { TradingViewChart } from '../components/TradingViewChart';
import { AIInsight } from '../components/AIInsight';
import { TechAnalysisModal } from '../components/TechAnalysisModal';
import { ArrowLeft, Globe, TrendingUp, DollarSign, Activity, AlertTriangle, RefreshCw, ExternalLink, Terminal, BellRing } from 'lucide-react';
import { CryptoIcon } from '../components/CryptoIcon';
import { PriceAlertModal } from '../components/PriceAlertModal';

export const CoinDetail: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const category = (searchParams.get('cat') as AssetCategory) || 'crypto';
  
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const chartDataRef = useRef<CandleData[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [loading, setLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<DataStatus | 'CHECKING'>('CHECKING');
  const [historyStatus, setHistoryStatus] = useState<DataStatus | 'CHECKING'>('CHECKING');
  const [loadError, setLoadError] = useState('');
  const requestIdRef = useRef(0);
  
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const loadData = async (silent = false) => {
    if (id) {
      const requestId = ++requestIdRef.current;
      if (!silent) setLoading(true);
      let details;
      try {
        details = await fetchCoinDetails(id, category);
      } catch {
        if (requestId === requestIdRef.current) setLoadError('Не удалось загрузить актив.');
        if (!silent && requestId === requestIdRef.current) setLoading(false);
        return;
      }
      if (requestId !== requestIdRef.current) return;
      const { data, status, error } = details;
      setDataStatus(status);
      setCoin(data);
      setLoadError(error || '');
      if (data && (!silent || chartDataRef.current.length === 0)) {
        const history = await fetchCoinHistory(id, timeframe, data.current_price);
        if (requestId !== requestIdRef.current) return;
        setHistoryStatus(history.status);
        chartDataRef.current = history.data;
        setChartData(history.data);
      } else if (data && silent) {
        if (error) setLoadError(error);
        setChartData((previous) => {
          if (previous.length === 0) return previous;
          const lastCandle = previous[previous.length - 1];
          const updatedCandle = {
            ...lastCandle,
            close: data.current_price,
            high: Math.max(lastCandle.high, data.current_price),
            low: Math.min(lastCandle.low, data.current_price)
          };
          const next = [...previous.slice(0, -1), updatedCandle];
          chartDataRef.current = next;
          return next;
        });
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    chartDataRef.current = [];
    setChartData([]);
    setHistoryStatus('CHECKING');
    loadData();
  }, [id, category, timeframe]);
  useEffect(() => {
    if (dataStatus !== 'LIVE' && dataStatus !== 'CACHED') return;
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [id, category, timeframe, dataStatus]);

  if (loading && !coin) return <div className="flex justify-center items-center h-64 text-cyber-cyan font-mono animate-pulse">ЗАГРУЗКА ДАННЫХ...</div>;
  
  if (!coin) return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center font-mono">
      <p className="text-cyber-pink">{loadError || 'АКТИВ НЕ НАЙДЕН'}</p>
      <button type="button" onClick={() => loadData()} className="cyber-button inline-flex items-center gap-2 px-4 py-2 text-xs">
        <RefreshCw className="h-3.5 w-3.5" /> ПОВТОРИТЬ
      </button>
    </div>
  );

  const isPositive = coin.price_change_percentage_24h >= 0;
  const neonColor = isPositive ? 'text-cyber-green' : 'text-cyber-pink';
  const glowClass = isPositive ? 'shadow-neon-green' : 'shadow-neon-pink';
  const statusLabel = dataStatus === 'LIVE'
    ? 'LIVE'
    : dataStatus === 'CACHED'
      ? 'CACHED'
      : dataStatus === 'MIXED'
        ? 'MIXED SOURCES'
        : dataStatus === 'CHECKING'
          ? 'CHECKING'
          : `${dataStatus} / DEMO`;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <TechAnalysisModal coin={coin} isOpen={techModalOpen} onClose={() => setTechModalOpen(false)} />
      <PriceAlertModal isOpen={alertModalOpen} onClose={() => setAlertModalOpen(false)} coinId={coin.id} coinName={coin.name} currentPrice={coin.current_price} />

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-cyber-yellow/30 bg-cyber-yellow/5 px-4 py-3 text-sm text-cyber-yellow">
          <span>{loadError} Показаны последние доступные данные.</span>
          <button type="button" onClick={() => loadData(true)} className="inline-flex items-center gap-2 border border-cyber-yellow/40 px-3 py-1.5 font-mono text-xs hover:bg-cyber-yellow/10">
            <RefreshCw className="h-3.5 w-3.5" /> ОБНОВИТЬ
          </button>
        </div>
      )}

      <Link to={category === 'crypto' ? '/' : `/${category}`} className="inline-flex items-center text-cyber-cyan/60 hover:text-cyber-cyan transition-colors mb-4 font-mono text-xs tracking-widest">
        <ArrowLeft className="w-3 h-3 mr-2" /> НАЗАД К СПИСКУ
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cyber-card p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center bg-cyber-black border border-gray-800">
              <CryptoIcon id={coin.id} size={48} fallbackUrl={coin.image} />
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-cyan"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-cyan"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyber-cyan"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-cyan"></div>
          </div>
          <div>
             <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white tracking-wide">{coin.name.toUpperCase()}</h1>
             <div className="flex items-center gap-3 mt-2">
               <span className="bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 text-xs px-2 py-0.5 font-mono">{coin.symbol.toUpperCase()}</span>
               <span className="bg-gray-900 text-gray-400 text-xs px-2 py-0.5 font-mono border border-gray-800">РАНГ #{coin.market_cap_rank}</span>
               <span className={`border px-2 py-0.5 text-[10px] font-mono ${dataStatus === 'LIVE' || dataStatus === 'CACHED' ? 'border-cyber-green/40 text-cyber-green' : 'border-cyber-yellow/40 text-cyber-yellow'}`}>{statusLabel}</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end">
           <div className={`text-3xl sm:text-4xl md:text-5xl font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]`}>
              ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </div>
           <div className={`flex items-center gap-2 mt-2 text-xl font-bold font-mono ${neonColor}`}>
              {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingUp className="w-6 h-6 rotate-180" />}
              {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
           </div>

           <div className="flex flex-wrap gap-3 mt-6 w-full md:w-auto">
             <Link to={`/strategy-lab?asset=${encodeURIComponent(coin.symbol.toUpperCase())}`} className="cyber-button border-cyber-cyan text-cyber-cyan px-4 sm:px-6 py-3 hover:shadow-neon-cyan w-full sm:w-auto text-center">
               ИССЛЕДОВАТЬ В STRATEGY LAB
             </Link>
             <button onClick={() => setAlertModalOpen(true)} className="cyber-button border-cyber-yellow text-cyber-yellow px-3 py-3 hover:bg-cyber-yellow/10" title="Ценовой алерт" aria-label="Открыть ценовой алерт">
               <BellRing className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart & AI */}
        <div className="lg:col-span-2 space-y-6">
           <div className="cyber-card p-1">
              <div className="flex items-center justify-between px-5 py-3 bg-cyber-black/60 border-b border-gray-800">
                <h2 className="text-sm font-mono text-cyber-cyan flex items-center gap-2">
                   <Activity className="w-4 h-4" /> ВИЗУАЛИЗАЦИЯ ГРАФИКА
                </h2>
                <span className="mr-auto ml-4 text-[10px] font-mono text-gray-600">HISTORY · {historyStatus === 'LIVE' ? 'LIVE OHLC' : historyStatus === 'CACHED' ? 'CACHED OHLC' : `${historyStatus} / DEMO OHLC`}</span>
                <div className="flex gap-1">
                   {(['1H', '1D', '1W', '1M', '1Y'] as Timeframe[]).map(t => (
                      <button key={t} onClick={() => setTimeframe(t)} aria-pressed={timeframe === t} aria-label={`Показать график за ${t}`} className={`px-3 py-1 text-[10px] font-mono transition-colors duration-200 ease-soft ${timeframe === t ? 'bg-cyber-cyan text-black font-bold' : 'text-gray-500 hover:text-white'}`}>
                        {t}
                      </button>
                   ))}
                </div>
              </div>
              <div className="p-4 bg-cyber-black/40 min-h-[300px] sm:min-h-[400px]">
                  <TradingViewChart data={chartData} height={400} isPositive={isPositive} />
              </div>
           </div>

           <AIInsight coin={coin} />
        </div>

        {/* Stats Side Panel */}
        <div className="space-y-6">
           <div className="cyber-card p-6">
              <h3 className="text-lg font-display font-bold mb-6 text-white border-b border-gray-800 pb-2">МЕТРИКИ РЫНКА</h3>
              <div className="space-y-4 font-mono text-sm">
                 <div className="flex justify-between">
                    <span className="text-gray-500">РЫН. КАП</span>
                    <span className="text-white">${(coin.market_cap / 1e9).toFixed(2)}B</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">ОБЪЕМ 24Ч</span>
                    <span className="text-white">${(coin.total_volume / 1e9).toFixed(2)}B</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">ДИАПАЗОН</span>
                    <span className="text-white text-xs">{coin.low_24h} - {coin.high_24h}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-500">ИСТ. МАКС (ATH)</span>
                    <span className="text-white">${coin.ath.toLocaleString()} <span className="text-red-500 text-xs">({coin.ath_change_percentage.toFixed(1)}%)</span></span>
                 </div>
              </div>
           </div>
           
           <div className="cyber-card p-6">
              <h3 className="text-lg font-display font-bold mb-4 text-white">ССЫЛКИ</h3>
              <div className="space-y-3">
                 {coin.category === 'crypto' ? (
                   <a href={`https://www.coingecko.com/en/coins/${encodeURIComponent(coin.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 hover:border-cyber-cyan hover:text-cyber-cyan transition-colors duration-200 ease-soft group">
                      <span className="font-mono text-xs flex items-center gap-2"><Globe className="w-3 h-3" /> ОТКРЫТЬ КАРТОЧКУ COINGECKO</span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                   </a>
                 ) : (
                   <div className="border border-dashed border-gray-800 p-3 text-xs text-gray-600">Внешняя карточка для этого демонстрационного класса пока не подключена.</div>
                 )}
                 <button onClick={() => setTechModalOpen(true)} className="w-full p-3 bg-cyber-purple/10 border border-cyber-purple text-cyber-purple font-mono text-xs font-bold hover:bg-cyber-purple/20 transition-colors duration-200 ease-soft flex items-center justify-center gap-2">
                    <Terminal className="w-3 h-3" /> ОТКРЫТЬ ОБЗОР МЕТРИК
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
