# ADR 0002 — Cloudflare Workers for news aggregation

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Project lead

## Context

CryptoPulse shows a live news feed in-app. The user-visible requirement
is simple: on the Dashboard, render the latest crypto + markets news
with title, source, timestamp, image, and a click-through URL.

Under the hood this is not simple:

- Sources are **RSS / XML**, not JSON. We aggregate CoinTelegraph,
  CoinDesk, CryptoNews, Investing.com (Russian edition), and Investing
  crypto (see `workers/news-parser/src/index.ts` — the `FEEDS` object).
- Most RSS endpoints **do not send CORS headers**, so the browser cannot
  fetch them directly. Trying `fetch('https://cointelegraph.com/rss')`
  from the SPA fails with a CORS error.
- Third-party "RSS → JSON" services exist (e.g. rss2json) but have
  rate limits on the free tier and depend on someone else's uptime.
- ADR 0001 locked us into a client-only architecture. We intentionally
  do not run a Node/Express backend. Whatever we build has to fit the
  "static SPA + edge function" model.

The news feed also needs to be **cheap and latency-friendly**. It is
loaded on the main Dashboard, so a slow or failing feed degrades the
first impression of the entire product.

## Decision

We built a **Cloudflare Worker** (`workers/news-parser/`) that:

1. Fetches each RSS feed server-side from the Worker (no browser CORS).
2. Uses a zero-dependency XML parser (regex-based extraction of
   `<title>`, `<link>`, `<pubDate>`, `<description>`, `media:content` /
   `media:thumbnail` / `enclosure` for images).
3. Normalizes into a single `NewsArticle` JSON shape.
4. Sorts by `timestamp` descending, caps at 50 items.
5. Caches upstream RSS at the edge for 5 minutes (`cf: { cacheTtl: 300 }`)
   and instructs browsers to cache the Worker response for 5 minutes
   (`Cache-Control: public, max-age=300`).
6. Exposes three endpoints: `GET /crypto`, `GET /markets`, `GET /`
   (all combined), plus `GET /health`.
7. Sends permissive CORS headers so the SPA can call it directly.

The client (`src/services/newsService.ts`) implements a **3-tier
fallback chain**:

```
Tier 1: Cloudflare Worker            (primary)
   ↓ if worker down / returns 0 items
Tier 2: rss2json public proxy        (secondary, limited)
   ↓ if that fails too
Tier 3: hardcoded mock news          (always works — UI never empty)
```

This is visible in `newsService.ts`: `fetchMarketNews()` tries the
Worker first, `fetchViaRss2Json()` is the fallback, `getMockNews()` is
the floor.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
|---|---|---|---|
| **Client-side RSS fetch** | Zero infra, trivial | CORS blocks almost every major RSS source, we would need each publisher to opt-in, no caching we control | The web does not allow this to work reliably. |
| **Dedicated Node.js backend** | Full control, Node ecosystem for XML parsing (`fast-xml-parser`, `rss-parser`) | Violates ADR 0001 (client-only), adds always-on runtime cost, adds ops surface (process crashes, SSL, monitoring) | Whole point of ADR 0001 is to avoid this. |
| **AWS Lambda + API Gateway** | Serverless, scales to zero | Cold starts on Lambda are 100–500ms, API Gateway adds cost and latency, AWS config surface is large | Cloudflare Workers have effectively 0ms cold start and are simpler. |
| **Vercel Functions** | Nice DX if we were already on Vercel | We deploy to Cloudflare Pages (ADR 0001), Vercel functions would split hosting, pay-per-invocation can add up with every dashboard load | Hosting split is a real DX cost. |
| **rss2json as primary** | Zero code | Public service, rate-limited, unpredictable availability, we would be an uncontrolled dependency on a third party for a core UI element | Acceptable as a fallback, not as primary. |
| **NewsAPI / paid news aggregator** | Clean JSON, structured, official | Costs money, limited free tier, crypto-specific coverage varies, duplicates what we can get from RSS for free | Cost does not justify the marginal quality gain. |
| **Pre-built scraper (e.g. `rss-parser` on a VM)** | Battle-tested | Same "always-on runtime" cost as the Node backend option | Rejected for the same reason. |

## Consequences

