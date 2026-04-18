# ADR 0001 — Client-only architecture (no backend server)

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Project lead

## Context

CryptoPulse 2077 is a crypto / markets analytics product. In one UI it
brings together:

- real-time market data (price tickers, candles, order books)
- an AI analyst (Gemini via `@google/genai`) for natural-language Q&A
  over current prices
- a trading simulator (portfolio, P&L, paper orders)
- a news feed aggregated from multiple RSS sources (CoinTelegraph,
  CoinDesk, CryptoNews, Investing.com)
- user-level gamification and alerts

The product needs to feel immediate, deploy continuously, and not cost
money to run when nobody is using it. It is positioned as a
**demo-grade product that must be production-shippable**: clone → `npm
install` → `vite build` → live on Cloudflare Pages.

Key constraints driving the architecture:

1. **Zero infrastructure cost at rest.** No idle VPS bills, no database
   tier we pay for while traffic is zero.
2. **Demo-ready without backend setup.** A new contributor or an
   investor should be able to run the app locally, or visit the deployed
   URL, without provisioning auth / DB / queue workers.
3. **Privacy.** User positions in the trading simulator, AI prompt
   history, and alert preferences are personal. The less we centralize,
   the fewer GDPR / data-handling responsibilities we take on.
4. **Deploy speed.** Vite build + Pages push is ~30 seconds. No
   long-running backend deploys to coordinate.
5. **Frontend is the product.** Almost every service (`aiService`,
   `cryptoService`, `newsService`, `alertService`, `gamificationService`,
   `exportService`, `reportService`, `userService`, `web3Service`) is a
   TypeScript module in `src/services/` that calls external APIs
   directly. There is no meaningful server-side business logic.

See `package.json` — the dependency list is React 19, Vite 6, Tailwind,
`@google/genai`, `recharts`, `lucide-react`. No backend framework, no
ORM, no server SDK.

## Decision

**CryptoPulse is a 100% client-side React SPA.**

- All state lives in React (plus `localStorage` for session continuity).
- All market data, price data, and AI calls are made directly from the
  browser to public APIs (CoinGecko, Binance public endpoints, Google
  Gemini, etc.).
- User-supplied API keys stay in `localStorage` on the user's machine
  and are attached to outbound requests from the browser. They never
  touch our servers, because we do not have servers.
- The **only** server-side component is a Cloudflare Worker (`workers/news-parser/`)
  whose single job is to fetch public RSS feeds and serve them with
  permissive CORS headers — see ADR 0002 for the reasoning.
- Deploy target is **Cloudflare Pages** (static hosting) for the SPA
  and **Cloudflare Workers** (edge) for the news proxy.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
|---|---|---|---|
| **Traditional Node.js backend (Express/Fastify)** | Server-side API key custody, rate limiting we control, DB for user state | Requires VPS/App Runner/ECS, we pay while idle, ops burden (monitoring, backups, SSL renewals if self-hosted), release-coordination tax between FE and BE | Overkill for the actual needs. No business logic that genuinely requires a server. Every hour the backend runs is a cost for a product that is not yet monetized. |
| **Next.js SSR** | Unified deployment, API routes, good SEO, Vercel one-click deploy | Middle-ground complexity — we pay for server runtime (Vercel functions billed per invocation), SSR is not useful for a real-time trading UI that hydrates immediately into client-driven charts, lock-in to Vercel for best DX | We do not need SEO (this is an authenticated-feel app, not a marketing site) and we do not need SSR for real-time client-driven views. Paying for functions to render a page we immediately replace with client state is waste. |
| **Python / FastAPI backend** | Nice ML integration, explicit types, good for compute-heavy logic | Extra language in the stack, same VPS/Serverless cost problem, no compute-heavy logic exists in this app | No justification for a second language when nothing in the app requires Python. |
| **Firebase** | Realtime DB + auth + hosting, generous free tier, fast to start | Google lock-in, realtime DB pricing can spike on active products, auth story ties user identity to Google, data-residency concerns | Not needed — we do not have multi-user shared state. Each user's portfolio is theirs alone. Firebase is the right tool for the wrong problem. |
| **Supabase** | Open-source alternative to Firebase, Postgres, built-in auth | Same observation: we would be paying for features we do not use (multi-user DB, row-level security, realtime subscriptions) | We do not have a user graph. Adding Supabase would add complexity for the sake of completeness. |
| **AWS Amplify / Cognito** | Full-managed frontend + auth + API | Highest complexity in this table, AWS-tier learning curve, expensive to operate long-term | Maximum ceremony for a single-user client app. |

