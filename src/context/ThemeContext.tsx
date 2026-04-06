import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'cyberpunk' | 'midnight' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const STORAGE_KEY = 'cryptopulse-theme';
const THEMES: Theme[] = ['cyberpunk', 'midnight', 'light'];

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'cyberpunk',
  setTheme: () => {},
  cycleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.setAttribute('data-theme', theme);
  // Brief transition effect
  el.setAttribute('data-theme-transitioning', '');
  setTimeout(() => el.removeAttribute('data-theme-transitioning'), 400);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (THEMES.includes(stored as Theme) ? stored : 'cyberpunk') as Theme;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
