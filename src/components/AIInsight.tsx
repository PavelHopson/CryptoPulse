import React, { useState } from 'react';
import { generateCoinAnalysis, getActiveProvider } from '../services/aiService';
import { Bot, RefreshCw, Sparkles, Settings } from 'lucide-react';
import { CoinData, AI_MODELS } from '../types';

export const AIInsight: React.FC<{ coin: CoinData }> = ({ coin }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');
  const { provider, model } = getActiveProvider();
  const providerName = AI_MODELS[provider]?.name || provider;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    const result = await generateCoinAnalysis(coin.name, coin.current_price, coin.price_change_percentage_24h ?? 0);
    const isError = /^(Ошибка AI:|AI не настроен\.|Провайдер .* не поддерживается\.)/.test(result);
    if (isError) {
      setAnalysis('');
      setGenerated(false);
      setError(result);
    } else {
      setAnalysis(result);
      setGenerated(true);
    }
    setLoading(false);
  };

  return (
    <div className="cyber-card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyber-purple blur-[60px] opacity-20"></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2 text-cyber-purple">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold text-lg text-white">AI Research</h3>
          <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {providerName} / {model}
          </span>
        </div>
        {!generated ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            aria-label={loading ? 'Генерация AI-анализа' : 'Сгенерировать AI-анализ'}
            className="cyber-button flex items-center gap-2 text-cyber-purple border-cyber-purple"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Анализ...' : 'Сгенерировать'}
          </button>
        ) : (
          <button onClick={handleGenerate} className="text-xs text-cyber-purple hover:text-white flex items-center gap-1" aria-label="Обновить AI-анализ">
            <RefreshCw className="w-3 h-3" /> Обновить
          </button>
        )}
      </div>

      <div className="relative z-10 min-h-[80px]">
        <p className="mb-3 text-[11px] leading-5 text-gray-500">
          Исследовательская гипотеза по доступным данным; не торговый сигнал и не рекомендация.
        </p>
        {error && !loading && (
          <div role="alert" className="flex items-start justify-between gap-3 border border-cyber-pink/30 bg-cyber-pink/5 p-3 text-sm text-gray-300">
            <span>{error}</span>
            <button type="button" onClick={handleGenerate} className="shrink-0 text-xs text-cyber-purple hover:text-white" aria-label="Повторить AI-анализ">
              Повторить
            </button>
          </div>
        )}
        {!generated && !loading && !error && (
          <p className="text-gray-400 text-sm">
            Исследовательский разбор рынка для {coin.name}. Используется {providerName}.
            {provider === 'gemini' && !getActiveProvider().model && ' Настройте AI в профиле для лучших результатов.'}
          </p>
        )}
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-cyber-purple/20 rounded w-3/4"></div>
            <div className="h-3 bg-cyber-purple/20 rounded w-full"></div>
            <div className="h-3 bg-cyber-purple/20 rounded w-5/6"></div>
          </div>
        )}
        {analysis && !loading && (
          <p className="text-gray-200 leading-relaxed text-sm">{analysis}</p>
        )}
      </div>
    </div>
  );
};
