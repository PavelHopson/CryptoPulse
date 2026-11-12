import type { StrategyLabResult } from './strategyLab';

const MAX_TITLE_CHARS = 160;
const MAX_PAYLOAD_CHARS = 200_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 30_000;

export interface ResearchRun<TPayload = unknown> {
  id: string;
  title: string;
  payload: TPayload;
  createdAt: string;
}

export interface ResearchListResult<TPayload = unknown> {
  configured: boolean;
  runs: ResearchRun<TPayload>[];
}

export interface ResearchSaveResult {
  configured: boolean;
  saved: boolean;
  id?: string;
  title?: string;
  createdAt?: string;
}

export interface ResearchApiDependencies {
  /** Injected in tests; browser code uses global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Override the Vite value in tests or an embedded host. */
  baseUrl?: string;
  /** Stable ids let the server make retries idempotent. */
  requestId?: () => string;
  /** Readable double-submit CSRF cookie from the identity layer. */
  csrfToken?: () => string | undefined;
  timeoutMs?: number;
}

export type ResearchApiErrorCode =
  | 'ENDPOINT_INVALID'
  | 'UNAUTHORIZED'
  | 'TRANSPORT_UNAVAILABLE'
  | 'TIMEOUT'
  | 'REQUEST_FAILED'
  | 'RESPONSE_INVALID'
  | 'RESPONSE_TOO_LARGE'
  | 'PAYLOAD_TOO_LARGE'
  | 'PAYLOAD_INVALID';

export class ResearchApiError extends Error {
  override readonly name = 'ResearchApiError';

  constructor(
    readonly code: ResearchApiErrorCode,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(code);
  }
}

function isUnsafeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host === '::' || host.endsWith('.local')) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return true;
    const [first, second] = octets;
    return first === 0
      || first === 10
      || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 198 && (second === 18 || second === 19))
      || first >= 224;
  }

  if (host.includes(':')) {
    if (host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host)) return true;
    if (host.startsWith('::ffff:')) return true;
  }
  return false;
}

function rawConfiguredUrl(dependencies: ResearchApiDependencies): string {
  if (dependencies.baseUrl !== undefined) return dependencies.baseUrl.trim();
  return (import.meta.env.VITE_RESEARCH_API_URL || '').trim();
}

/**
 * Return a trusted API origin or null when the feature is intentionally off.
 * The value is a worker root; `/v1/research` is appended by the client.
 */
export function resolveResearchApiBaseUrl(dependencies: ResearchApiDependencies = {}): string | null {
  const raw = rawConfiguredUrl(dependencies);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || isUnsafeHost(host)) {
      throw new Error('untrusted endpoint');
    }
    // Keep path prefixes for a reverse proxy, but remove query/hash and a trailing slash.
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new ResearchApiError('ENDPOINT_INVALID');
  }
}

function endpoint(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  const path = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = path.endsWith('/v1') ? `${path}/research` : `${path}/v1/research`;
  return parsed.toString();
}

