import { AI_MODELS, AIProvider } from '../types';

/** The two delivery boundaries are explicit at the call site. */
export type AIGatewayMode = 'client' | 'server';

export interface ClientGatewayRequest {
  mode: 'client';
  provider: AIProvider;
  model: string;
  prompt: string;
  /** Client-only credential. It must never cross into a server payload. */
  apiKey?: string;
  baseUrl?: string;
}

export interface ServerGatewayRequest {
  mode: 'server';
  provider: AIProvider;
  model: string;
  prompt: string;
  /** Required at runtime so a misconfigured server mode fails closed. */
  endpoint: string;
  /** Optional stable id for retries and usage-ledger idempotency. */
  requestId?: string;
}

export type AIGatewayRequest = ClientGatewayRequest | ServerGatewayRequest;

export interface ClientAIInput {
  provider: AIProvider;
  model: string;
  prompt: string;
  apiKey: string;
  baseUrl?: string;
}

export type ClientAIInvoker = (input: ClientAIInput) => Promise<string>;

export interface AIGatewayDependencies {
  /** Injected in tests; production uses the browser fetch implementation. */
  fetch?: typeof globalThis.fetch;
  /** Existing client provider implementation (for example aiService). */
  clientInvoker?: ClientAIInvoker;
  /** Abort a server request that would otherwise keep the UI pending forever. */
  timeoutMs?: number;
}

export interface AIGatewayResponse {
  text: string;
  mode: AIGatewayMode;
  provider: AIProvider;
  model: string;
  receivedAt: string;
  /** Optional server-reported usage; never inferred in client mode. */
  usage?: AIGatewayUsage;
}

export interface AIGatewayUsage {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export const AI_GATEWAY_LIMITS = {
  maxPromptChars: 32_000,
  maxResponseChars: 100_000,
  maxRequestIdChars: 128,
} as const;

export type AIGatewayErrorCode =
  | 'EMPTY_PROMPT'
  | 'PROMPT_TOO_LARGE'
  | 'INVALID_PROVIDER'
  | 'CLIENT_KEY_REQUIRED'
  | 'CLIENT_BASE_URL_INVALID'
  | 'CLIENT_ADAPTER_REQUIRED'
  | 'CLIENT_REQUEST_FAILED'
  | 'SERVER_ENDPOINT_REQUIRED'
  | 'SERVER_ENDPOINT_INVALID'
  | 'SERVER_TRANSPORT_REQUIRED'
  | 'SERVER_TIMEOUT'
  | 'SERVER_REQUEST_FAILED'
  | 'SERVER_RESPONSE_INVALID'
  | 'SERVER_RESPONSE_TOO_LARGE'
  | 'SERVER_USAGE_INVALID';

const ERROR_MESSAGES: Record<AIGatewayErrorCode, string> = {
  EMPTY_PROMPT: 'AI-запрос не может быть пустым.',
  PROMPT_TOO_LARGE: 'AI-запрос превышает допустимый размер.',
  INVALID_PROVIDER: 'AI-провайдер не поддерживается.',
  CLIENT_KEY_REQUIRED: 'Для выбранного AI-провайдера нужен ключ в client-режиме.',
  CLIENT_BASE_URL_INVALID: 'Client AI endpoint разрешён только для доверенного локального или официального адреса.',
  CLIENT_ADAPTER_REQUIRED: 'Client AI adapter не подключён.',
  CLIENT_REQUEST_FAILED: 'Не удалось выполнить client AI-запрос.',
  SERVER_ENDPOINT_REQUIRED: 'Server AI gateway endpoint не настроен.',
  SERVER_ENDPOINT_INVALID: 'Server AI gateway endpoint некорректен.',
  SERVER_TRANSPORT_REQUIRED: 'Server AI transport недоступен.',
  SERVER_TIMEOUT: 'Server AI gateway не ответил вовремя.',
  SERVER_REQUEST_FAILED: 'Server AI gateway временно недоступен.',
  SERVER_RESPONSE_INVALID: 'Server AI gateway вернул некорректный ответ.',
  SERVER_RESPONSE_TOO_LARGE: 'Server AI gateway вернул слишком большой ответ.',
  SERVER_USAGE_INVALID: 'Server AI gateway вернул некорректную статистику использования.',
};

export class AIGatewayError extends Error {
  override readonly name = 'AIGatewayError';

