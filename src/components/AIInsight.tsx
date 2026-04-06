import React, { useState } from 'react';
import { generateCoinAnalysis, getActiveProvider } from '../services/aiService';
import { Bot, RefreshCw, Sparkles, Settings } from 'lucide-react';
import { CoinData, AI_MODELS } from '../types';

export const AIInsight: React.FC<{ coin: CoinData }> = ({ coin }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const { provider, model } = getActiveProvider();
  const providerName = AI_MODELS[provider]?.name || provider;

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateCoinAnalysis(coin.name, coin.current_price, coin.price_change_percentage_24h ?? 0);
    setAnalysis(result);
    setLoading(false);
    setGenerated(true);
  };

  return (
    <div className="cyber-card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyber-purple blur-[60px] opacity-20"></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2 text-cyber-purple">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold text-lg text-white">AI Аналитик</h3>
          <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {providerName} / {model}
          </span>
        </div>
        {!generated ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="cyber-button flex items-center gap-2 text-cyber-purple border-cyber-purple"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Анализ...' : 'Сгенерировать'}
          </button>
        ) : (
          <button onClick={handleGenerate} className="text-xs text-cyber-purple hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Обновить
          </button>
        )}
      </div>

      <div className="relative z-10 min-h-[80px]">
        {!generated && !loading && (
          <p className="text-gray-400 text-sm">
            AI анализ рынка для {coin.name}. Используется {providerName}.
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
