import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { cryptoService } from '../../services/cryptoService';
import { ErrorState } from '../../components/ErrorState';
import { Loader } from '../../components/Loader';

export const DashboardView = (): JSX.Element => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['coins', 'top20'],
    queryFn: () => cryptoService.getTopCoins(20),
    refetchInterval: 45_000,
  });

  if (isLoading) return <Loader />;
  if (isError || !data) return <ErrorState message="Не удалось загрузить рыночные данные." />;

  return (
    <div className="space-y-4">
      <div className="neon-card p-4">
        <h1 className="text-2xl font-semibold neon-title">Дашборд рынка — Топ 20</h1>
        <p className="text-sm text-cyan-200/70">Обновление каждые 45 секунд. Цвет показывает волатильность.</p>
      </div>
      <div className="grid gap-3">
        {data.map((coin) => (
          <article
            key={coin.id}
            className="neon-card grid grid-cols-2 items-center gap-3 p-3 text-sm md:grid-cols-6"
          >
            <div className="font-medium text-cyan-100">{coin.name}</div>
            <div className="text-indigo-200">${coin.current_price.toLocaleString()}</div>
            <div className={coin.price_change_percentage_24h >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {coin.price_change_percentage_24h.toFixed(2)}%
            </div>
            <div className="text-slate-300">${coin.market_cap.toLocaleString()}</div>
            <div className="text-slate-300">${coin.total_volume.toLocaleString()}</div>
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={coin.sparkline_in_7d.price.map((price, index) => ({ index, price }))}>
                  <Line type="monotone" dataKey="price" dot={false} stroke="#22d3ee" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
