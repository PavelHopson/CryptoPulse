# 🚀 CryptoPulse — Финансовый дашборд для трейдинга

![CryptoPulse Banner](./docs/assets/banner.png)

**CryptoPulse** — это современное, адаптивное веб-приложение для отслеживания криптовалют, forex-пар и котировок драгоценных металлов. Проект демонстрирует полный цикл разработки production-ready SPA на современном стеке.

[![Vue 3](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-2.x-FFD859?logo=vue.js)](https://pinia.vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.x-FF6384?logo=chart.js)](https://www.chartjs.org/)
[![SCSS](https://img.shields.io/badge/SASS/SCSS-1.69-CC6699?logo=sass)](https://sass-lang.com/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify)](https://www.netlify.com/)

**🌐 Живая демо-версия:** [cryptopulse-dashboard.netlify.app](https://cryptopulse-dashboard.netlify.app)

---

## 📋 Оглавление

- [Обзор](#-обзор)
- [Ключевые функции](#-ключевые-функции)
- [Технологический стек](#-технологический-стек)
- [Скриншоты и демо](#-скриншоты-и-демо)
- [Архитектура и API](#-архитектура-и-api)
- [Установка и запуск](#-установка-и-запуск)
- [Планы по развитию](#-планы-по-развитию)
- [Лицензия](#-лицензия)
- [Автор](#-автор)

---

## 🎯 Обзор

CryptoPulse — это единый хаб для мониторинга финансовых рынков, который я разработал для демонстрации современных навыков фронтенд-разработки. Приложение в реальном времени отображает:

-   **Криптовалюты:** Топ-100 по рыночной капитализации с детальной аналитикой по каждой монете.
-   **Forex:** Основные валютные пары (USD/RUB, EUR/USD, GBP/USD и другие).
-   **Металлы:** Котировки золота, серебра, платины и палладия.

Проект реализован как SPA (Single Page Application) с клиентской маршрутизацией, состоянием и адаптивным интерфейсом.

---

## ✨ Ключевые функции

### 📊 Дашборд и данные
-   **Главный дашборд** с таблицей активов и агрегированной статистикой
-   **Детальные страницы** для каждого актива с графиками цен за разные периоды (24ч, 7д, 30д, 1г)
-   **Мощные графики** с использованием Chart.js (свечные, линейные)
-   **Автообновление** данных каждые 60 секунд (с настройкой интервала)

### ⭐ Пользовательский опыт
-   **Система избранного** с сохранением в `localStorage`
-   **Сравнение активов** — до 3-х графиков на одном холсте
-   **Умный поиск** по названию и символу актива
-   **Адаптивный дизайн** — от 320px до 4K
-   **Тёмная/светлая тема** (синхронизируется с системными настройками)
-   **Skeleton-загрузчики** и graceful degradation при ошибках API

### 🛠️ Технические особенности
-   Клиентская кэширование запросов для снижения нагрузки на API
-   Обработка ошибок и Toast-уведомления
-   Прогрузка данных по скроллу (pagination / infinite scroll)
-   Оптимизация производительности (динамические импорты, lazy loading)

---

## 🛠️ Технологический стек

| Категория       | Технологии                                                                                                                              |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **Фронтенд**    | ![Vue 3](https://img.shields.io/badge/-Vue%203-4FC08D?logo=vue.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) ![Pinia](https://img.shields.io/badge/-Pinia-FFD859?logo=vue.js&logoColor=black) ![Vue Router](https://img.shields.io/badge/-Vue%20Router-4FC08D?logo=vue.js&logoColor=white) |
| **Стили**       | ![SCSS](https://img.shields.io/badge/-SCSS-CC6699?logo=sass&logoColor=white) ![CSS Grid](https://img.shields.io/badge/-CSS%20Grid-1572B6?logo=css3&logoColor=white) ![Flexbox](https://img.shields.io/badge/-Flexbox-1572B6?logo=css3&logoColor=white) |
| **Визуализация**| ![Chart.js](https://img.shields.io/badge/-Chart.js-FF6384?logo=chart.js&logoColor=white)                                               |
| **Инструменты** | ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![ESLint](https://img.shields.io/badge/-ESLint-4B32C3?logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/-Prettier-F7B93E?logo=prettier&logoColor=black) |
| **Деплой**      | ![Netlify](https://img.shields.io/badge/-Netlify-00C7B7?logo=netlify&logoColor=white)                                                  |
| **API**         | [CoinGecko API](https://www.coingecko.com/ru/api) • [Exchangerate.host](https://exchangerate.host/) • [Metals-API](https://metals-api.com/) |

---

## 🖼️ Скриншоты и демо

| Светлая тема (Главная страница) | Тёмная тема (График BTC) |
| :-----------------------------: | :----------------------: |
| ![Главная светлая](./docs/screenshots/light-dashboard.png) | ![График тёмный](./docs/screenshots/dark-chart.png) |

| Сравнение активов | Адаптивная версия |
| :---------------: | :---------------: |
| ![Сравнение](./docs/screenshots/compare-view.png) | ![Мобильная](./docs/screenshots/mobile-view.png) |

**🎥 Видео-демо работы приложения:** [смотреть на Loom](https://www.loom.com/share/...)

---

## 🧩 Архитектура и API

### Структура проекта
```
src/
├── components/ # Переиспользуемые Vue-компоненты
│ ├── ui/ # Базовые компоненты (кнопки, модалки)
│ ├── charts/ # Компоненты графиков (CandleStickChart.vue)
│ ├── crypto/ # Специфичные для крипты компоненты
│ └── layout/ # Компоненты макета (Header, Footer)
├── views/ # Страницы приложения
│ ├── Dashboard.vue # Главная
│ ├── CoinDetail.vue # Детальная страница монеты
│ └── Compare.vue # Страница сравнения
├── stores/ # Хранилища Pinia
│ ├── crypto.store.ts # Состояние криптовалют
│ └── theme.store.ts # Состояние темы
├── composables/ # Vue composables
│ ├── useApi.ts # Логика работы с API
│ └── useWebSocket.ts # Логика WebSocket
├── types/ # TypeScript типы
├── router/ # Конфигурация маршрутизатора
├── styles/ # Глобальные стили и SCSS-переменные
└── main.ts # Точка входа
```

### Взаимодействие с API
Приложение использует несколько внешних API для получения данных:
1.  **CoinGecko API** — получение списка криптовалют, цен, исторических данных.
2.  **Exchangerate.host** — получение актуальных курсов валют.
3.  **Metals-API** — получение котировок драгоценных металлов.

Реализована абстракция для работы с API (`src/services/api.ts`) с обработкой ошибок, таймаутами и кэшированием.

---

## ⚡ Установка и запуск

Для запуска проекта локально потребуется Node.js версии 18 или выше.

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/your-username/cryptopulse-dashboard.git
    cd cryptopulse-dashboard
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    ```

3.  **Запустите сервер для разработки:**
    ```bash
    npm run dev
    ```
    Приложение будет доступно по адресу `http://localhost:5173`.

4.  **Сборка для production:**
    ```bash
    npm run build
    ```
    Собранные файлы будут помещены в директорию `dist/`.

5.  **Проверка линтером:**
    ```bash
    npm run lint
    ```

---

## 📈 Планы по развитию

-   [ ] **Реализация бэкенда** на Node.js + Express для кэширования запросов и снижения нагрузки на внешние API
-   [ ] **Аутентификация пользователей** для синхронизации избранного между устройствами
-   [ ] **WebSocket** для реального времени (без опроса API каждые N секунд)
-   [ ] **Уведомления** о достижении ценой заданного уровня
-   [ ] **Расширенная аналитика** (RSI, Moving Averages) с помощью библиотеки `lightweight-charts`
-   [ ] **PWA** (Progressive Web App) для установки на мобильные устройства

---

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробнее см. в файле [LICENSE](LICENSE).

---

## 👨‍💻 Автор

**Ваше Имя** – [Telegram]([https://t.me/your_telegram](https://t.me/Zolomon1997)) – [Email](hopsintoxin@mail.ru)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin)](https://www.linkedin.com/in/your-profile/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/your-username)
[![Portfolio](https://img.shields.io/badge/Portfolio-4285F4?logo=google-chrome)](https://your-portfolio-site.com)

---

*Если этот проект был полезен, не забудьте поставить звезду ⭐ на GitHub!*
