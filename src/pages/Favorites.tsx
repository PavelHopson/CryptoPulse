import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFavoriteCoins } from '../services/cryptoService';
import { CoinData } from '../types';
import { ArrowUpRight, ArrowDownRight, Star, ArrowLeft, AlertTriangle } from 'lucide-react';
import { CryptoIcon } from '../components/CryptoIcon';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TableRowSkeleton } from '../components/Skeleton';

const MiniChart = ({ data, isPositive }: { data: number[], isPositive: boolean }) => {
  const gradId = `fav${isPositive ? 'P' : 'N'}${Math.random().toString(36).slice(2, 6)}`;
  return (
    <div className="h-12 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ v, i }))}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? 'rgb(var(--color-success))' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="100%" stopColor={isPositive ? 'rgb(var(--color-success))' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={isPositive ? 'rgb(var(--color-success))' : '#ef4444'}
            strokeWidth={2}
            fill={`url(#${gradId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const Favorites: React.FC = () => {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem('favorites');
      const favIds = saved ? JSON.parse(saved) : [];
      setFavorites(favIds);

      if (favIds.length > 0) {
        const { data, error: apiError } = await fetchFavoriteCoins(favIds);
        setCoins(data);
        if (apiError) setError(apiError);
      } else {
        setCoins([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const removeFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const newFavs = favorites.filter(f => f !== id);
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
    setCoins(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Your Watchlist
      </h1>
      <div className="cyber-card rounded-2xl overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4 text-right">24h Change</th>
              <th className="px-6 py-4 text-right hidden md:table-cell">Market Cap</th>
              <th className="px-6 py-4 text-right hidden lg:table-cell">Last 7 Days</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => <TableRowSkeleton key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (coins.length === 0 && !error && favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="cyber-card p-5 rounded-full" style={{ borderColor: 'rgba(var(--color-accent), 0.2)' }}>
          <Star className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </div>
        <h2 className="text-2xl font-display font-bold text-white">Нет избранных</h2>
        <p className="max-w-md" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Добавьте монеты в избранное на дашборде, чтобы отслеживать их здесь.
        </p>
        <Link to="/" className="cyber-button px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> На Дашборд
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Your Watchlist
        </h1>
        <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {coins.length} asset{coins.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="border px-4 py-3 rounded-lg flex items-center gap-3"
          style={{ background: 'rgba(var(--color-warning), 0.08)', borderColor: 'rgba(var(--color-warning), 0.2)', color: 'rgb(var(--color-warning))' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="cyber-card rounded-2xl overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider border-b"
                style={{ color: 'rgb(var(--color-text-muted))', borderColor: 'rgba(var(--color-border), 0.5)', background: 'rgba(var(--color-surface), 0.5)' }}>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">24h Change</th>
                <th className="px-6 py-4 text-right hidden md:table-cell">Market Cap</th>
                <th className="px-6 py-4 text-right hidden lg:table-cell">Last 7 Days</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin) => (
                <tr key={coin.id} className="group transition-colors border-b"
                  style={{ borderColor: 'rgba(var(--color-border), 0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--color-accent), 0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-6 py-4">
                    <Link to={`/coin/${coin.id}`} className="flex items-center gap-3">
                      <CryptoIcon id={coin.id} size={36} fallbackUrl={coin.image} />
                      <div>
                        <div className="font-bold text-white transition-colors" style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}>
                          {coin.name}
                        </div>
                        <div className="text-xs font-mono uppercase" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {coin.symbol}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-white">
                    ${coin.current_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 font-mono font-medium ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono hidden md:table-cell" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    ${(coin.market_cap / 1e9).toFixed(2)}B
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex justify-end">
                      {coin.sparkline_in_7d && (
                        <MiniChart data={coin.sparkline_in_7d.price} isPositive={coin.price_change_percentage_24h >= 0} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => removeFavorite(e, coin.id)}
                      className="p-2 rounded-full transition-all text-yellow-400 hover:scale-110"
                      style={{ background: 'rgba(var(--color-warning), 0.1)' }}
                      title="Remove from favorites"
                    >
                      <Star className="w-5 h-5 fill-yellow-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
