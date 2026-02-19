# Деплой (RU)

## Frontend
Рекомендуется Vercel.

## Backend (Supabase)
1. Применить миграции.
2. Развернуть edge-функции:
   - `stripe-webhook`
   - `price-alerts`
   - `health-check`
3. Убедиться, что RLS-политики активны.

## Stripe
1. Создать продукты/цены.
2. Настроить webhook на `stripe-webhook`.
3. Указать секрет webhook в env edge-функций.

## Обязательные env
См. `.env.example` и секреты CI/CD.
