import { describe, expect, it } from 'bun:test';
import worker from './index';

const SECRET = 'test-session-secret';

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sessionToken(sub = 'user-1'): Promise<string> {
  const payload = base64Url(JSON.stringify({ sub, role: 'researcher', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  let binary = '';
  for (const byte of signature) binary += String.fromCharCode(byte);
  return `${payload}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
}

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`https://api.example.test${path}`, init);
}

describe('research api boundary', () => {
  it('reports readiness without exposing secrets and fails closed when bindings are absent', async () => {
    const response = await worker.fetch(request('/health'), { CORS_ORIGINS: 'https://app.example' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      ready: false,
      bindings: { db: false, session: false, aiGateway: false, rateLimiter: false, rateLimitKvFallback: false },
    });
  });

  it('rejects an untrusted origin before authentication', async () => {
    const response = await worker.fetch(request('/v1/me', { headers: { Origin: 'https://evil.example' } }), {
      CORS_ORIGINS: 'https://app.example',
      SESSION_SECRET: SECRET,
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe('CORS_ORIGIN_NOT_ALLOWED');
  });

  it('does not echo an unsafe request id into response headers', async () => {
    const response = await worker.fetch(request('/health', { headers: { 'X-Request-Id': 'unsafe id' } }), {
      CORS_ORIGINS: 'https://app.example',
    });
    expect(response.status).toBe(200);
    const id = response.headers.get('X-Request-Id') || '';
    expect(id).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/);
    expect(id).not.toContain(' ');
  });

  it('keeps safe CORS headers on an authenticated-route error', async () => {
    const response = await worker.fetch(request('/v1/me', { headers: { Origin: 'https://app.example' } }), {
      CORS_ORIGINS: 'https://app.example',
      SESSION_SECRET: SECRET,
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });

  it('supports HttpOnly session cookies but requires the CSRF pair for writes', async () => {
    const token = await sessionToken();
    const env = { SESSION_SECRET: SECRET };
    const getResponse = await worker.fetch(request('/v1/me', { headers: { Cookie: `cpl_session=${token}` } }), env);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ id: 'user-1', role: 'researcher' });

    const postResponse = await worker.fetch(request('/v1/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `cpl_session=${token}; cpl_csrf=csrf-1` },
      body: JSON.stringify({ title: 'Test', payload: { ok: true } }),
    }), env);
    expect(postResponse.status).toBe(403);
    expect((await postResponse.json()).error).toBe('CSRF_REQUIRED');
  });

  it('does not allow a user to overwrite another user research id', async () => {
    const token = await sessionToken('user-2');
    const statement = {
      bind() { return this; },
      async first() { return { user_id: 'user-1' }; },
      async all() { return { results: [] }; },
      async run() { return {}; },
    };
    const env = {
      SESSION_SECRET: SECRET,
      DB: { prepare() { return statement; } },
    };
    const response = await worker.fetch(request('/v1/research', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'shared-id', title: 'Test', payload: { ok: true } }),
    }), env);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('RESEARCH_ID_CONFLICT');
  });

  it('rejects a duplicate AI request id before touching the upstream gateway', async () => {
    const token = await sessionToken();
    let upstreamCalls = 0;
    const statement = {
      bind() { return this; },
      async first() { return { request_id: 'req-1' }; },
      async all() { return { results: [] }; },
      async run() { return {}; },
    };
    const claimStatement = {
      bind() { return this; },
      async first() { return null; },
      async all() { return { results: [] }; },
      async run() { return { meta: { changes: 0 } }; },
    };
    const env = {
      SESSION_SECRET: SECRET,
      DB: { prepare(query: string) { return query.includes('ai_request_claims') ? claimStatement : statement; } },
      RATE_LIMITER: { async limit() { return { success: true }; } },
      AI_GATEWAY_URL: 'https://gateway.example.test/ai',
      AI_GATEWAY_ORIGINS: 'https://gateway.example.test',
      AI_GATEWAY_TOKEN: 'gateway-token',
      AI_ALLOWED_PROVIDERS: 'openai',
      AI_ALLOWED_MODELS: 'gpt-4o-mini',
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => { upstreamCalls += 1; return new Response('{}'); }) as typeof fetch;
    try {
      const response = await worker.fetch(request('/v1/ai', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': 'req-1' },
        body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt: 'test' }),
      }), env);
      expect(response.status).toBe(409);
      expect((await response.json()).error).toBe('DUPLICATE_REQUEST_ID');
      expect(upstreamCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('bounds an upstream response while reading the stream', async () => {
    const token = await sessionToken();
    const statement = {
      bind() { return this; },
      async first() { return null; },
      async all() { return { results: [] }; },
      async run() { return {}; },
    };
    const claimStatement = {
      bind() { return this; },
      async first() { return null; },
      async all() { return { results: [] }; },
      async run() { return { meta: { changes: 1 } }; },
    };
    const env = {
      SESSION_SECRET: SECRET,
      DB: { prepare(query: string) { return query.includes('INSERT OR IGNORE INTO ai_request_claims') ? claimStatement : statement; } },
      RATE_LIMITER: { async limit() { return { success: true }; } },
      AI_GATEWAY_URL: 'https://gateway.example.test/ai',
      AI_GATEWAY_ORIGINS: 'https://gateway.example.test',
      AI_GATEWAY_TOKEN: 'gateway-token',
      AI_ALLOWED_PROVIDERS: 'openai',
      AI_ALLOWED_MODELS: 'gpt-4o-mini',
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ text: 'x'.repeat(100_001) }))) as typeof fetch;
    try {
      const response = await worker.fetch(request('/v1/ai', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': 'req-large' },
        body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt: 'test' }),
      }), env);
      expect(response.status).toBe(502);
      expect((await response.json()).error).toBe('AI_RESPONSE_TOO_LARGE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('allows only one concurrent upstream call for the same request id', async () => {
    const token = await sessionToken();
    let claimed = false;
    let upstreamCalls = 0;
    const db = {
      prepare(query: string) {
        return {
          bind() { return this; },
          async first() { return null; },
          async all() { return { results: [] }; },
          async run() {
            if (query.includes('INSERT OR IGNORE INTO ai_request_claims')) {
              if (claimed) return { meta: { changes: 0 } };
              claimed = true;
              return { meta: { changes: 1 } };
            }
            if (query.includes('DELETE FROM ai_request_claims WHERE request_id')) {
              claimed = false;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 1 } };
          },
        };
      },
    };
    const env = {
      SESSION_SECRET: SECRET,
      DB: db,
      RATE_LIMITER: { async limit() { return { success: true }; } },
      AI_GATEWAY_URL: 'https://gateway.example.test/ai',
      AI_GATEWAY_ORIGINS: 'https://gateway.example.test',
      AI_GATEWAY_TOKEN: 'gateway-token',
      AI_ALLOWED_PROVIDERS: 'openai',
      AI_ALLOWED_MODELS: 'gpt-4o-mini',
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      upstreamCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ text: 'ok' }), { status: 200 });
    }) as typeof fetch;
    const init = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': 'req-concurrent' },
      body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt: 'test' }),
    } satisfies RequestInit;
    try {
      const [first, second] = await Promise.all([
        worker.fetch(request('/v1/ai', init), env),
        worker.fetch(request('/v1/ai', init), env),
      ]);
      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 409]);
      expect(upstreamCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('keeps a completed request idempotent after the in-flight claim is released', async () => {
    const token = await sessionToken();
    let ledgerSaved = false;
    let upstreamCalls = 0;
    const db = {
      prepare(query: string) {
        return {
          bind() { return this; },
          async first() { return query.includes('usage_ledger') && ledgerSaved ? { request_id: 'req-replay' } : null; },
          async all() { return { results: [] }; },
          async run() {
            if (query.includes('INSERT OR IGNORE INTO ai_request_claims')) return { meta: { changes: 1 } };
            if (query.includes('INSERT OR IGNORE INTO usage_ledger')) { ledgerSaved = true; return { meta: { changes: 1 } }; }
            return { meta: { changes: 1 } };
          },
        };
      },
    };
    const env = {
      SESSION_SECRET: SECRET,
      DB: db,
      RATE_LIMITER: { async limit() { return { success: true }; } },
      AI_GATEWAY_URL: 'https://gateway.example.test/ai',
      AI_GATEWAY_ORIGINS: 'https://gateway.example.test',
      AI_GATEWAY_TOKEN: 'gateway-token',
      AI_ALLOWED_PROVIDERS: 'openai',
      AI_ALLOWED_MODELS: 'gpt-4o-mini',
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      upstreamCalls += 1;
      return new Response(JSON.stringify({ text: 'ok' }), { status: 200 });
    }) as typeof fetch;
    const init = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': 'req-replay' },
      body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt: 'test' }),
    } satisfies RequestInit;
    try {
      const first = await worker.fetch(request('/v1/ai', init), env);
      const replay = await worker.fetch(request('/v1/ai', init), env);
      expect(first.status).toBe(200);
      expect(replay.status).toBe(409);
      expect((await replay.json()).error).toBe('DUPLICATE_REQUEST_ID');
      expect(upstreamCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
