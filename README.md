# CryptoPulse 2077

Production-oriented SaaS starter for crypto analytics with tiered subscriptions (Free/Pro/Enterprise), Supabase auth/database/realtime, and Stripe billing.

## Stack
- React 18 + Vite + TypeScript strict mode
- React Router v6 + Zustand + TailwindCSS + Headless UI ready
- React Query + Recharts + Axios
- Supabase Auth/Postgres/Realtime/Edge Functions
- Stripe checkout + webhook role sync
- PostHog + Sentry-ready observability
- Vitest + ESLint + Prettier + GitHub Actions CI

## Architecture

```
src/
  app/
  components/
  domain/
    favorites/
    subscription/
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
```

## Production hardening highlights
- Sentry bootstrap for frontend error monitoring (`src/lib/sentry.ts`)
- Structured JSON logs (`src/lib/logger.ts`)
- Subscription event audit trail (`subscription_events`)
- Webhook failure alerts via `ALERT_WEBHOOK_URL`
- Health-check edge function and scheduled health workflow
- Background alert job queue (`alert_jobs`) with retry/backoff
- Client anti-abuse limiter (`src/lib/rateLimiter.ts`)
- Usage + revenue/churn analytics foundations (`usage_events`, analytics SQL views)

## Core capabilities implemented
- Email/password + Google OAuth auth flows
- Session persistence + token auto refresh
- Protected routes and role-based guard (`useRequireRole`)
- Domain/use-case layer between UI and service layer
- Centralized error handling (`src/lib/errorHandler.ts`) + shared logger (`src/lib/logger.ts`)
- Favorites with dynamic plan limits from `feature_flags`
- Graceful downgrade prep via `handleRoleDowngrade` (overflow favorites become inactive)
- Billing page with subscription status, renewal date, trial countdown, and invoice history
- Pricing page with Stripe checkout trigger and analytics conversion events

## Local development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill values.
3. Run app:
   ```bash
   npm run dev
   ```

## Supabase notes
- Apply migration in `supabase/migrations/202602190001_init.sql`.
- Deploy Edge Functions:
  - `stripe-webhook`
  - `price-alerts`
  - `health-check`
- Configure Stripe webhook to point to the `stripe-webhook` function URL.
- Set secret `ALERT_WEBHOOK_URL` for incident alerts.

## Roadmap phases
- Phase 1: MVP dashboard/favorites/auth ✅
- Phase 2: Pro features (portfolio/alerts) scaffolded
- Phase 3: Stripe integration ✅ (checkout + webhook template)
- Phase 4: Enterprise API (pending)
- Phase 5: White-label (pending)