  constructor(
    readonly code: AIGatewayErrorCode,
    readonly mode: AIGatewayMode,
  ) {
    super(ERROR_MESSAGES[code]);
  }
}

function isProvider(value: string): value is AIProvider {
  return Object.prototype.hasOwnProperty.call(AI_MODELS, value);
}

function requirePrompt(prompt: string, mode: AIGatewayMode): string {
  const normalized = prompt.trim();
  if (!normalized) throw new AIGatewayError('EMPTY_PROMPT', mode);
  if (normalized.length > AI_GATEWAY_LIMITS.maxPromptChars) throw new AIGatewayError('PROMPT_TOO_LARGE', mode);
  return normalized;
}

function isUnsafeServerHost(hostname: string): boolean {
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
    // URL canonicalizes IPv4-mapped addresses to hex (for example ::ffff:7f00:1).
    // Reject the whole mapped range so private forms cannot bypass the filter.
    if (host.startsWith('::ffff:')) return true;
  }

  return false;
}

function requireServerEndpoint(endpoint: string | undefined): string {
  const normalized = endpoint?.trim() || '';
  if (!normalized) throw new AIGatewayError('SERVER_ENDPOINT_REQUIRED', 'server');

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
    if ((!isLocal && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || (!isLocal && isUnsafeServerHost(host))) {
      throw new Error('unsupported endpoint');
    }
  } catch {
    throw new AIGatewayError('SERVER_ENDPOINT_INVALID', 'server');
  }

  return normalized;
}

function readableCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
    .trim();
  return value || undefined;
}

function requireClientBaseUrl(provider: AIProvider, baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined;
  try {
    const url = new URL(baseUrl);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error('unsupported endpoint');
    }
    const host = url.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
    const isOfficialNvidia = provider === 'nvidia' && url.origin === 'https://integrate.api.nvidia.com';
    if (provider === 'ollama' && !isLocal) throw new Error('non-local Ollama endpoint');
    if (provider === 'nvidia' && !isOfficialNvidia) throw new Error('non-official NVIDIA endpoint');
    if (provider !== 'ollama' && provider !== 'nvidia') throw new Error('unsupported custom endpoint');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new AIGatewayError('CLIENT_BASE_URL_INVALID', 'client');
  }
}

function result(text: string, request: AIGatewayRequest, usage?: AIGatewayUsage): AIGatewayResponse {
  return {
    text,
    mode: request.mode,
    provider: request.provider,
    model: request.model,
    receivedAt: new Date().toISOString(),
    ...(usage ? { usage } : {}),
  };
}

function parseUsage(value: unknown): AIGatewayUsage | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AIGatewayError('SERVER_USAGE_INVALID', 'server');
  const usage: AIGatewayUsage = {};
  for (const key of ['inputTokens', 'outputTokens', 'costUsd'] as const) {
    const candidate = (value as Record<string, unknown>)[key];
    if (candidate === undefined) continue;
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0) {
      throw new AIGatewayError('SERVER_USAGE_INVALID', 'server');
    }
    usage[key] = candidate;
  }
  return Object.keys(usage).length > 0 ? usage : undefined;
}

