import { Link, NavLink, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

const navItems = [
  { to: '/', label: 'Market Grid' },
  { to: '/favorites', label: 'Signal Vault' },
  { to: '/comparison', label: 'Compare Core' },
  { to: '/portfolio', label: 'Portfolio OS' },
  { to: '/pricing', label: 'Upgrades' },
  { to: '/billing', label: 'Billing' },
];

export const AppLayout = (): JSX.Element => {
  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-20 border-b border-cyan-400/20 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link to="/" className="text-lg font-bold tracking-wide neon-title">
            CRYPTOPULSE // 2077
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full border px-3 py-1 transition ${
                    isActive
                      ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                      : 'border-slate-700/80 bg-slate-900/40 text-slate-300 hover:border-fuchsia-400/60 hover:text-fuchsia-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => void authService.signOut()}
              className="rounded-full border border-rose-400/50 bg-rose-500/10 px-3 py-1 text-rose-300 transition hover:bg-rose-500/20"
            >
              Disconnect
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="grid-overlay rounded-2xl border border-slate-800/80 bg-slate-950/45 p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
