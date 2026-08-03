import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import { initializeUserSecurity } from './services/userService';
import './styles.css';

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

async function bootstrap(): Promise<void> {
  await initializeUserSecurity();
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
}

void bootstrap().catch(() => {
  rootElement.textContent = 'Не удалось безопасно открыть локальный профиль. Очистите данные сайта и попробуйте снова.';
});