function requestIdForHeader(requestId: string | undefined): string {
  const candidate = requestId?.trim() || '';
  if (candidate && candidate.length <= AI_GATEWAY_LIMITS.maxRequestIdChars && /^[A-Za-z0-9._:-]+$/.test(candidate)) {
    return candidate;
  }
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `cpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function callClient(request: ClientGatewayRequest, dependencies: AIGatewayDependencies): Promise<AIGatewayResponse> {
  if (!isProvider(request.provider)) throw new AIGatewayError('INVALID_PROVIDER', 'client');
  const baseUrl = requireClientBaseUrl(request.provider, request.baseUrl);

  const apiKey = request.apiKey || '';
  if (AI_MODELS[request.provider].needsKey && !apiKey.trim()) {
    throw new AIGatewayError('CLIENT_KEY_REQUIRED', 'client');
  }
  if (!dependencies.clientInvoker) throw new AIGatewayError('CLIENT_ADAPTER_REQUIRED', 'client');

  try {
    const text = await dependencies.clientInvoker({
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
    });
    return result(text, request);
  } catch (error) {
    // Never log or interpolate provider errors: SDK errors can contain credentials.
    if (error instanceof AIGatewayError) throw error;
    throw new AIGatewayError('CLIENT_REQUEST_FAILED', 'client');
  }
}

async function callServer(request: ServerGatewayRequest, dependencies: AIGatewayDependencies): Promise<AIGatewayResponse> {
  if (!isProvider(request.provider)) throw new AIGatewayError('INVALID_PROVIDER', 'server');
  const endpoint = requireServerEndpoint(request.endpoint);
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function') throw new AIGatewayError('SERVER_TRANSPORT_REQUIRED', 'server');

  // Build a new payload so a client API key cannot cross the server boundary.
  const payload = {
    provider: request.provider,
    model: request.model,
    prompt: request.prompt,
  };
  const requestId = requestIdForHeader(request.requestId);

  let response: Response;
  const timeoutMs = Number.isFinite(dependencies.timeoutMs) && (dependencies.timeoutMs ?? 0) > 0
    ? Math.min(dependencies.timeoutMs as number, 120_000)
    : 30_000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = setTimeout(() => controller?.abort(), timeoutMs);
  const csrfToken = readableCookie('cpl_csrf');
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(payload),
      // The future Research API authenticates with an HttpOnly session cookie.
      // Keep provider keys out of the browser request and let the identity
      // boundary attach the session without exposing it to application code.
      credentials: 'include',
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (controller?.signal.aborted) throw new AIGatewayError('SERVER_TIMEOUT', 'server');
    throw new AIGatewayError('SERVER_REQUEST_FAILED', 'server');
  } finally {
    clearTimeout(timeout);
  }

  const declaredLength = response.headers?.get?.('content-length');
  if (declaredLength && Number.isFinite(Number(declaredLength)) && Number(declaredLength) > AI_GATEWAY_LIMITS.maxResponseChars + 4096) {
    throw new AIGatewayError('SERVER_RESPONSE_TOO_LARGE', 'server');
  }

  let body: unknown;
  try {
    if (typeof response.text === 'function') {
      const raw = await response.text();
      if (raw.length > AI_GATEWAY_LIMITS.maxResponseChars + 4096) {
        throw new AIGatewayError('SERVER_RESPONSE_TOO_LARGE', 'server');
      }
      body = JSON.parse(raw) as unknown;
    } else {
      body = await response.json();
    }
  } catch (error) {
    if (error instanceof AIGatewayError) throw error;
    throw new AIGatewayError('SERVER_RESPONSE_INVALID', 'server');
  }

  if (!response.ok) throw new AIGatewayError('SERVER_REQUEST_FAILED', 'server');
  if (!body || typeof body !== 'object' || typeof (body as { text?: unknown }).text !== 'string') {
    throw new AIGatewayError('SERVER_RESPONSE_INVALID', 'server');
  }

  const text = (body as { text: string }).text;
  if (text.length > AI_GATEWAY_LIMITS.maxResponseChars) {
    throw new AIGatewayError('SERVER_RESPONSE_TOO_LARGE', 'server');
  }
  const usage = parseUsage((body as { usage?: unknown }).usage);
  return result(text, request, usage);
}

/**
 * Small transport boundary for future server-backed AI. Existing client
 * providers stay behind `clientInvoker`; server mode only sends safe fields.
 */
export async function callAIGateway(
  request: AIGatewayRequest,
  dependencies: AIGatewayDependencies = {},
): Promise<AIGatewayResponse> {
  const prompt = requirePrompt(request.prompt, request.mode);
  const normalizedRequest = { ...request, prompt } as AIGatewayRequest;
  return normalizedRequest.mode === 'client'
    ? callClient(normalizedRequest, dependencies)
    : callServer(normalizedRequest, dependencies);
}