### Positive

- **Free tier is generous.** Cloudflare Workers gives 100,000 requests
  per day on the free plan. At realistic traffic this is effectively
  infinite headroom.
- **~0ms cold start.** Workers run on V8 isolates, not containers.
  User opens the Dashboard → news feed appears without a "warming
  up" delay.
- **Edge caching for free.** The `cf: { cacheTtl: 300 }` on the
  upstream `fetch()` means we are not hammering CoinTelegraph on every
  user load. The Worker hits them at most once per 5 minutes per edge
  POP.
- **Deploys alongside Pages.** The SPA lives on Cloudflare Pages, the
  Worker lives on Cloudflare Workers — same dashboard, same account,
  same CI story.
- **CORS-friendly by construction.** The Worker sets whatever CORS
  headers we want. The SPA never hits a preflight failure.
- **3-tier fallback means the UI never breaks.** Even if Cloudflare
  is down, rss2json and the mock chain cover it. This is explicit in
  `newsService.ts` and we consider it a product quality gate.
- **Zero dependencies in the Worker.** The XML parser is ~30 lines of
  regex. No supply-chain surface inside the Worker. The whole file is
  one `index.ts`.

### Negative

- **Regex XML parser is fragile.** It handles the happy path for RSS
  2.0 and Atom but will misbehave on malformed feeds. If a feed
  publisher ships weird HTML entities inside `<description>`, we
  strip them naively. A proper XML parser would be more robust.
- **Per-POP cache means inconsistency.** A user in Frankfurt may see
  a slightly newer/older news set than a user in Singapore for up to
  5 minutes. For news this is acceptable. For prices it would not be.
- **Cloudflare lock-in.** The Worker uses `cf: { cacheTtl }` which is
  a Cloudflare-specific option. Moving to Vercel Edge or Deno Deploy
  would require touching that line. Not severe, but real.
- **We depend on upstream RSS stability.** If CoinTelegraph changes
  their feed URL or schema, we break silently until someone notices.
  Mitigated partially by `Promise.allSettled` — one bad feed does not
  kill the others — but discovery of a broken feed is manual.
- **Rate limits at scale.** If CryptoPulse ever gets viral traffic,
  100k req/day is finite. Since we cache 5 minutes, the practical
  ceiling is 288 hits/day/POP × edge POPs, which is much larger than
  100k, but we should keep it in mind.
- **No observability by default.** Cloudflare Worker logs via
  `wrangler tail` only during active debugging. We do not persist
  logs. For a news feed this is fine; for anything more important it
  would not be.

### Neutral

- **The Worker is a minor addition to the codebase.** One file,
  ~250 lines, one `wrangler.toml`. Any TypeScript contributor can
  read and extend it.
- **The fallback chain adds code paths to test.** In exchange we get
  resilience. `newsService.test.ts` exists to cover these.
- **Attribution is intact.** Each article still links to the original
  source with the original URL. We are re-packaging, not laundering.

## Operational notes

- Worker URL: `https://cryptopulse-news.hopsintoxin.workers.dev`
  (overridable via `VITE_NEWS_API`).
- Endpoints:
  - `GET /` — all feeds, combined, sorted by timestamp desc
  - `GET /crypto` — crypto-only
  - `GET /markets` — traditional markets
  - `GET /health` — liveness probe
- Feeds are defined in a single `FEEDS` const. Adding a source is one
  object literal.
- Max 15 items parsed per feed, max 50 returned total — these caps are
  in the code and tune the cost/quality trade-off.

## When we would reconsider

Signals that would force a re-design:

- A feed source repeatedly breaks our regex parser → swap to
  `fast-xml-parser` inside the Worker.
- We outgrow the free tier and the bill becomes non-trivial → add
  Cloudflare KV or Durable Objects to cache normalized JSON for
  longer, reducing upstream fetches.
- We need historical news search → introduce a tiny index (SQLite on
  a cron? Cloudflare D1?) — but this is genuinely out of scope for a
  news feed widget.

## References

- Source: `workers/news-parser/src/index.ts`
- Client fallback chain: `src/services/newsService.ts`
- Config: `workers/news-parser/wrangler.toml`
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Related: ADR 0001 (client-only architecture)
