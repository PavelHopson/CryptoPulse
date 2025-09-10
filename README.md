# 🚀 CryptoPulse — ваш персональный крипто-дашборд

CryptoPulse — это современное web-приложение для мониторинга и анализа криптовалют.  
Создано с использованием **Vue 3 + TypeScript + Vite + Supabase**.  

## 🌟 Основные возможности
- 📊 Топ-20 монет с графиками и метриками.
- ❤️ Избранное и сравнение монет.
- 🔔 Уведомления о ценах (Pro+).
- 📈 Премиум-индикаторы: RSI, MACD (Pro+).
- 🔄 Синхронизация между устройствами через Supabase.
- 🌙 Тёмная/светлая тема.
- 🔑 Авторизация (email + OAuth).
- 📡 Realtime обновления.
- 🛡️ RLS (Row Level Security) в базе данных.

## 💎 Тарифы

| Тариф      | Free         | Pro ($9.99/мес) | Enterprise (от $99/мес) |
|------------|--------------|-----------------|--------------------------|
| Топ-20 монет | ✅ | ✅ | ✅ |
| Избранное | до 10 | до 100 | без ограничений |
| Сравнение | 2 монеты | 5 монет | без ограничений |
| Индикаторы (RSI, MACD) | ❌ | ✅ | ✅ |
| Уведомления о ценах | ❌ | ✅ | ✅ |
| API доступ | ❌ | ❌ | ✅ |
| Поддержка | сообщество | стандарт | премиум (SLA) |

## 🛠️ Технологии
- **Фронтенд**: Vue 3, Vite, TypeScript, Pinia, Vue Router, Chart.js
- **Бэкенд**: Supabase (Auth, Realtime, Database, Edge Functions)
- **API-провайдеры**: CoinGecko, CoinPaprika
- **Стили**: SCSS, mobile-first, адаптивный UI
- **CI/CD**: GitHub Actions + Vercel/Netlify
- **Тестирование**: Vitest, Playwright
- **Мониторинг**: Sentry, Lighthouse CI

## 🔑 Переменные окружения
Создайте `.env` файл в корне проекта:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_key
VITE_API_COINGECKO=https://api.coingecko.com/api/v3
VITE_API_COINPAPRIKA=https://api.coinpaprika.com
```
🚀 Запуск проекта
```
# установка зависимостей
npm install

# запуск в dev-режиме
npm run dev

# билд для продакшена
npm run build

# запуск тестов
npm run test
```
📦 Деплой
Vercel / Netlify (рекомендуется)
Подключите Supabase проект и настройте переменные окружения

🧭 Дорожная карта
 MVP: авторизация, избранное, топ-20
 Realtime синхронизация
 Уведомления о ценах
 Подписки (Stripe + Supabase Functions)
 API для Enterprise
 White-label дашборды

🤝 Вклад в проект
PR и Issues приветствуются!
Планируется развитие до стартапа с подписками.

© 2025 CryptoPulse. Все права защищены.
