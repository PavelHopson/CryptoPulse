# 🚀 CryptoPulse 2077

> **Production-ready SaaS platform** for crypto analytics with realtime data, role-based access, and subscription monetization.

CryptoPulse 2077 is designed as a commercial product foundation (not a pet-project): modular architecture, strict TypeScript, Supabase backend, Stripe billing, and scalable observability/security primitives.

---

## ✨ Product Vision

CryptoPulse helps users move from **noise** to **decision**:
- Track market leaders in realtime.
- Build personal signal workflows (favorites, comparisons, portfolio).
- Upgrade via subscription tiers (Free / Pro / Enterprise).
- Operate on a secure, observable, scalable architecture.

---

## 🧱 Core Stack

- **Frontend:** React 18, Vite, TypeScript (strict), React Router v6, Zustand, TailwindCSS, Recharts, Axios
- **Backend/BaaS:** Supabase (Auth, Postgres, Realtime, Edge Functions, RLS)
- **Billing:** Stripe Checkout + Webhook subscription sync
- **Quality/Infra:** ESLint, Prettier, Vitest, GitHub Actions
- **Observability:** PostHog + Sentry-ready + structured logs + health-check workflow

---

## 🗂️ Project Structure

```text
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

---

## ⚡ Key Capabilities

- Email/password + Google OAuth authentication
- Persistent sessions + token refresh
- Protected routes + role guard (`free`, `pro`, `enterprise`)
- Dashboard with top-20 market feed and sparkline charts
- Favorites with plan-aware limits + realtime sync
- Comparison limits from feature flags
- Billing center (status, renewal, trial countdown, invoices)
- Stripe webhook role synchronization + subscription audit trail
- Background-ready alerts job queue with retries
- Usage/revenue/churn analytics baseline

For full functional walkthrough, see **[`PROJECT_SHOWCASE.md`](./PROJECT_SHOWCASE.md)**.

---

## 🔐 Security & Reliability Highlights

- Row Level Security on user-owned tables
- Structured logging and centralized error handling
- Webhook rate limiting + retry logic + failure alert hook
- Health-check edge endpoint + scheduled uptime workflow
- Anti-abuse client-side budget limiter for sensitive actions

---

## 🛠️ Local Development

1. Install deps:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Run app:
   ```bash
   npm run dev
   ```

---

## ☁️ Supabase / Stripe Notes

- Apply migration: `supabase/migrations/202602190001_init.sql`
- Deploy edge functions:
  - `stripe-webhook`
  - `price-alerts`
  - `health-check`
- Configure Stripe webhook to `stripe-webhook` URL
- Set `ALERT_WEBHOOK_URL` for incident notifications

---

## 🗺️ Roadmap

- **Phase 1:** MVP foundation ✅
- **Phase 2:** Pro operational depth (portfolio/alerts polish)
- **Phase 3:** Stripe lifecycle hardening ✅
- **Phase 4:** Enterprise API layer
- **Phase 5:** White-label / partner mode
