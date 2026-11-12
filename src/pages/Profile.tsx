import React, { useEffect, useState } from 'react';
import { Award, BookOpen, FlaskConical, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserProfile, logoutUser } from '../services/userService';
import { AvatarDefault } from '../assets/icons';
import type { UserProfile } from '../types';
import { SettingsModal } from '../components/SettingsModal';

/** Research-first profile: paper research only, without deposits or live positions. */
export const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setUser(getUserProfile());
    const refresh = () => setUser(getUserProfile());
    window.addEventListener('userUpdated', refresh);
    return () => window.removeEventListener('userUpdated', refresh);
  }, []);

  if (!user) return <div className="py-20 text-center font-mono text-cyber-cyan animate-pulse">ЗАГРУЗКА ПРОФИЛЯ...</div>;

  const progress = Math.min(100, Math.round((user.xp % 1000) / 10));
  const memberYear = new Date(user.member_since).getFullYear();

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-20">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={() => setUser(getUserProfile())}
      />
      <header className="cyber-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyber-cyan/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-cyber-cyan/50 bg-cyber-black sm:h-24 sm:w-24">
              {user.avatar && !user.avatar.startsWith('avatar-') ? <img src={user.avatar} alt="Аватар профиля" className="h-full w-full object-cover" /> : <AvatarDefault size={72} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-black tracking-wide text-white sm:text-3xl">{user.name}</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              {user.id === 'demo-user' ? (
                <div className="mt-3 inline-flex items-center gap-2 border border-cyber-yellow/30 bg-cyber-yellow/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyber-yellow">
                  ЛОКАЛЬНЫЙ ДЕМО-ПРОФИЛЬ · СИНХРОНИЗАЦИЯ ВЫКЛЮЧЕНА
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 border border-cyber-green/30 bg-cyber-green/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyber-green">
                  ЛОКАЛЬНЫЙ ПРОФИЛЬ · СЕРВЕРНАЯ ИДЕНТИЧНОСТЬ НЕ ПОДКЛЮЧЕНА
                </div>
              )}
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-cyan/70">Исследователь с {memberYear} · уровень {user.level}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-start">
            <button type="button" onClick={() => setIsSettingsOpen(true)} className="cyber-button flex items-center justify-center gap-2 px-4 py-2 text-xs"><Settings className="h-4 w-4" /> НАСТРОЙКИ</button>
            <button type="button" onClick={logoutUser} className="cyber-button flex items-center justify-center gap-2 px-4 py-2 text-xs"><LogOut className="h-4 w-4" /> ВЫЙТИ</button>
          </div>
        </div>
        <div className="relative mt-6 max-w-xl">
          <div className="mb-1 flex justify-between font-mono text-[10px] text-gray-500"><span>ПРОГРЕСС ИССЛЕДОВАТЕЛЯ</span><span>{progress}%</span></div>
          <div className="h-1.5 border border-gray-800 bg-cyber-black"><div className="h-full bg-cyber-cyan" style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="cyber-card p-5"><div className="flex items-center gap-2 text-cyber-cyan"><FlaskConical className="h-4 w-4" /><span className="font-mono text-[10px] uppercase">Paper-исследования</span></div><div className="mt-3 font-display text-2xl font-bold text-white">{user.positions.length}</div><p className="mt-1 text-xs text-gray-500">Локальные сценарии, без реальных сделок</p></div>
        <div className="cyber-card p-5"><div className="flex items-center gap-2 text-cyber-yellow"><Award className="h-4 w-4" /><span className="font-mono text-[10px] uppercase">Достижения</span></div><div className="mt-3 font-display text-2xl font-bold text-white">{user.achievements.length}</div><p className="mt-1 text-xs text-gray-500">Прогресс обучения и проверки гипотез</p></div>
        <div className="cyber-card p-5"><div className="flex items-center gap-2 text-cyber-green"><ShieldCheck className="h-4 w-4" /><span className="font-mono text-[10px] uppercase">Режим</span></div><div className="mt-3 font-display text-2xl font-bold text-white">PAPER</div><p className="mt-1 text-xs text-gray-500">Live execution отключён в MVP</p></div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="cyber-card p-6">
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-cyber-cyan" /><h2 className="font-display text-lg font-bold text-white">Следующий шаг</h2></div>
          <p className="mt-3 text-sm leading-6 text-gray-400">Загрузите историю цен, настройте параметры и сохраните воспроизводимый отчёт в Strategy Lab.</p>
          <Link to="/strategy-lab" className="cyber-button mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs"><FlaskConical className="h-4 w-4" /> ОТКРЫТЬ STRATEGY LAB</Link>
        </div>
        <div className="cyber-card p-6">
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-cyber-yellow" /><h2 className="font-display text-lg font-bold text-white">Учебные материалы</h2></div>
          <p className="mt-3 text-sm leading-6 text-gray-400">Курсы и практические материалы находятся в Eclipse Library. Синхронизация прогресса с CryptoPulse пока не включена.</p>
          <a href="https://library.eclipse-forge.ru/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:border-cyber-yellow hover:text-cyber-yellow">ОТКРЫТЬ ECLIPSE LIBRARY</a>
        </div>
        <div className="cyber-card p-6">
          <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-cyber-cyan" /><h2 className="font-display text-lg font-bold text-white">Настройки и планы</h2></div>
          <p className="mt-3 text-sm leading-6 text-gray-400">Параметры интерфейса и будущие тарифы Research Lab находятся в отдельных разделах.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link to="/pricing" className="border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:border-cyber-cyan hover:text-cyber-cyan">ПЛАНЫ</Link><Link to="/favorites" className="border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:border-cyber-cyan hover:text-cyber-cyan">ИЗБРАННОЕ</Link></div>
        </div>
      </section>
    </div>
  );
};
