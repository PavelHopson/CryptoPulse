
import React, { useEffect, useState } from 'react';
import { X, Activity, Zap } from 'lucide-react';
import { CoinData } from '../types';

interface Props {
  coin: CoinData;
  isOpen: boolean;
  onClose: () => void;
}

type Bias = 'STRONG_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONG_NEGATIVE';
type AnalysisTimeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

interface Indicator {
  name: string;
  value: number;
  action: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export const TechAnalysisModal: React.FC<Props> = ({ coin, isOpen, onClose }) => {
  const [timeframe, setTimeframe] = useState<AnalysisTimeframe>('1D');
  const [summary, setSummary] = useState<Bias>('NEUTRAL');
  const [score, setScore] = useState(50); // 0 to 100
  const [oscillators, setOscillators] = useState<Indicator[]>([]);
  const [movingAverages, setMovingAverages] = useState<Indicator[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DETAILS'>('OVERVIEW');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateAnalysis();
    }
  }, [isOpen, coin, timeframe]);

  const generateAnalysis = () => {
    setLoading(true);

    // The modal has no OHLC history, so keep the calculation deterministic and
    // label it as an educational estimate instead of presenting a prediction.
    const timeframeScale: Record<AnalysisTimeframe, number> = {
      '1M': 0.25,
      '5M': 0.4,
      '15M': 0.6,
      '1H': 0.8,
      '4H': 1,
      '1D': 1.25,
    };
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const trend = coin.price_change_percentage_24h * timeframeScale[timeframe];
    const rsiVal = clamp(50 + trend * 4, 20, 80);
    const macdVal = trend * 10;
    const stochVal = clamp(50 + trend * 3, 10, 90);
    const cciVal = clamp(trend * 50, -200, 200);
    const direction = (value: number, neutralBand = 0.15): Indicator['action'] => (
      value > neutralBand ? 'POSITIVE' : value < -neutralBand ? 'NEGATIVE' : 'NEUTRAL'
    );

    const newOscillators: Indicator[] = [
      { name: 'Momentum proxy', value: rsiVal, action: direction(rsiVal - 50, 2) },
      { name: 'Range proxy', value: stochVal, action: direction(stochVal - 50, 2) },
      { name: 'Deviation proxy', value: cciVal, action: direction(cciVal, 10) },
      { name: 'Change proxy', value: macdVal, action: direction(macdVal, 0.5) },
      { name: '24h momentum', value: trend * 5, action: direction(trend, 0.15) }
    ];

    const newMAs: Indicator[] = [
      { name: 'Short trend proxy', value: coin.current_price * (1 - trend / 100 * 0.2), action: direction(trend, 0.15) },
      { name: 'Medium trend proxy', value: coin.current_price * (1 - trend / 100 * 0.35), action: direction(trend, 0.15) },
      { name: 'Long trend proxy', value: coin.current_price * (1 - trend / 100 * 0.55), action: direction(trend, 0.15) },
      { name: 'Range anchor proxy', value: coin.current_price * (1 - trend / 100 * 0.8), action: direction(trend, 0.15) },
      { name: 'Current price anchor', value: coin.current_price, action: 'NEUTRAL' }
    ];

    setOscillators(newOscillators);
    setMovingAverages(newMAs);

    // Calculate Score 0-100
    const allIndicators = [...newOscillators, ...newMAs];
    const positiveCount = allIndicators.filter(i => i.action === 'POSITIVE').length;
    const neutralCount = allIndicators.filter(i => i.action === 'NEUTRAL').length;

    const total = allIndicators.length;
    // Score describes how consistently the available metrics move in one direction.
    const rawScore = ((positiveCount * 1) + (neutralCount * 0.5)) / total;
    const finalScore = Math.round(rawScore * 100);

    setScore(finalScore);

    if (finalScore >= 80) setSummary('STRONG_POSITIVE');
    else if (finalScore >= 60) setSummary('POSITIVE');
    else if (finalScore <= 20) setSummary('STRONG_NEGATIVE');
    else if (finalScore <= 40) setSummary('NEGATIVE');
    else setSummary('NEUTRAL');

    setLoading(false);
  };

  if (!isOpen) return null;

  const getBiasColor = (bias: string) => {
    if (bias.includes('POSITIVE')) return 'text-green-400';
    if (bias.includes('NEGATIVE')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getBiasBg = (bias: string) => {
    if (bias.includes('POSITIVE')) return 'bg-green-500/10 border-green-500/50';
    if (bias.includes('NEGATIVE')) return 'bg-red-500/10 border-red-500/50';
    return 'bg-gray-800 border-gray-700';
  };

  const getBiasLabel = (bias: string) => ({
    STRONG_POSITIVE: 'СИЛЬНАЯ ПОЛОЖИТЕЛЬНАЯ ДИНАМИКА',
    POSITIVE: 'ПОЛОЖИТЕЛЬНАЯ ДИНАМИКА',
    NEUTRAL: 'СМЕШАННАЯ ДИНАМИКА',
    NEGATIVE: 'ОТРИЦАТЕЛЬНАЯ ДИНАМИКА',
    STRONG_NEGATIVE: 'СИЛЬНАЯ ОТРИЦАТЕЛЬНАЯ ДИНАМИКА',
  } as Record<string, string>)[bias] ?? 'СМЕШАННАЯ ДИНАМИКА';

  // Gauge Rotation: 0 = -90deg, 100 = 90deg
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cyber-black/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-dark-card border border-gray-700 rounded-2xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
           <h2 className="text-xl font-bold flex items-center gap-2 text-white">
             <Activity className="w-5 h-5 text-brand-500" /> Индикаторный обзор
           </h2>
           <button onClick={onClose} aria-label="Закрыть обзор метрик" className="text-gray-400 hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="border-b border-gray-800 bg-brand-500/5 px-6 py-3 text-xs leading-5 text-gray-400">
          Учебный расчёт на основе доступной цены и изменения за 24 часа. Это не прогноз и
          не инструкция к действию.
        </div>

        {/* Timeframe Selector */}
        <div className="px-6 py-3 border-b border-gray-800 bg-cyber-black/20 flex gap-2 overflow-x-auto">
            {(['1M', '5M', '15M', '1H', '4H', '1D'] as AnalysisTimeframe[]).map((tf) => (
                <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    aria-pressed={timeframe === tf}
                    aria-label={`Показать обзор за ${tf}`}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 ease-soft whitespace-nowrap ${
                        timeframe === tf
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    {tf}
                </button>
            ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">

           {/* Gauge Section */}
           <div className="mb-8 relative flex flex-col items-center justify-center py-6 bg-gradient-to-b from-gray-800/30 to-transparent rounded-2xl border border-gray-800/50">
              {loading ? (
                  <div className="h-32 flex items-center text-brand-500"><Zap className="w-8 h-8 animate-spin" /></div>
              ) : (
                <>
                    <div className="relative w-48 sm:w-64 h-28 sm:h-32 overflow-hidden mb-4">
                        {/* Gauge Background Arcs */}
                        <div className="absolute bottom-0 left-0 w-full h-full rounded-t-full border-[20px] border-gray-800 border-b-0"></div>

                        {/* Colored Segments (CSS Conic Gradients are tricky for arcs, using simple absolute divs for segments simulation or SVG) */}
                        {/* Let's use SVG for cleaner gauge */}
                        <svg viewBox="0 0 200 100" className="absolute bottom-0 left-0 w-full h-full">
                            <path d="M 20 100 A 80 80 0 0 1 60 30" fill="none" stroke="#ef4444" strokeWidth="16" /> {/* Negative */}
                            <path d="M 60 30 A 80 80 0 0 1 140 30" fill="none" stroke="#eab308" strokeWidth="16" /> {/* Mixed */}
                            <path d="M 140 30 A 80 80 0 0 1 180 100" fill="none" stroke="#22c55e" strokeWidth="16" /> {/* Positive */}
                        </svg>

                        {/* Needle */}
                        <div
                            className="absolute bottom-0 left-1/2 w-1 h-[90%] bg-white origin-bottom transition-transform duration-1000 ease-out z-10 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                        ></div>

                        {/* Pivot */}
                        <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-gray-200 rounded-full -translate-x-1/2 translate-y-1/2 z-20"></div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-bold text-white mb-1 animate-fade-in">{score}</div>
                        <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block ${getBiasBg(summary)} ${getBiasColor(summary)}`}>
                            {getBiasLabel(summary)}
                        </div>
                    </div>
                </>
              )}
           </div>

            {/* Tabs */}
           <div className="flex border-b border-gray-800 mb-6">
                <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    aria-selected={activeTab === 'OVERVIEW'}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'OVERVIEW' ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Обзор
                    {activeTab === 'OVERVIEW' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('DETAILS')}
                    aria-selected={activeTab === 'DETAILS'}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'DETAILS' ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Детали
                    {activeTab === 'DETAILS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500"></div>}
                </button>
           </div>

           {/* Content based on Tab */}
           <div className="animate-fade-in">
                {activeTab === 'OVERVIEW' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                            <div className="text-gray-400 text-xs uppercase mb-2">Условные метрики</div>
                            <div className="flex items-end gap-2">
                                <span className="text-xl font-bold text-white">{oscillators.filter(i => i.action === 'POSITIVE').length}</span>
                                <span className="text-xs text-green-400 mb-1">ВЫШЕ НУЛЯ</span>
                            </div>
                        </div>
                        <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                             <div className="text-gray-400 text-xs uppercase mb-2">Сглаженные прокси</div>
                             <div className="flex items-end gap-2">
                                <span className="text-xl font-bold text-white">{movingAverages.filter(i => i.action === 'POSITIVE').length}</span>
                                <span className="text-xs text-green-400 mb-1">ВЫШЕ НУЛЯ</span>
                            </div>
                        </div>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        {/* Oscillators List */}
                        <div>
                            <h3 className="font-bold text-white mb-4 text-xs uppercase text-gray-500">Условные метрики</h3>
                            <div className="space-y-2">
                                {oscillators.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-800/30">
                                    <span className="text-gray-300">{item.name}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getBiasBg(item.action)} ${getBiasColor(item.action)}`}>
                                        {item.action === 'POSITIVE' ? 'ВЫШЕ НУЛЯ' : item.action === 'NEGATIVE' ? 'НИЖЕ НУЛЯ' : 'СМЕШАННО'}
                                    </span>
                                </div>
                                ))}
                            </div>
                        </div>

                        {/* MAs List */}
                        <div>
                            <h3 className="font-bold text-white mb-4 text-xs uppercase text-gray-500">Сглаженные прокси</h3>
                            <div className="space-y-2">
                                {movingAverages.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-800/30">
                                    <span className="text-gray-300">{item.name}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getBiasBg(item.action)} ${getBiasColor(item.action)}`}>
                                        {item.action === 'POSITIVE' ? 'ВЫШЕ НУЛЯ' : item.action === 'NEGATIVE' ? 'НИЖЕ НУЛЯ' : 'СМЕШАННО'}
                                    </span>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
           </div>

           <div className="mt-8 text-[10px] text-gray-600 text-center">
              Значения — учебная оценка по доступной цене и изменению за 24 часа для периода {timeframe};
              без исторического OHLC это не прогноз и не инвестиционная рекомендация.
           </div>

        </div>
      </div>
    </div>
  );
};

