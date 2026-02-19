# CryptoPulse 2077

Production-уровень SaaS-платформы для аналитики криптовалют с ролевыми тарифами, realtime-синхронизацией пользовательских данных и подписочной монетизацией.

## Кратко о проекте

CryptoPulse 2077 — это **коммерчески готовый фундамент** для запуска и масштабирования крипто-продукта:

- тарифная модель доступа (**Free / Pro / Enterprise**)
- backend на Supabase (Auth, Postgres, Realtime, RLS, Edge Functions)
- Stripe-платежи с обновлением ролей через webhook-события
- модульная архитектура (UI → domain → services)
- базовый контур наблюдаемости, надежности и безопасности

Проект ориентирован на переход от MVP к production без архитектурного переписывания.

---

## Что умеет платформа

### Пользовательские модули
- **Dashboard**: топ активов, ключевые метрики, графики
- **Favorites**: избранные монеты с лимитами по тарифу и realtime-синхронизацией
- **Comparison**: сравнение активов с ограничениями по плану
- **Portfolio**: рабочее пространство портфеля (Pro+)
- **Pricing**: страница апгрейда и запуск checkout
- **Billing**: статус подписки, продление, trial, история инвойсов

### Бизнес-критичная логика
- авторизация с persist session и auto-refresh токенов
- role-based доступ к функциям платформы
- синхронизация ролей через Stripe webhook lifecycle
- лимиты и фичи через `feature_flags` без релиза фронтенда

Подробный функциональный обзор — в **[`PROJECT_SHOWCASE.md`](./PROJECT_SHOWCASE.md)**.

---

## Технологический стек

| Слой | Технологии |
|---|---|
| Frontend | React 18, Vite, TypeScript (strict), React Router v6, Zustand |
| UI | TailwindCSS, Headless UI-ready подход, Recharts |
| Данные/API | Supabase JS, Axios, React Query |
| Backend | Supabase Auth, Postgres, Realtime, Edge Functions |
| Платежи | Stripe Checkout + Webhook |
| Качество | ESLint, Prettier, Vitest |
| CI/CD | GitHub Actions |
| Наблюдаемость | structured logging, Sentry-ready, PostHog-ready |

---

## Архитектурные принципы

- **Разделение ответственности**: UI → use-case → service → infrastructure
- **Строгая типизация**: TypeScript strict + явные доменные типы
- **План-ориентированная бизнес-логика**: лимиты управляются через БД
- **Операционная масштабируемость**: очередь задач, retry и audit trail
- **Безопасность по умолчанию**: RLS-изоляция и секреты вне frontend

---

## Безопасность, надежность и эксплуатация

### Безопасность
- Row Level Security для пользовательских сущностей
- валидация Stripe webhook signature
- чувствительные ключи и процессы только на edge/server

### Надежность
- structured-логи + централизованная обработка ошибок
- retry-механизмы в webhook и alert-процессинге
- audit trail подписочных событий (`subscription_events`)

### Эксплуатация
- health-check endpoint
- scheduled health workflow
- alert hook для инцидентов (`ALERT_WEBHOOK_URL`)

---

## Структура репозитория

```text
src/
  app/
  components/
  domain/
  features/
    auth/
    billing/
    dashboard/
    favorites/
    comparison/
    portfolio/
    pricing/
    alerts/
  hooks/
  services/
  lib/
  store/
  types/
  pages/
  layouts/
supabase/
  migrations/
  functions/
docs/
```

---

## Быстрый старт

### 1) Установка зависимостей
```bash
npm install
```

### 2) Подготовка окружения
```bash
cp .env.example .env
```

### 3) Запуск разработки
```bash
npm run dev
```

### 4) Проверки качества
```bash
npm run lint
npm run test
npm run build
```

---

## Развертывание Supabase / Stripe

1. Применить миграцию:
   - `supabase/migrations/202602190001_init.sql`
2. Развернуть edge-функции:
   - `stripe-webhook`
   - `price-alerts`
   - `health-check`
3. Подключить Stripe webhook к `stripe-webhook`
4. Настроить `ALERT_WEBHOOK_URL` для уведомлений об инцидентах

---

## Документация на русском

- [`PROJECT_SHOWCASE.md`](./PROJECT_SHOWCASE.md) — полный обзор продукта
- [`docs/QUICKSTART_RU.md`](./docs/QUICKSTART_RU.md) — пошаговый запуск
- [`docs/DEPLOYMENT_RU.md`](./docs/DEPLOYMENT_RU.md) — инструкция по деплою
- [`docs/OPERATIONS_RU.md`](./docs/OPERATIONS_RU.md) — эксплуатация и мониторинг

---

## Чеклист готовности

- [x] строгая модульная архитектура
- [x] auth + роли + protected routes
- [x] Stripe lifecycle интеграция
- [x] realtime-синхронизация пользовательских данных
- [x] RLS-изоляция данных
- [x] billing-интерфейс и управление подпиской
- [x] базовая observability-инфраструктура
- [x] CI-пайплайн

---

## Дорожная карта

- **Phase 1** — MVP-база ✅
- **Phase 2** — усиление Pro-функций
- **Phase 3** — hardening Stripe lifecycle ✅
- **Phase 4** — Enterprise API
- **Phase 5** — White-label

---

## Лицензия

MIT — см. [`LICENSE`](./LICENSE).
