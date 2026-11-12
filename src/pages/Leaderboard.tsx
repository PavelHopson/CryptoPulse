
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, FlaskConical, CheckCircle } from 'lucide-react';
import { TraderProfile } from '../types';
import { getPaperScenarios } from '../services/communityService';

export const Leaderboard: React.FC = () => {
  const [scenarios, setScenarios] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const data = await getPaperScenarios();
      setScenarios(data);
      setLoading(false);
    };
    load();
  }, []);

  const handlePaperScenario = (scenario: TraderProfile) => {
    setCopySuccess(scenario.id);
    navigate(`/strategy-lab?scenario=${encodeURIComponent(scenario.id)}&asset=${encodeURIComponent(scenario.topAsset)}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2">
             <Trophy className="w-8 h-8 text-yellow-400" /> Сравнение paper-сценариев
           </h1>
           <p className="text-gray-400">Фиксированные paper-сценарии для сравнения подходов. Это не реальные аккаунты и не прогноз будущего результата.</p>
           <div className="mt-3 inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300">
             SYNTHETIC DATA · PAPER ONLY
           </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && scenarios.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Rank 2 */}
          <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 flex flex-col items-center order-2 md:order-1 mt-0 md:mt-8 relative overflow-hidden">
             <div className="absolute top-0 w-full h-1 bg-gray-400"></div>
             <div className="text-4xl mb-2 filter drop-shadow-lg">{scenarios[1].avatar}</div>
             <div className="bg-gray-700 text-gray-300 text-xs font-bold px-2 py-0.5 rounded mb-2">#2 REFERENCE</div>
             <h3 className="font-bold text-lg text-white">{scenarios[1].name}</h3>
             <div className="text-cyber-cyan font-bold text-xl mt-2">Δ к базе {scenarios[1].profitPercent > 0 ? '+' : ''}{scenarios[1].profitPercent}%</div>
             <div className="text-xs text-gray-500 mt-4 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> фиксированная симуляция</div>
             <button 
                onClick={() => handlePaperScenario(scenarios[1])}
                className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
             >
               {copySuccess === scenarios[1].id ? 'Исследование открыто' : 'Открыть исследование'}
             </button>
          </div>

          {/* Rank 1 */}
          <div className="bg-dark-card border border-brand-500/50 rounded-2xl p-6 flex flex-col items-center order-1 md:order-2 shadow-xl shadow-brand-500/10 relative overflow-hidden transform md:-translate-y-4">
             <div className="absolute top-0 w-full h-1 bg-yellow-400"></div>
             <div className="text-6xl mb-2 filter drop-shadow-lg">{scenarios[0].avatar}</div>
             <div className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-2 shadow-lg">#1 РЕФЕРЕНС</div>
             <h3 className="font-bold text-xl text-white">{scenarios[0].name}</h3>
             <div className="text-cyber-cyan font-bold text-3xl mt-2">Δ к базе {scenarios[0].profitPercent > 0 ? '+' : ''}{scenarios[0].profitPercent}%</div>
             <div className="text-sm text-gray-400 mt-1">Периоды выше базы: {scenarios[0].winRate}%</div>
             <button 
                onClick={() => handlePaperScenario(scenarios[0])}
                className="mt-6 w-full py-3 bg-brand-600 hover:bg-brand-500 rounded-xl text-sm font-bold text-white [transition:background-color_.2s_var(--ease),box-shadow_.2s_var(--ease),transform_.2s_var(--ease-spring)] hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2"
             >
               {copySuccess === scenarios[0].id ? <CheckCircle className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
               {copySuccess === scenarios[0].id ? 'Исследование открыто' : 'Открыть paper-исследование'}
             </button>
          </div>

          {/* Rank 3 */}
          <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 flex flex-col items-center order-3 mt-0 md:mt-12 relative overflow-hidden">
             <div className="absolute top-0 w-full h-1 bg-orange-700"></div>
             <div className="text-4xl mb-2 filter drop-shadow-lg">{scenarios[2].avatar}</div>
             <div className="bg-orange-900 text-orange-200 text-xs font-bold px-2 py-0.5 rounded mb-2">#3 REFERENCE</div>
             <h3 className="font-bold text-lg text-white">{scenarios[2].name}</h3>
             <div className="text-cyber-cyan font-bold text-xl mt-2">Δ к базе {scenarios[2].profitPercent > 0 ? '+' : ''}{scenarios[2].profitPercent}%</div>
             <div className="text-xs text-gray-500 mt-4 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> фиксированная симуляция</div>
             <button 
                onClick={() => handlePaperScenario(scenarios[2])}
                className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
             >
                {copySuccess === scenarios[2].id ? 'Исследование открыто' : 'Открыть исследование'}
             </button>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
           <h2 className="font-bold text-white">Примеры результатов симуляции</h2>
        </div>
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-500">Загружаем paper-сценарии…</div>
        ) : scenarios.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-500">Пока нет доступных сценариев для сравнения.</div>
        ) : <div className="overflow-x-auto">
          <table className="w-full">
             <thead className="bg-gray-900/50">
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Ранг</th>
                  <th className="px-6 py-4">Сценарий</th>
                  <th className="px-6 py-4 text-right">Отклонение к базе · paper</th>
                  <th className="px-6 py-4 text-right hidden md:table-cell">Периоды выше базы</th>
                  <th className="px-6 py-4 text-right hidden lg:table-cell">Актив для проверки</th>
                  <th className="px-6 py-4 text-center">Действие</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-800">
                {scenarios.slice(3).map(scenario => (
                   <tr key={scenario.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-medium">#{scenario.rank}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
                         <span className="text-xl">{scenario.avatar}</span>
                         <div>
                            <div className="font-bold text-white">{scenario.name}</div>
                            <div className="text-xs text-gray-500">Фиксированный paper-набор</div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className={`font-bold ${scenario.profitPercent >= 0 ? 'text-cyber-cyan' : 'text-cyber-pink'}`}>
                           Δ {scenario.profitPercent > 0 ? '+' : ''}{scenario.profitPercent}%
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right hidden md:table-cell text-gray-300">
                         {scenario.winRate}%
                      </td>
                       <td className="px-6 py-4 text-right hidden lg:table-cell">
                         <span className="bg-gray-800 text-xs px-2 py-1 rounded font-mono">{scenario.topAsset}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button 
                           onClick={() => handlePaperScenario(scenario)}
                           className="text-brand-400 hover:text-white text-sm font-medium transition-colors"
                         >
                            Открыть исследование
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>}
        <p className="border-t border-gray-800 px-6 py-4 text-xs leading-5 text-gray-500">Метрики относятся к фиксированной симуляции и не являются прогнозом. Откройте исследование и повторите его в Strategy Lab на собственном CSV.</p>
      </div>
    </div>
  );
};
