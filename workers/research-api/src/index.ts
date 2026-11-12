const MAX_PROMPT_CHARS = 32_000;
const MAX_RESPONSE_CHARS = 100_000;
const MAX_RESEARCH_PAYLOAD_CHARS = 200_000;
const MAX_REQUEST_BODY_CHARS = 260_000;
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;
const AI_CLAIM_TTL_MS = 10 * 60 * 1000;

interface D1RunResult {
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<D1RunResult>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface KVNamespace {
  get(key: string, type: 'text'): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface RateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  DB?: D1Database;
  RATE_LIMIT_KV?: KVNamespace;
  RATE_LIMITER?: RateLimiter;
  CORS_ORIGINS?: string;
  SESSION_SECRET?: string;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_GATEWAY_ORIGINS?: string;
  AI_ALLOWED_PROVIDERS?: string;
  AI_ALLOWED_MODELS?: string;
}

interface Session {
  sub: string;
  role: string;
  exp: number;
}

interface ResearchRun {
  id: string;
  title: string;
  payload: unknown;
  createdAt: string;
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function error(code: string, status: number, requestId: string): Response {
  return json({ error: code, requestId }, status);
}

function requestId(request: Request): string {
  const candidate = request.headers.get('X-Request-Id')?.trim() || '';
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(candidate) ? candidate : crypto.randomUUID();
}

function allowedOrigins(env: Env): string[] {
  return (env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> | null {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return origin ? null : {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-CSRF-Token, X-Request-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let value = '';
  for (const byte of array) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function cookieValue(request: Request, name: string): string {
  return (request.headers.get('Cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
    .trim() || '';
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function sign(secret: string, value: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
}

async function verifySession(request: Request, env: Env): Promise<Session | null> {
  if (!env.SESSION_SECRET) return null;
  const authorization = request.headers.get('Authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const cookieToken = cookieValue(request, 'cpl_session');
  const token = bearer || cookieToken;
  if (token.length > 4096) return null;
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart))) as Partial<Session>;
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.role !== 'string' || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    const expected = base64Url(await sign(env.SESSION_SECRET, payloadPart));
    const expectedBytes = new TextEncoder().encode(expected);
    const actualBytes = new TextEncoder().encode(signaturePart);
    if (expectedBytes.length !== actualBytes.length) return null;
    let mismatch = 0;
    for (let index = 0; index < expectedBytes.length; index += 1) mismatch |= expectedBytes[index] ^ actualBytes[index];
    return mismatch === 0 ? payload as Session : null;
  } catch {
    return null;
  }
}

async function requireSession(request: Request, env: Env, id: string): Promise<Session | Response> {
  if (!env.SESSION_SECRET) return error('AUTH_NOT_CONFIGURED', 503, id);
  const hasBearer = (request.headers.get('Authorization') || '').startsWith('Bearer ');
  if (!hasBearer && cookieValue(request, 'cpl_session') && request.method !== 'GET') {
    const csrfCookie = cookieValue(request, 'cpl_csrf');
    const csrfHeader = request.headers.get('X-CSRF-Token')?.trim() || '';
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader || csrfHeader.length > 256) {
      return error('CSRF_REQUIRED', 403, id);
    }
  }
  const session = await verifySession(request, env);
  return session || error('UNAUTHORIZED', 401, id);
}

async function readJson(request: Request, maxChars: number): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > maxChars) return null;
  const raw = await request.text();
  if (raw.length > maxChars) return null;
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

function list(value: string | undefined): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(response.headers.get('Content-Length') || 0);
  if (declared > maxBytes) return null;
  if (!response.body) {
    const raw = await response.text();
    return raw.length <= maxBytes ? raw : null;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
      if (text.length > maxBytes) {
        await reader.cancel();
        return null;
      }
    }
    text += decoder.decode();
    return text.length <= maxBytes ? text : null;
  } finally {
    reader.releaseLock();
  }
}

function trustedAiGateway(env: Env): string | null {
  const endpoint = env.AI_GATEWAY_URL?.trim() || '';
  if (!endpoint || !env.AI_GATEWAY_TOKEN?.trim()) return null;
  try {
    const url = new URL(endpoint);
    const allowedOrigins = list(env.AI_GATEWAY_ORIGINS);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !allowedOrigins.includes(url.origin)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function consumeRateLimit(env: Env, userId: string, id: string): Promise<Response | null> {
  const key = `ai:${userId}`;
  if (env.RATE_LIMITER) {
    try {
      const result = await env.RATE_LIMITER.limit({ key });
      return result.success ? null : error('RATE_LIMITED', 429, id);
    } catch {
      return error('RATE_LIMIT_UNAVAILABLE', 503, id);
    }
  }
  if (!env.RATE_LIMIT_KV) return error('RATE_LIMIT_NOT_CONFIGURED', 503, id);
  const window = Math.floor(Date.now() / 1000 / RATE_WINDOW_SECONDS);
  const windowKey = `${key}:${window}`;
  try {
    const current = Number(await env.RATE_LIMIT_KV.get(windowKey, 'text') || '0');
    if (!Number.isFinite(current) || current >= RATE_LIMIT) return error('RATE_LIMITED', 429, id);
    await env.RATE_LIMIT_KV.put(windowKey, String(current + 1), { expirationTtl: RATE_WINDOW_SECONDS + 5 });
    return null;
  } catch {
    return error('RATE_LIMIT_UNAVAILABLE', 503, id);
  }
}

async function releaseAiClaim(env: Env, id: string): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare('DELETE FROM ai_request_claims WHERE request_id = ?1').bind(id).run();
  } catch {
    // Preserve the original request error. A stale claim will be reaped later.
  }
}

async function listResearch(env: Env, session: Session, id: string): Promise<Response> {
  if (!env.DB) return error('STORAGE_NOT_CONFIGURED', 503, id);
  const result = await env.DB.prepare('SELECT id, title, payload_json, created_at FROM research_runs WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 100').bind(session.sub).all<{ id: string; title: string; payload_json: string; created_at: string }>();
  const runs: ResearchRun[] = result.results.map((row) => ({ id: row.id, title: row.title, payload: JSON.parse(row.payload_json), createdAt: row.created_at }));
  return json({ runs }, 200, { 'X-Request-Id': id });
}

async function saveResearch(request: Request, env: Env, session: Session, id: string): Promise<Response> {
  if (!env.DB) return error('STORAGE_NOT_CONFIGURED', 503, id);
  let body: Record<string, unknown> | null;
  try { body = await readJson(request, MAX_REQUEST_BODY_CHARS); } catch { body = null; }
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : '';
  const payload = body?.payload;
  const payloadJson = payload === undefined ? '' : JSON.stringify(payload);
  if (!title || !payloadJson || payloadJson.length > MAX_RESEARCH_PAYLOAD_CHARS) return error('INVALID_RESEARCH_PAYLOAD', 413, id);
  const runId = typeof body?.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(body.id) ? body.id : crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const existing = await env.DB.prepare('SELECT user_id FROM research_runs WHERE id = ?1 LIMIT 1').bind(runId).first<{ user_id: string }>();
  if (existing && existing.user_id !== session.sub) return error('RESEARCH_ID_CONFLICT', 409, id);
  if (existing) {
    await env.DB.prepare('UPDATE research_runs SET title = ?1, payload_json = ?2, created_at = ?3 WHERE id = ?4 AND user_id = ?5').bind(title, payloadJson, createdAt, runId, session.sub).run();
  } else {
    await env.DB.prepare('INSERT INTO research_runs (id, user_id, title, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(runId, session.sub, title, payloadJson, createdAt).run();
  }
  return json({ id: runId, title, createdAt }, 201, { 'X-Request-Id': id });
}

async function callAi(request: Request, env: Env, session: Session, id: string): Promise<Response> {
  if (!env.DB) return error('STORAGE_NOT_CONFIGURED', 503, id);
  let body: Record<string, unknown> | null;
  try { body = await readJson(request, MAX_REQUEST_BODY_CHARS); } catch { body = null; }
  const provider = typeof body?.provider === 'string' ? body.provider : '';
  const model = typeof body?.model === 'string' ? body.model : '';
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!list(env.AI_ALLOWED_PROVIDERS).includes(provider) || !list(env.AI_ALLOWED_MODELS).includes(model)) return error('AI_MODEL_NOT_ALLOWED', 403, id);
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return error('INVALID_PROMPT', 413, id);

  // Keep completed request ids idempotent even after the in-flight claim is
  // released. The primary-key claim below handles concurrent duplicates.
  const completed = await env.DB.prepare('SELECT request_id FROM usage_ledger WHERE request_id = ?1 LIMIT 1').bind(id).first<{ request_id: string }>();
  if (completed) return error('DUPLICATE_REQUEST_ID', 409, id);

  // D1's primary-key insert is the atomic claim. A duplicate request is
  // rejected before any rate-limit or upstream work can happen.
  try {
    await env.DB.prepare('DELETE FROM ai_request_claims WHERE claimed_at < ?1').bind(new Date(Date.now() - AI_CLAIM_TTL_MS).toISOString()).run();
    const claim = await env.DB.prepare('INSERT OR IGNORE INTO ai_request_claims (request_id, user_id, claimed_at) VALUES (?1, ?2, ?3)').bind(id, session.sub, new Date().toISOString()).run();
    const changes = (claim as { meta?: { changes?: number }} | null)?.meta?.changes;
    if (typeof changes === 'number' && changes === 0) return error('DUPLICATE_REQUEST_ID', 409, id);
  } catch {
    return error('REQUEST_CLAIM_UNAVAILABLE', 503, id);
  }

  const limited = await consumeRateLimit(env, session.sub, id);
  if (limited) { await releaseAiClaim(env, id); return limited; }
  const endpoint = trustedAiGateway(env);
  const token = env.AI_GATEWAY_TOKEN?.trim();
  if (!endpoint || !token) { await releaseAiClaim(env, id); return error('AI_GATEWAY_NOT_CONFIGURED', 503, id); }

  let upstream: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': id },
      body: JSON.stringify({ provider, model, prompt }),
      signal: controller.signal,
    });
  } catch {
    await releaseAiClaim(env, id);
    return error(controller.signal.aborted ? 'AI_UPSTREAM_TIMEOUT' : 'AI_UPSTREAM_FAILED', 502, id);
  } finally {
    clearTimeout(timeout);
  }
  const raw = await readBoundedText(upstream, MAX_RESPONSE_CHARS + 4096);
  if (raw === null) { await releaseAiClaim(env, id); return error('AI_RESPONSE_TOO_LARGE', 502, id); }
  let response: Record<string, unknown>;
  try { response = JSON.parse(raw) as Record<string, unknown>; } catch { await releaseAiClaim(env, id); return error('AI_RESPONSE_INVALID', 502, id); }
  if (!upstream.ok) { await releaseAiClaim(env, id); return error('AI_UPSTREAM_FAILED', 502, id); }
  if (typeof response.text !== 'string') { await releaseAiClaim(env, id); return error('AI_UPSTREAM_FAILED', 502, id); }
  if (response.text.length > MAX_RESPONSE_CHARS) { await releaseAiClaim(env, id); return error('AI_RESPONSE_TOO_LARGE', 502, id); }
  const usage = response.usage && typeof response.usage === 'object' && !Array.isArray(response.usage) ? response.usage as Record<string, unknown> : {};
  const inputTokens = typeof usage.inputTokens === 'number' && usage.inputTokens >= 0 ? usage.inputTokens : 0;
  const outputTokens = typeof usage.outputTokens === 'number' && usage.outputTokens >= 0 ? usage.outputTokens : 0;
  const costUsd = typeof usage.costUsd === 'number' && usage.costUsd >= 0 ? usage.costUsd : null;
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO usage_ledger (request_id, user_id, provider, model, input_tokens, output_tokens, cost_usd, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)').bind(id, session.sub, provider, model, inputTokens, outputTokens, costUsd, new Date().toISOString()).run();
  } catch {
    await releaseAiClaim(env, id);
    return error('USAGE_LEDGER_UNAVAILABLE', 503, id);
  }
  await releaseAiClaim(env, id);
  return json({ text: response.text, usage: { inputTokens, outputTokens, ...(costUsd === null ? {} : { costUsd }) }, requestId: id }, 200, { 'X-Request-Id': id });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = requestId(request);
    const cors = corsHeaders(request, env);
    if (cors === null) return error('CORS_ORIGIN_NOT_ALLOWED', 403, id);
    const withCors = (response: Response): Response => {
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok', ready: Boolean(env.DB && env.SESSION_SECRET && trustedAiGateway(env) && (env.RATE_LIMITER || env.RATE_LIMIT_KV)), bindings: { db: Boolean(env.DB), session: Boolean(env.SESSION_SECRET), aiGateway: Boolean(trustedAiGateway(env)), rateLimiter: Boolean(env.RATE_LIMITER), rateLimitKvFallback: Boolean(env.RATE_LIMIT_KV) } }, 200, { ...cors, 'X-Request-Id': id });
    }
    if (request.method !== 'GET' && request.method !== 'POST') return withCors(error('METHOD_NOT_ALLOWED', 405, id));
    const identity = await requireSession(request, env, id);
    if (identity instanceof Response) return withCors(identity);
    try {
      if (url.pathname === '/v1/me' && request.method === 'GET') return withCors(json({ id: identity.sub, role: identity.role }, 200, { ...cors, 'X-Request-Id': id }));
      if (url.pathname === '/v1/research' && request.method === 'GET') return withCors(await listResearch(env, identity, id));
      if (url.pathname === '/v1/research' && request.method === 'POST') return withCors(await saveResearch(request, env, identity, id));
      if (url.pathname === '/v1/ai' && request.method === 'POST') return withCors(await callAi(request, env, identity, id));
      return withCors(error('NOT_FOUND', 404, id));
    } catch {
      return withCors(error('INTERNAL_ERROR', 500, id));
    }
  },
};