## Consequences

### Positive

- **Zero recurring infra cost.** Cloudflare Pages static hosting + one
  Cloudflare Worker fit comfortably inside free tiers. The product
  costs $0 / month to keep online.
- **Instant deploys.** `vite build` + Pages push in under a minute.
  No BE migrations, no rolling restarts.
- **Nothing to breach.** We do not hold user data on a server. There is
  no database to exfiltrate, no secrets to leak, no auth tokens to
  manage at rest. The blast radius of a security bug is scoped to one
  user's browser.
- **Demo-ready always.** Anyone can fork, `npm install`, `npm run dev`,
  and get a working product. No `.env.backend`, no DB seed script, no
  Docker Compose.
- **Portable architecture.** The app can also run fully offline (minus
  live prices) because there is no server dependency baked in at
  runtime.
- **Easy to iterate.** A change to `cryptoService.ts` ships by pushing
  a commit. No API versioning discipline needed because there is no
  API that we own and multiple clients talk to.

### Negative

- **API keys exposed in the browser.** This is the loudest trade-off.
  The user's Gemini key, any exchange key, etc., live in `localStorage`
  and get attached to outbound requests from their own machine. We
  mitigate by: (1) requiring users to supply their own keys — we do
  not ship any shared / embedded production keys; (2) documenting the
  threat model clearly in the README; (3) never persisting keys
  server-side (we can't — there is no server).
- **No rate limiting we control.** If a user's Gemini key hits quota,
  they see the vendor's error. We cannot smooth it over with a
  server-side queue.
- **No cross-device sync.** A user's trading-sim positions on their
  laptop are not visible on their phone. This is a known limitation
  and accepted for v2. A future opt-in sync layer (Supabase, Worker +
  KV) can be added without breaking the architecture.
- **No server-side validation.** If a user tampers with `localStorage`,
  their trading simulator state can be anything. This is fine because
  the "paper" positions are personal — there is no leaderboard or
  shared state that another user could be harmed by.
- **CORS is a recurring friction.** Any third-party data source that
  does not send `Access-Control-Allow-Origin: *` cannot be called
  directly from the browser. This is exactly the problem ADR 0002
  addresses for the news feed.
- **Analytics are thin.** Without a backend we have only what the
  client chooses to report (and we chose not to report much, on
  principle).

### Neutral

- **We own the build pipeline, not the runtime.** The entire risk
  surface is what is in `dist/` at deploy time. That is a very small
  surface to audit.
- **Scaling is Cloudflare's problem.** Static files scale horizontally
  by definition. One Worker endpoint scales to the Worker tier's limits.
- **Tech stack is reduced.** One language (TypeScript), one runtime
  (browser), one framework (React). Onboarding is fast.

## When we would reconsider

Signals that would force us to add a backend:

- A feature that genuinely requires server custody of secrets (a
  paid API we proxy for multiple users, where the key must stay
  server-side).
- A social feature with real shared state (leaderboards, public
  portfolios, copy-trading).
- Compliance requirement that forces audit trails we cannot collect
  from the client alone.

If that happens, the migration is incremental: add a Worker or a small
service, move the specific service module to talk to it, leave the
rest of the client-only architecture intact.

## References

- Source: `src/services/*.ts` — note these are all browser-side modules
- News Worker: `workers/news-parser/src/index.ts` (see ADR 0002)
- `package.json` — dependencies confirm the absence of any backend
  framework
- Hosting: Cloudflare Pages (SPA) + Cloudflare Workers (news)
- Related: `ARCHITECTURE.md`
