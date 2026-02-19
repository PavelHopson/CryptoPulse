# CryptoPulse 2077

Production-grade SaaS platform for cryptocurrency analytics with role-based product tiers, realtime user data sync, and subscription monetization.

## Executive Summary

CryptoPulse 2077 is structured as a **commercial-ready foundation** for a crypto analytics business:

- Tiered access model (**Free / Pro / Enterprise**)
- Supabase-native backend architecture (Auth, Postgres, Realtime, RLS, Edge Functions)
- Stripe billing lifecycle integration (checkout + webhook-driven role updates)
- Domain/service separation for maintainable and scalable growth
- Observability and reliability primitives for production operations

This repository is optimized for teams that need to move from MVP to production without rewriting core architecture.

---

## Product Scope

### Core user-facing modules
- **Dashboard**: top market assets, key metrics, sparkline charts
- **Favorites**: role-limited watchlist with realtime synchronization
- **Comparison**: plan-aware comparison capacity
- **Portfolio**: Pro+ gated portfolio workspace
- **Pricing**: conversion-oriented upgrade flow
- **Billing**: subscription status, renewal/trial visibility, invoice history

### Business-critical capabilities
- Authentication with session persistence and auto-refresh
- Role-based access control across product surfaces
- Subscription-to-role synchronization via Stripe webhook events
- Feature flag model for plan limits without frontend redeploy

For a complete walkthrough of routes, role matrix, lifecycle flows, and data model, see **[`PROJECT_SHOWCASE.md`](./PROJECT_SHOWCASE.md)**.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript (strict), React Router v6, Zustand |
| UI | TailwindCSS, Headless UI-ready primitives, Recharts |
| Data/API | Supabase JS, Axios, React Query |
| Backend | Supabase Auth, Postgres, Realtime, Edge Functions |
| Billing | Stripe Checkout + Webhook processing |
| Quality | ESLint, Prettier, Vitest |
| CI/CD | GitHub Actions |
| Observability | Structured logging, Sentry-ready hooks, PostHog-ready tracking |

---

## Architecture Principles

- **Separation of concerns**: UI → domain use-cases → services → infrastructure
- **Strong typing by default**: strict TypeScript and explicit domain types
- **Plan-aware product logic**: limits and entitlements controlled by DB feature flags
- **Scalable operations**: background-job-ready alert pipeline and audit tables
- **Secure by design**: RLS-first data isolation and secret-bound server responsibilities

---

## Security, Reliability, and Operations

### Security
- Row Level Security policies on user-owned entities
- Webhook signature verification for Stripe events
- Secret-sensitive logic constrained to Edge/server-side contexts

### Reliability
- Structured logging and centralized error normalization
- Retry-aware webhook and alert processing flows
- Subscription event audit trail for billing forensics

### Operations
- Health-check edge endpoint
- Scheduled health workflow support
- Incident hook support (`ALERT_WEBHOOK_URL`)

---

## Repository Structure

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
```

---

## Local Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
```bash
cp .env.example .env
```

Required variables are defined in `.env.example`.

### 3) Run development server
```bash
npm run dev
```

### 4) Quality checks
```bash
npm run lint
npm run test
npm run build
```

---

## Supabase / Stripe Deployment Notes

1. Apply SQL migration:
   - `supabase/migrations/202602190001_init.sql`
2. Deploy Edge Functions:
   - `stripe-webhook`
   - `price-alerts`
   - `health-check`
3. Configure Stripe webhook endpoint to `stripe-webhook`
4. Configure incident notifications via `ALERT_WEBHOOK_URL`

---

## Production Readiness Checklist

- [x] Strict TypeScript + modular architecture
- [x] Auth + protected routes + role model
- [x] Stripe subscription lifecycle integration
- [x] Realtime data sync for user entities
- [x] RLS data isolation strategy
- [x] Billing and plan management surfaces
- [x] Observability foundations (logging, health-check, audit trail)
- [x] CI workflow baseline

---

## Roadmap

- **Phase 1** — MVP baseline ✅
- **Phase 2** — Pro feature depth (portfolio/alerts UX and analytics)
- **Phase 3** — Stripe lifecycle hardening ✅
- **Phase 4** — Enterprise API surface
- **Phase 5** — White-label and partner distribution

---

## License

MIT — see [`LICENSE`](./LICENSE).
