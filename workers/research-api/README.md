# CryptoPulse Research API

Reference Cloudflare Worker for the future commercial Research Lab backend.
It is intentionally fail-closed until production bindings and an upstream
identity provider are configured. It is not deployed by the repository's
frontend workflow.

## Endpoints

- `GET /health` — readiness flags only; never returns secrets.
- `GET /v1/me` — signed-session identity.
- `GET /v1/research` — the authenticated user's saved research runs.
- `POST /v1/research` — save one bounded paper-research artifact.
- `POST /v1/ai` — authenticated, rate-limited server AI proxy. Provider keys
  stay in the upstream gateway and are never accepted from the browser.

## Required secrets and bindings

- `SESSION_SECRET` — HMAC secret used to verify a session token issued by the
  trusted Eclipse identity service. This Worker does not mint user sessions.
- `AI_GATEWAY_URL` and `AI_GATEWAY_TOKEN` — private upstream AI gateway.
- `DB` — D1 database migrated with `schema.sql`.
- `RATE_LIMITER` — preferred Cloudflare Rate Limiting binding for the per-user
  AI window. `RATE_LIMIT_KV` is a fail-closed local/reference fallback; its
  get/put pair is not atomic under concurrent requests and must not be treated
  as the production quota boundary.
- `CORS_ORIGINS` — comma-separated exact origins; wildcard is rejected.
- `AI_GATEWAY_ORIGINS` — comma-separated exact HTTPS origins allowed for the
  private upstream gateway. The Worker rejects an endpoint outside this list.
- `AI_ALLOWED_MODELS` — comma-separated provider model allowlist. Empty means
  every AI request is rejected until an explicit allowlist exists.

The `ai_request_claims` table provides an atomic duplicate-request claim before
an upstream AI call. Claims older than ten minutes are reaped opportunistically;
successful requests and recoverable upstream failures release their claim.
Completed request ids remain rejected through `usage_ledger`, so replaying the
same id cannot trigger a second upstream AI charge.

The session token format is `<base64url(payload)>.<base64url(hmac-sha256)>`,
where payload contains `sub`, `role` and an expiry `exp`. The identity service
must sign it with the same `SESSION_SECRET`. The token can be sent as a Bearer
token or as an HttpOnly `cpl_session` cookie; the Worker does not mint sessions.
Cookie-authenticated `POST` requests also require the double-submit CSRF pair:
the identity layer sets a readable `cpl_csrf` cookie and the client echoes it
as `X-CSRF-Token`. Bearer-authenticated requests do not need that browser CSRF
header.

## Local setup

From the repository root, the reference checks are:

```bash
npm run test:worker
npm run build:worker
```

```bash
npm install
bun test
npx wrangler d1 create cryptopulse-research
npx wrangler kv namespace create RATE_LIMIT_KV
# Put the returned IDs into wrangler.toml, then:
npx wrangler d1 execute cryptopulse-research --file=schema.sql --remote
npx wrangler secret put SESSION_SECRET
npx wrangler secret put AI_GATEWAY_TOKEN
npx wrangler secret put AI_GATEWAY_URL
npx wrangler deploy
```

Before production, run a smoke flow for login, `/v1/me`, research save/list,
an ownership-conflict attempt, one AI request, a quota rejection, a duplicate
request id and an upstream timeout. Configure `AI_GATEWAY_ORIGINS` and the
production Rate Limiting binding first. Do not enable the frontend
`VITE_AI_GATEWAY_MODE=server` switch before those checks pass.
