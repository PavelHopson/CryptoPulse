import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMarketData } from '../services/cryptoService';
import { fetchMarketNewsWithStatus, getProjectNews } from '../services/newsService';
import type { NewsSource, NewsStatus } from '../services/newsService';
import { CoinData, AssetCategory, NewsArticle } from '../types';
import type { DataStatus } from '../services/cryptoService';
import { ArrowUpRight, ArrowDownRight, Star, Activity, Globe, Bell, ExternalLink, Shield, RefreshCw } from 'lucide-react';
import { CryptoIcon } from '../components/CryptoIcon';
import { TableRowSkeleton, NewsSkeleton, MarketNewsSkeleton, CardSkeleton } from '../components/Skeleton';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const MiniChart = ({ data, isPositive }: { data: number[], isPositive: boolean }) => (
  <div className="h-12 w-24 filter drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.map((p, i) => ({ v: p, i }))}>
        <defs>
           <linearGradient id={`grad${isPositive ? 'Pos' : 'Neg'}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={isPositive ? '#00ff9d' : '#ff00aa'} stopOpacity={0.4} />
             <stop offset="100%" stopColor={isPositive ? '#00ff9d' : '#ff00aa'} stopOpacity={0} />
           </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="v" 
          stroke={isPositive ? '#00ff9d' : '#ff00aa'} 
          strokeWidth={2} 
          fill={`url(#grad${isPositive ? 'Pos' : 'Neg'})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

interface MarketPageProps {
  category: AssetCategory;
  title: string;
  subtitle: string;
}

export const MarketPage: React.FC<MarketPageProps> = ({ category, title, subtitle }) => {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([]);
  const [projectNews, setProjectNews] = useState<NewsArticle[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [newsStatus, setNewsStatus] = useState<NewsStatus | null>(null);
  const [newsSource, setNewsSource] = useState<NewsSource | null>(null);
  const [newsCheckedAt, setNewsCheckedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    const load = async () => {
      try {
        const [marketResponse, newsResponse] = await Promise.all([
          fetchMarketData(category),
          fetchMarketNewsWithStatus(),
        ]);
        setCoins(marketResponse.data);
        setDataStatus(marketResponse.status);
        setCheckedAt(marketResponse.checkedAt);
        setMarketNews(newsResponse.data.slice(0, 4));
        setNewsStatus(newsResponse.status);
        setNewsSource(newsResponse.source);
        setNewsCheckedAt(newsResponse.checkedAt);
        setProjectNews(getProjectNews());
      } catch (error) {
        setCoins([]);
        setMarketNews([]);
        setProjectNews([]);
        setDataStatus(null);
        setNewsStatus(null);
        setNewsSource(null);
        setLoadError('Не удалось загрузить исследовательские данные. Повторите попытку.');
      } finally {
        setLoading(false);
      }
    };
    load();
    try {
      const saved = localStorage.getItem('favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFavorites(parsed.filter((id): id is string => typeof id === 'string'));
      }
    } catch {
      setFavorites([]);
    }
  }, [category, retryNonce]);

  const sourceLabel = dataStatus === 'LIVE'
    ? { label: 'LIVE', detail: 'Данные получены от провайдера', tone: 'text-cyber-green border-cyber-green/30 bg-cyber-green/5' }
    : dataStatus === 'CACHED'
      ? { label: 'CACHED', detail: 'Показан ранее проверенный набор данных', tone: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5' }
      : dataStatus === 'RETRY'
        ? { label: 'RETRY / DEMO', detail: 'Провайдер недоступен, показан демонстрационный набор', tone: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5' }
        : dataStatus === 'UNAVAILABLE'
          ? { label: 'UNAVAILABLE / DEMO', detail: 'Провайдер вернул ошибку, показан демонстрационный набор', tone: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5' }
        : dataStatus === 'MIXED'
          ? { label: 'MIXED SOURCES', detail: 'Крипто-данные получены от провайдера, остальные ряды демонстрационные', tone: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5' }
        : dataStatus === 'MOCK'
          ? { label: 'DEMO DATA', detail: 'Демонстрационный набор для этого раздела', tone: 'text-gray-300 border-gray-700 bg-gray-800/40' }
          : { label: 'CHECKING', detail: 'Проверяем источник данных', tone: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5' };

  const newsLabel = newsStatus === 'LIVE'
    ? { label: newsSource === 'rss' ? 'LIVE · RSS' : 'LIVE · WORKER', detail: 'Публикации получены от внешнего источника', tone: 'text-cyber-green border-cyber-green/30 bg-cyber-green/5' }
    : newsStatus === 'RETRY'
      ? { label: 'RSS FALLBACK', detail: 'Worker недоступен, показан резервный источник', tone: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5' }
      : newsStatus === 'UNAVAILABLE'
        ? { label: 'UNAVAILABLE / DEMO', detail: 'Провайдеры недоступны, показан демонстрационный набор', tone: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5' }
        : newsStatus === 'MOCK'
          ? { label: 'DEMO NEWS', detail: 'Демонстрационные публикации', tone: 'text-gray-300 border-gray-700 bg-gray-800/40' }
          : { label: 'CHECKING', detail: 'Проверяем источник новостей', tone: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5' };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    try {
      localStorage.setItem('favorites', JSON.stringify(newFavs));
    } catch {
      // The local preference is optional when browser storage is unavailable.
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {loadError && (
        <div role="alert" className="flex flex-col gap-3 border border-cyber-pink/30 bg-cyber-pink/5 p-4 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="cyber-button inline-flex items-center justify-center gap-2 px-3 py-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> ПОВТОРИТЬ
          </button>
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
           <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white mb-1 tracking-wide uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
             {title}
           </h1>
           <div className="flex items-center gap-2 text-cyber-cyan font-mono text-sm">
             <Activity className="w-4 h-4" />
             <span className="tracking-widest">РЕЖИМ ИССЛЕДОВАНИЯ :: {subtitle}</span>
           </div>
        </div>
        <div className="font-mono text-xs text-gray-500 border border-gray-800 px-3 py-1 bg-cyber-black/50">
           ДИНАМИКА: <span className="text-cyber-yellow">{dataStatus === 'LIVE' ? 'ПО ПРОВАЙДЕРУ' : dataStatus === 'MIXED' ? 'СМЕШАННЫЕ ИСТОЧНИКИ' : dataStatus ? 'НЕ ОПРЕДЕЛЯЕТСЯ' : 'ПРОВЕРЯЕМ'}</span>
        </div>
      </div>

      {/* Top Section: News Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project News (Neon Card) */}
        <div className="cyber-card p-6">
          <div className="flex items-center gap-2 mb-4 text-cyber-pink border-b border-gray-800 pb-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-display font-bold text-lg tracking-wider">ОБНОВЛЕНИЯ</h2>
          </div>
          <div className="space-y-4">
             {loading ? (
               Array.from({ length: 3 }).map((_, i) => <NewsSkeleton key={i} />)
             ) : projectNews.length > 0 ? (
               projectNews.map(news => (
                 <div key={news.id} className="flex gap-3 group">
                   <div className="w-12 h-12 bg-gray-900 border border-gray-700 flex-shrink-0 overflow-hidden grayscale group-hover:grayscale-0 transition-[filter] duration-300 ease-soft">
                      <img src={news.imageUrl} alt={news.title} loading="lazy" className="w-full h-full object-cover" />
                   </div>
                   <div>
                      <h3 className="text-sm font-bold text-gray-200 group-hover:text-cyber-pink transition-colors leading-tight font-sans">{news.title}</h3>
                      <span className="text-[10px] text-gray-500 font-mono block mt-1">{news.publishedAt}</span>
                   </div>
                 </div>
               ))
             ) : (
               <div className="border border-dashed border-gray-700 p-3 text-sm leading-5 text-gray-400">
                 Пока нет обновлений проекта. Проверьте ленту рынка или повторите загрузку.
               </div>
             )}
          </div>
        </div>

        {/* Market Feed */}
        <div className="lg:col-span-2 cyber-card p-6">
           <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2 text-cyber-cyan">
                 <Globe className="w-5 h-5" />
                 <h2 className="font-display font-bold text-lg tracking-wider">ГЛОБАЛЬНАЯ ЛЕНТА</h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`rounded-full border px-2 py-1 text-[10px] font-mono ${newsLabel.tone}`}>● {newsLabel.label}</span>
                {newsCheckedAt && <span className="text-[10px] font-mono text-gray-600">{new Date(newsCheckedAt).toLocaleTimeString('ru-RU')}</span>}
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <MarketNewsSkeleton key={i} />)
              ) : marketNews.length > 0 ? (
                marketNews.map(news => (
                   <a href={news.url} target="_blank" rel="noopener noreferrer" key={news.id} className="block bg-cyber-black/40 border border-gray-800 hover:border-cyber-cyan/50 p-3 transition-colors duration-200 ease-soft group">
                      <div className="flex justify-between items-start gap-2">
                         <h3 className="text-sm font-medium text-gray-300 group-hover:text-cyber-cyan transition-colors line-clamp-2">{news.title}</h3>
                         <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white flex-shrink-0" />
                      </div>
                      <div className="flex justify-between items-end mt-3">
                         <span className="text-[10px] text-cyber-purple font-mono uppercase">{news.source}</span>
                         <span className="text-[10px] text-gray-600 font-mono">{news.publishedAt}</span>
                      </div>
                   </a>
                ))
              ) : (
                <div className="md:col-span-2 border border-dashed border-gray-800 p-5 text-sm text-gray-500">
                  {newsLabel.detail}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-card p-5 flex items-center justify-between">
           <div>
              <h3 className="text-gray-500 font-mono text-xs uppercase mb-1">Источник</h3>
              <p className="text-lg font-display font-bold text-white tracking-wider">{sourceLabel.label}</p>
              <p className="mt-1 text-[11px] text-gray-500">{sourceLabel.detail}</p>
           </div>
           <Globe className="w-8 h-8 text-cyber-cyan opacity-50" />
        </div>
         <div className="cyber-card p-5 flex items-center justify-between">
           <div>
              <h3 className="text-gray-500 font-mono text-xs uppercase mb-1">Режим</h3>
              <p className="text-2xl font-display font-bold text-cyber-cyan tracking-wider">PAPER</p>
              <p className="mt-1 text-[11px] text-gray-500">Без реальных сделок</p>
           </div>
           <Shield className="w-8 h-8 text-cyber-cyan opacity-50" />
        </div>
         <Link to="/strategy-lab" className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-cyber-gradient blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-cyber-black border border-cyber-cyan p-5 flex flex-col items-center justify-center text-center h-full">
                <h3 className="text-white font-display font-bold text-lg mb-1">ПРОВЕРИТЬ ГИПОТЕЗУ</h3>
                <p className="text-cyber-cyan/60 text-xs font-mono">STRATEGY LAB // PAPER ONLY</p>
            </div>
        </Link>
      </div>

      {/* Main Asset Table */}
      <div className="cyber-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-cyber-black/40 flex justify-between items-center">
          <h2 className="font-display font-bold text-lg text-white tracking-wider">РЫНОЧНЫЕ ДАННЫЕ</h2>
          <div className="text-[10px] font-mono text-gray-500">ПРОВЕРЕНО: {checkedAt ? new Date(checkedAt).toLocaleTimeString('ru-RU') : '—'}</div>
        </div>
        
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-gray-900/50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Актив</th>
                  <th className="px-6 py-3 text-right">Цена</th>
                  <th className="px-6 py-3 text-right">24ч %</th>
                  <th className="px-6 py-3 text-right hidden md:table-cell">Диапазон</th>
                  <th className="px-6 py-3 text-right hidden lg:table-cell">Тренд</th>
                  <th className="px-6 py-3 text-center">Избр</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : coins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-gray-900/50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Актив</th>
                  <th className="px-6 py-3 text-right">Цена</th>
                  <th className="px-6 py-3 text-right">24ч %</th>
                  <th className="px-6 py-3 text-right hidden md:table-cell">Диапазон</th>
                  <th className="px-6 py-3 text-right hidden lg:table-cell">Тренд</th>
                  <th className="px-6 py-3 text-center">Избр</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {coins.map((coin) => (
                  <tr key={coin.id} className="hover:bg-cyber-cyan/5 transition-colors group">
                    <td className="px-6 py-4">
                       <Link to={`/coin/${coin.id}?cat=${category}`} className="flex items-center gap-3">
                        <CryptoIcon id={coin.id} size={32} fallbackUrl={coin.image} className="grayscale group-hover:grayscale-0 transition-[filter] duration-300 ease-soft" />
                        <div>
                          <div className="font-bold text-gray-200 group-hover:text-cyber-cyan font-display tracking-wide">{coin.symbol.toUpperCase()}</div>
                          <div className="text-xs text-gray-600">{coin.name}</div>
                        </div>
                       </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white tracking-wide">
                      {category === 'forex' ? '' : '$'}{(coin.current_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 ${(coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                        {(coin.price_change_percentage_24h ?? 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 hidden md:table-cell text-xs">
                      {(coin.low_24h ?? 0).toLocaleString()} / {(coin.high_24h ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                         {coin.sparkline_in_7d && (
                           <MiniChart data={coin.sparkline_in_7d.price} isPositive={coin.price_change_percentage_24h >= 0} />
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={(e) => toggleFavorite(e, coin.id)} aria-label={favorites.includes(coin.id) ? `Убрать ${coin.name} из избранного` : `Добавить ${coin.name} в избранное`} aria-pressed={favorites.includes(coin.id)} className={`hover:scale-110 transition-transform ${favorites.includes(coin.id) ? 'text-cyber-yellow' : 'text-gray-700'}`}>
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-gray-500">
            <p>Рыночных данных пока нет.</p>
            <button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="cyber-button inline-flex items-center gap-2 px-3 py-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> ПОВТОРИТЬ ЗАПРОС
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
