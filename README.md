# CryptoPulse: Крипто-дашборд нового поколения

(https://img.shields.io/github/workflow/status/PavelHopson/CryptoPulse/deploy-to-vercel?style=for-the-badge)](https://github.com/PavelHopson/CryptoPulse/actions)
(https://img.shields.io/github/stars/PavelHopson/CryptoPulse?style=for-the-badge)](https://github.com/PavelHopson/CryptoPulse/stargazers)
[![License](https://img.shields.io/github/license/PavelHopson/CryptoPulse?style=for-the-badge)](https://github.com/PavelHopson/CryptoPulse/blob/main/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/PavelHopson/CryptoPulse?style=for-the-badge)](https://github.com/PavelHopson/CryptoPulse/commits/main)

!(https://i.imgur.com/placeholder-banner.png)

## О проекте

**CryptoPulse** — это современный, высокопроизводительный крипто-дашборд, созданный для предоставления актуальной информации о рынке криптовалют. Проект реализован с использованием передовых технологий, обеспечивает плавный пользовательский опыт и готов к масштабированию.

### Основные функциональные возможности

*   **Главная страница:** Таблица с топ-20 криптовалютами, автообновление данных каждые 60 секунд.
*   **Динамические графики:** Детальный график цен для каждой монеты с различными временными интервалами.
*   **Сравнение монет:** Возможность добавлять несколько монет на один график для визуального сравнения.
*   **Избранное:** Сохранение любимых монет в персональном списке, с поддержкой `localStorage` и опциональной синхронизацией через бэкенд.
*   **UI/UX:** Адаптивный дизайн (Mobile-first), переключатель тёмной/светлой темы.
*   **Улучшенный опыт:** `Skeleton loaders` для индикации загрузки, `Toast` уведомления для обратной связи.
*   **Продвинутая фильтрация:** Система поиска и сортировки по различным параметрам.
*   **Локализация:** Поддержка нескольких языков и форматов валют (USD, EUR, RUB).

### Стек технологий

**Frontend:**
*   **Фреймворк:** Vue 3 (Composition API + `<script setup>`)
*   **Сборщик:** Vite
*   **Управление состоянием:** Pinia
*   **Типизация:** TypeScript
*   **Маршрутизация:** Vue Router
*   **Графики:** Chart.js, Vue-Chartjs
*   **HTTP-клиент:** Axios
*   **Уведомления:** Vue Toastification
*   **Стили:** SCSS (Mobile-first)

**Backend (опционально):**
*   **Сервер:** Node.js, Express.js
*   **ORM:** Prisma
*   **База данных:** PostgreSQL
*   **Аутентификация:** JWT

### Установка и запуск

Для запуска проекта на локальной машине, выполните следующие шаги:

1.  Клонируйте репозиторий:
    ```bash
    git clone [https://github.com/PavelHopson/CryptoPulse.git](https://github.com/PavelHopson/CryptoPulse.git)
    ```
2.  Перейдите в папку проекта:
    ```bash
    cd CryptoPulse
    ```
3.  Установите зависимости:
    ```bash
    npm install
    ```
4.  Запустите сервер для разработки:
    ```bash
    npm run dev
    ```

Приложение будет доступно по адресу `http://localhost:5173/`.

### Развёртывание

Проект настроен для автоматического развёртывания на [Netlify](https://www.netlify.com/) или [Vercel](https://vercel.com/) с использованием GitHub Actions.

1.  Подключите ваш GitHub-репозиторий к одной из этих платформ.
2.  Платформа автоматически определит настройки сборки (`npm run build`) и папку для публикации (`dist/`).
3.  Каждый `push` в основную ветку будет автоматически запускать процесс сборки и развертывания.

### Контрибьюция

Мы приветствуем любые предложения по улучшению проекта. Пожалуйста, следуйте нашим [руководствам по контрибьюции](CONTRIBUTING.md).

---

**v1.0.0**