function requestId(dependencies: ResearchApiDependencies): string {
  const generated = dependencies.requestId?.() || (typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `cpl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const normalized = generated.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(normalized) ? normalized : `cpl-${Date.now()}`;
}

function timeoutMs(dependencies: ResearchApiDependencies): number {
  const value = dependencies.timeoutMs;
  return Number.isFinite(value) && (value || 0) > 0 ? Math.min(value as number, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
}

function readableCsrfToken(dependencies: ResearchApiDependencies): string | undefined {
  if (dependencies.csrfToken) return dependencies.csrfToken();
  if (typeof document === 'undefined') return undefined;
  const token = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('cpl_csrf='));
  return token?.slice('cpl_csrf='.length).trim() || undefined;
}

async function parseJson(response: Response, id: string): Promise<unknown> {
  const declared = response.headers?.get?.('content-length');
  if (declared && Number.isFinite(Number(declared)) && Number(declared) > MAX_PAYLOAD_CHARS + 8_192) {
    throw new ResearchApiError('RESPONSE_TOO_LARGE', response.status, id);
  }
  try {
    const raw = await response.text();
    if (raw.length > MAX_PAYLOAD_CHARS + 8_192) throw new ResearchApiError('RESPONSE_TOO_LARGE', response.status, id);
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof ResearchApiError) throw error;
    throw new ResearchApiError('RESPONSE_INVALID', response.status, id);
  }
}

async function request(
  method: 'GET' | 'POST',
  dependencies: ResearchApiDependencies,
  body?: Record<string, unknown>,
): Promise<{ body: unknown; id: string }> {
  const baseUrl = resolveResearchApiBaseUrl(dependencies);
  if (!baseUrl) return { body: { configured: false }, id: requestId(dependencies) };
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function') throw new ResearchApiError('TRANSPORT_UNAVAILABLE');
  const id = requestId(dependencies);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = setTimeout(() => controller?.abort(), timeoutMs(dependencies));
  const csrf = readableCsrfToken(dependencies);
  try {
    const response = await fetcher(endpoint(baseUrl), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        'X-Request-Id': id,
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: 'include',
      ...(controller ? { signal: controller.signal } : {}),
    });
    const responseBody = await parseJson(response, id);
    if (!response.ok) {
      const code = responseBody && typeof responseBody === 'object' && typeof (responseBody as Record<string, unknown>).error === 'string'
        ? String((responseBody as Record<string, unknown>).error)
        : 'REQUEST_FAILED';
      throw new ResearchApiError(code as ResearchApiErrorCode, response.status, id);
    }
    return { body: responseBody, id };
  } catch (error) {
    if (error instanceof ResearchApiError) throw error;
    if (controller?.signal.aborted) throw new ResearchApiError('TIMEOUT', undefined, id);
    throw new ResearchApiError('REQUEST_FAILED', undefined, id);
  } finally {
    clearTimeout(timer);
  }
}

function parseRuns(value: unknown): ResearchRun[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResearchApiError('RESPONSE_INVALID');
  const runs = (value as Record<string, unknown>).runs;
  if (!Array.isArray(runs)) throw new ResearchApiError('RESPONSE_INVALID');
  return runs.map((run) => {
    if (!run || typeof run !== 'object' || Array.isArray(run)) throw new ResearchApiError('RESPONSE_INVALID');
    const item = run as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.createdAt !== 'string' || !('payload' in item)) throw new ResearchApiError('RESPONSE_INVALID');
    return [{ id: item.id, title: item.title, payload: item.payload, createdAt: item.createdAt }];
  }).flat();
}

function containsSensitiveField(value: unknown, depth = 0): boolean {
  if (depth > 20 || !value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => containsSensitiveField(item, depth + 1));
  return Object.entries(value).some(([key, child]) => {
    if (/^(api[-_]?key|access[-_]?token|refresh[-_]?token|secret|password|authorization)$/i.test(key)) return true;
    return containsSensitiveField(child, depth + 1);
  });
}

export async function listResearchRuns<TPayload = unknown>(dependencies: ResearchApiDependencies = {}): Promise<ResearchListResult<TPayload>> {
  const baseUrl = resolveResearchApiBaseUrl(dependencies);
  if (!baseUrl) return { configured: false, runs: [] };
  const response = await request('GET', dependencies);
  return { configured: true, runs: parseRuns(response.body) as ResearchRun<TPayload>[] };
}

export async function saveResearchRun(
  title: string,
  payload: StrategyLabResult | Record<string, unknown>,
  dependencies: ResearchApiDependencies = {},
): Promise<ResearchSaveResult> {
  const baseUrl = resolveResearchApiBaseUrl(dependencies);
  if (!baseUrl) return { configured: false, saved: false };
  const normalizedTitle = title.trim();
  if (!normalizedTitle || normalizedTitle.length > MAX_TITLE_CHARS) throw new ResearchApiError('PAYLOAD_INVALID');
  let serialized: string;
  try { serialized = JSON.stringify(payload); } catch { throw new ResearchApiError('PAYLOAD_INVALID'); }
  if (!serialized || serialized.length > MAX_PAYLOAD_CHARS) throw new ResearchApiError('PAYLOAD_TOO_LARGE');
  if (containsSensitiveField(payload)) throw new ResearchApiError('PAYLOAD_INVALID');
  const response = await request('POST', dependencies, { title: normalizedTitle, payload });
  if (!response.body || typeof response.body !== 'object' || Array.isArray(response.body)) throw new ResearchApiError('RESPONSE_INVALID', 201, response.id);
  const body = response.body as Record<string, unknown>;
  if (typeof body.id !== 'string' || typeof body.title !== 'string' || typeof body.createdAt !== 'string') throw new ResearchApiError('RESPONSE_INVALID', 201, response.id);
  return { configured: true, saved: true, id: body.id, title: body.title, createdAt: body.createdAt };
}

