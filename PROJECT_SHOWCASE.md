# 🌌 CryptoPulse 2077 — Full Product Showcase

This document presents the **complete site map, user flows, business logic, and operational architecture** for CryptoPulse 2077.

---

## 1) 🧭 Full Site Map

### Public/Auth
- `/auth` — Sign in / OAuth entry point

### Protected App
- `/` — **Dashboard (Market Grid)**
- `/favorites` — **Signal Vault (Favorites)**
- `/comparison` — **Compare Core**
- `/portfolio` — **Portfolio OS** (Pro+)
- `/pricing` — **Upgrade Matrix**
- `/billing` — **Billing Control Deck**

---

## 2) 👤 Roles & Access Model

| Role | Favorites | Comparison | Portfolio | Alerts | Billing |
|---|---:|---:|---|---|---|
| Free | Limited (flag-based) | Limited (flag-based) | ❌ | ❌ | ✅ |
| Pro | Higher limits | Higher limits | ✅ | ✅ | ✅ |
| Enterprise | Unlimited/Custom | Unlimited/Custom | ✅ | ✅ | ✅ |

All limits are controlled through `feature_flags` (DB), enabling runtime changes without redeploy.

---

## 3) 🖥️ Feature Walkthrough

## Dashboard (Market Grid)
- Top 20 market assets
- Price, 24h change, market cap, volume
- 7d sparkline chart per asset
- Auto refresh cycle for near-realtime UX

## Signal Vault (Favorites)
- Add / remove favorites
- Limits validated by plan
- Realtime table sync
- Graceful downgrade behavior (overflow favorites become inactive)

## Compare Core
- Plan-aware comparison capacity from feature flags
- Designed for multi-chart strategy overlays

## Portfolio OS
- Role-gated feature (Pro+)
- Intended for P/L, ROI, and allocation insights
- Paywall tracking hooks included

## Upgrade Matrix (Pricing)
- Clear plan cards (Pro / Enterprise)
- Stripe checkout initiation
- Conversion tracking events

## Billing Control Deck
- Current plan + status
- Next renewal date
- Trial countdown
- Cancel-at-period-end action
- Invoice history stream

---

## 4) 💳 Subscription & Billing Lifecycle

1. User starts checkout from Pricing.
2. Stripe creates subscription.
3. Webhook receives lifecycle events.
4. System updates:
   - `subscriptions`
   - `profiles.role`
   - `subscription_events` (audit trail)
5. UI gates and limits adapt automatically by role/flags.

---

## 5) ⚙️ Data Model (Business-Critical Tables)

- `profiles` — identity + role
- `subscriptions` — billing status and lifecycle dates
- `subscription_events` — immutable billing audit trail
- `feature_flags` — limits / capability toggles per role
- `favorites` — user watchlist (+ `active` for downgrade UX)
- `comparisons` — saved comparison sets
- `portfolios` — holdings for portfolio analytics
- `alerts` — user price alerts
- `alert_jobs` — queued job processing with retry/backoff
- `usage_events` — product analytics event stream

---

## 6) 🔒 Security, Reliability, and Operations

### Security
- RLS isolation (`auth.uid()` ownership checks)
- Sensitive secrets in env/edge only
- Webhook signature verification

### Reliability
- Structured logging (JSON)
- Centralized app error handling
- Stripe webhook retry and failure notification hooks
- Health-check endpoint + scheduled ping workflow

### Scale Direction
- Background job queue for alerts (batch + retries)
- Role/feature abstraction for zero-downtime plan tuning
- Service/domain separation for clean growth

---

## 7) 📈 Growth & Data Strategy Layer

- Usage event tracking for core feature adoption
- Revenue snapshot view (MRR baseline)
- Churn monthly view from subscription events
- Upgrade trigger telemetry in product touchpoints

This enables transition from “shipping features” to **measuring business outcomes**.

---

## 8) 🧪 Production Readiness Checklist

- [x] Strict TypeScript app architecture
- [x] Auth + protected routes + roles
- [x] Stripe-to-role synchronization path
- [x] RLS-enabled user data isolation
- [x] Observability primitives in place
- [x] Background job baseline for alerts
- [x] Billing UI and subscription status visibility
- [x] Growth metrics foundation

---

## 9) 🎯 Why this is startup-ready

CryptoPulse already includes the foundations most teams add too late:
- separation of business logic from infrastructure,
- monetization lifecycle support,
- observability and operational safety rails,
- data instrumentation for retention and revenue insights.

It is now positioned not just as an app, but as a **scalable SaaS business platform**.
