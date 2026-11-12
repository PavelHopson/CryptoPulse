import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart2, Bell, User, Star, TrendingUp, DollarSign, Shield, LogIn, Check, X, Info, CheckCircle, AlertTriangle, Trophy, CreditCard, Megaphone, ArrowLeftRight, LogOut, Cpu, Globe, Zap, Moon, Sun, Monitor, FlaskConical } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { UserProfile } from '../types';
import { getSystemConfig } from '../services/adminService';
import { useTheme, type Theme } from '../context/ThemeContext';
import { AvatarDefault } from '../assets/icons';

const THEME_META: Record<Theme, { icon: React.ReactNode; label: string }> = {
  cyberpunk: { icon: <Monitor className="w-4 h-4" />, label: 'CYBER' },
  midnight: { icon: <Moon className="w-4 h-4" />, label: 'NIGHT' },
  light: { icon: <Sun className="w-4 h-4" />, label: 'LIGHT' },
};

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const themes: Theme[] = ['cyberpunk', 'midnight', 'light'];

  useEffect(() => {
    if (!open) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('button');
    firstItem?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 px-3 py-1.5 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono hover:bg-cyber-cyan/10 transition-colors duration-200 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black"
        title="Switch theme"
      >
        {THEME_META[theme].icon}
        <span className="hidden xl:inline">{THEME_META[theme].label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={menuRef} role="menu" aria-label="Выбор темы" className="absolute top-full right-0 mt-2 w-44 border border-gray-700 bg-dark-card shadow-xl z-50 overflow-hidden rounded-lg">
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t); setOpen(false); }}
                aria-pressed={theme === t}
                role="menuitemradio"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyber-cyan ${
                  theme === t
                    ? 'bg-cyber-cyan/15 text-cyber-cyan'
                    : 'text-gray-400 hover:bg-cyber-cyan/5 hover:text-cyber-cyan'
                }`}
              >
                {THEME_META[t].icon}
                <span className="uppercase">{t === 'cyberpunk' ? 'Cyberpunk' : t === 'midnight' ? 'Midnight' : 'Light'}</span>
                {theme === t && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [globalAlert, setGlobalAlert] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'ИССЛЕДОВАНИЕ ГОТОВО К ПРОВЕРКЕ', time: '02:14', read: false, type: 'alert' },
    { id: 2, title: 'ОБНОВЛЁН ИСТОЧНИК ДАННЫХ', time: '11:05', read: false, type: 'success' },
  ]);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const updateProfile = () => {
    const profile = getUserProfile();
    setUser(profile);
    const config = getSystemConfig();
    setGlobalAlert(config.globalAlert);
  };

  useEffect(() => {
    updateProfile();
    const interval = setInterval(updateProfile, 5000);
    window.addEventListener('balanceChanged', updateProfile);
    window.addEventListener('userUpdated', updateProfile);
    return () => {
      clearInterval(interval);
      window.removeEventListener('balanceChanged', updateProfile);
      window.removeEventListener('userUpdated', updateProfile);
    };
  }, []);

  useEffect(() => setIsNotifOpen(false), [location]);

  useEffect(() => {
    if (!isNotifOpen) return;
    const initialFocus = notifPanelRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]');
    initialFocus?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsNotifOpen(false);
        notifTriggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab' && notifPanelRef.current) {
        const focusable = Array.from(notifPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotifOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotification = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Cyberpunk Active State
  const isActive = (path: string) => location.pathname === path 
    ? 'text-cyber-cyan border-b-2 border-cyber-cyan shadow-[0_0_10px_rgba(0,243,255,0.4)] bg-cyber-cyan/10' 
    : 'text-gray-500 hover:text-cyber-cyan hover:bg-cyber-cyan/5';

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 pb-24 md:pb-0 flex flex-col font-sans overflow-hidden relative">
      
      {/* Background Grid Effect */}
      <div className="fixed inset-0 bg-cyber-grid bg-[length:40px_40px] pointer-events-none z-0" style={{ opacity: 'var(--grid-opacity)' }}></div>

      {/* GLOBAL ALERT */}
      {globalAlert && (
        <div className="bg-cyber-pink/20 border-b border-cyber-pink text-cyber-pink px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2 relative z-[60] tracking-widest uppercase font-mono animate-pulse">
            <Megaphone className="w-3 h-3" />
            СИСТЕМНОЕ ОПОВЕЩЕНИЕ: {globalAlert}
        </div>
      )}

      {/* TOP NAV - CYBER HUD */}
      <nav className="sticky top-0 z-50 border-b border-cyber-cyan/20 bg-cyber-black/80 backdrop-blur-md hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 items-center justify-between gap-3">
            
            {/* LOGO */}
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Link to="/" className="flex shrink-0 items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyber-cyan blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-cyber-black border border-cyber-cyan p-2 rounded-none relative z-10">
                    <Cpu className="w-6 h-6 text-cyber-cyan" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-display font-black italic tracking-tighter text-white group-hover:text-cyber-cyan transition-colors">
                    CRYPTO<span className="text-cyber-cyan">PULSE</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyber-cyan/60 tracking-[0.2em] leading-none">RESEARCH LAB</span>
                </div>
              </Link>
              
              {/* DESKTOP MENU */}
              <div className="scrollbar-hide hidden min-w-0 flex-1 items-center space-x-1 overflow-x-auto font-display tracking-wider text-sm md:flex">
                {[
                  { path: '/', label: 'КРИПТО' },
                  { path: '/forex', label: 'ФОРЕКС' },
                  { path: '/futures', label: 'ФЬЮЧЕРСЫ' },
                  { path: '/community', label: 'СООБЩЕСТВО' },
                  { path: '/compare', label: 'СРАВНЕНИЕ' },
                  { path: '/strategy-lab', label: 'STRATEGY LAB' },
                  { path: '/favorites', label: 'ИЗБРАННОЕ' }
                ].map(link => (
                  <Link key={link.path} to={link.path} className={`shrink-0 px-3 py-2 transition-[color,background-color,border-color,box-shadow] duration-300 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan focus-visible:ring-inset ${isActive(link.path)}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/pricing" className="hidden lg:flex items-center gap-2 px-3 py-1 border border-cyber-yellow/30 text-cyber-yellow text-xs font-mono hover:bg-cyber-yellow/10 transition-colors duration-200 ease-soft">
                  <Zap className="w-3 h-3" /> ПЛАНЫ
              </Link>

              <a
                href="https://library.eclipse-forge.ru/"
                target="_blank"
                rel="noreferrer"
                className="hidden xl:flex items-center gap-2 px-3 py-1 border border-cyber-cyan/20 text-cyber-cyan/80 text-xs font-mono hover:bg-cyber-cyan/10 hover:text-cyber-cyan transition-colors duration-200 ease-soft"
                title="Открыть учебные материалы Eclipse Library"
              >
                <Globe className="w-3 h-3" /> LIBRARY
              </a>

              <Link
                to="/strategy-lab"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono hover:bg-cyber-cyan/10 transition-colors duration-200 ease-soft"
                title="Открыть Strategy Lab"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="hidden xl:inline">LAB</span>
              </Link>

              {/* THEME TOGGLE */}
              <ThemeToggle />

              {/* NOTIFICATIONS */}
              <div className="relative">
                <button ref={notifTriggerRef} onClick={() => setIsNotifOpen(!isNotifOpen)} aria-expanded={isNotifOpen} aria-haspopup="dialog" aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : 'Открыть уведомления'} className={`relative p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan ${isNotifOpen ? 'text-cyber-cyan' : 'text-gray-500 hover:text-cyber-cyan'}`}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyber-pink animate-ping"></span>}
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyber-pink"></span>}
                </button>

                {isNotifOpen && (
                   <div ref={notifPanelRef} role="dialog" aria-modal="false" aria-labelledby="desktop-notifications-title" className="absolute top-full right-0 mt-4 w-72 sm:w-80 max-w-[90vw] bg-cyber-black border border-cyber-cyan/30 shadow-[0_0_20px_rgba(0,243,255,0.1)] z-50 origin-top-right animate-scale-in">
                      {/* Notif Content - styled appropriately */}
                      <div className="p-3 border-b border-cyber-cyan/20 flex justify-between items-center bg-cyber-cyan/5">
                          <h3 id="desktop-notifications-title" className="font-display text-cyber-cyan text-xs tracking-widest">СИСТЕМНЫЙ ЛОГ</h3>
                          <button data-dialog-initial-focus type="button" onClick={markAllRead} className="text-[10px] text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan">ПРОЧИТАТЬ ВСЕ</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                          {notifications.length === 0 && <p className="p-4 text-xs text-gray-500">Новых уведомлений нет.</p>}
                          {notifications.map(n => (
                              <div key={n.id} className={`p-3 border-b border-gray-800 hover:bg-cyber-cyan/5 transition-colors group ${!n.read ? 'border-l-2 border-l-cyber-pink pl-2.5' : ''}`}>
                                  <div className="flex justify-between items-start">
                                      <span className={`font-mono text-xs ${n.type === 'alert' ? 'text-cyber-yellow' : 'text-cyber-green'}`}>{n.title}</span>
                                      <button type="button" onClick={(e) => deleteNotification(e, n.id)} aria-label={`Удалить уведомление: ${n.title}`} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan">
                                        <X className="w-3 h-3 text-gray-600 hover:text-red-500" />
                                      </button>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono mt-1">{n.time}</div>
                              </div>
                          ))}
                      </div>
                   </div>
                )}
              </div>

              <div className="h-8 w-px bg-gray-800 mx-1 skew-x-12"></div>
              
              {/* PROFILE */}
              {user && user.id !== 'demo-user' ? (
                <Link to="/profile" className="flex items-center gap-3 pl-2 pr-4 py-1 group">
                  <div className="relative">
                     {user.avatar && user.avatar.startsWith('avatar-') ? (
                       <div className="w-9 h-9 overflow-hidden border border-gray-600 group-hover:border-cyber-cyan transition-colors" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)' }}>
                         <AvatarDefault size={36} />
                       </div>
                     ) : user.avatar ? (
                       <img src={user.avatar} alt={`Аватар ${user.name}`} className="w-9 h-9 object-cover border border-gray-600 group-hover:border-cyber-cyan transition-colors" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                     ) : (
                       <div className="w-9 h-9 bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan font-display border border-cyber-cyan" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)' }}>{user.name.charAt(0)}</div>
                     )}
                     <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyber-black border border-gray-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-cyber-green"></div>
                     </div>
                  </div>
                  <div className="text-right hidden xl:block">
                     <div className="font-display text-sm text-white group-hover:text-cyber-cyan transition-colors">{user.name}</div>
                     <div className="font-mono text-xs text-cyber-green tracking-wide">PAPER MODE</div>
                  </div>
                </Link>
              ) : (
                <Link to="/login" className="flex items-center gap-2 text-white hover:text-cyber-cyan transition-colors text-sm font-display tracking-wide">
                  <LogIn className="w-4 h-4" /> ВОЙТИ
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <div className="md:hidden sticky top-0 z-50 bg-cyber-black/90 backdrop-blur-lg border-b border-gray-800 px-4 h-16 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyber-cyan" />
            <span className="font-display font-bold text-lg tracking-wider text-white">CRYPTO<span className="text-cyber-cyan">PULSE</span></span>
         </div>
         <div className="flex items-center gap-3">
             <ThemeToggle />
             <button ref={notifTriggerRef} onClick={() => setIsNotifOpen(!isNotifOpen)} aria-expanded={isNotifOpen} aria-haspopup="dialog" aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : 'Открыть уведомления'} className="text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"><Bell className="w-5 h-5" /></button>
              <Link to={user ? '/profile' : '/login'} aria-label={user ? `Профиль ${user.name}` : 'Войти'} className="w-8 h-8 bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center text-cyber-cyan font-bold">{user ? user.name.charAt(0) : '?'}</Link>
         </div>
         {/* Mobile notification sheet */}
         {isNotifOpen && (
             <div ref={notifPanelRef} role="dialog" aria-modal="true" aria-labelledby="mobile-notifications-title" data-mobile-notifications className="fixed inset-0 z-50 bg-cyber-black/95 flex flex-col animate-fade-in">
                 <div className="p-4 border-b border-gray-800 flex justify-between">
                     <h2 id="mobile-notifications-title" className="font-mono text-cyber-cyan">УВЕДОМЛЕНИЯ</h2>
                     <button data-dialog-initial-focus type="button" onClick={() => { setIsNotifOpen(false); notifTriggerRef.current?.focus(); }} aria-label="Закрыть уведомления" className="text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"><X /></button>
                 </div>
                 <div className="p-4 space-y-4">
                    {notifications.length === 0 && <p className="text-sm text-gray-500">Новых уведомлений нет.</p>}
                    {notifications.map(n => (
                        <div key={n.id} className="bg-gray-900 border border-gray-800 p-3">
                            <div className="font-bold text-white">{n.title}</div>
                            <div className="mt-1 text-xs text-gray-500">{n.time}</div>
                        </div>
                    ))}
                 </div>
             </div>
         )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full relative z-10">
        <div key={location.key} className="view-enter">
          {children}
        </div>
      </main>

      
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-cyber-black/95 backdrop-blur-md border-t border-cyber-cyan/20 z-50 pb-safe">
        <div className="flex justify-around items-center h-16 font-display text-[10px]">
          <Link to="/" className={`flex flex-col items-center gap-1 w-16 ${isActive('/') ? 'text-cyber-cyan' : 'text-gray-500'}`}>
             <BarChart2 className="w-5 h-5" /> КРИПТО
          </Link>
          <Link to="/community" className={`flex flex-col items-center gap-1 w-16 ${isActive('/community') ? 'text-cyber-cyan' : 'text-gray-500'}`}>
             <Trophy className="w-5 h-5" /> СЦЕН.
          </Link>
          
           <Link to={user && user.id !== 'demo-user' ? "/profile" : "/login"} className="relative -top-6">
             <div className="w-14 h-14 bg-cyber-black border-2 border-cyber-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.3)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
               <User className="w-6 h-6 text-white" />
             </div>
           </Link>

           <Link to="/strategy-lab" className={`flex flex-col items-center gap-1 w-16 ${isActive('/strategy-lab') ? 'text-cyber-cyan' : 'text-gray-500'}`}>
             <FlaskConical className="w-5 h-5" /> ЛАБ.
          </Link>
           <Link to="/favorites" className={`flex flex-col items-center gap-1 w-16 ${isActive('/favorites') ? 'text-cyber-cyan' : 'text-gray-500'}`}>
             <Star className="w-5 h-5" /> ИЗБР.
          </Link>
        </div>
      </div>
    </div>
  );
};
