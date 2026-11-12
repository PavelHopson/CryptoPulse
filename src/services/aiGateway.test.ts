import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callAIGateway,
  type ClientAIInput,
} from './aiGateway';

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('aiGateway client/server boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates client mode to the existing adapter with the client-only key', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>().mockResolvedValue('client answer');

    const response = await callAIGateway({
      mode: 'client',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: '  Explain the market  ',
      apiKey: 'sk-client-secret',
    }, { clientInvoker });

    expect(response.text).toBe('client answer');
    expect(response.mode).toBe('client');
    expect(clientInvoker).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'Explain the market',
      apiKey: 'sk-client-secret',
    });
  });

  it('allows keyless Ollama client mode', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>().mockResolvedValue('local answer');

    await expect(callAIGateway({
      mode: 'client',
      provider: 'ollama',
      model: 'llama3.1',
      prompt: 'Local test',
    }, { clientInvoker })).resolves.toMatchObject({ text: 'local answer', mode: 'client' });
  });

  it('rejects non-local Ollama endpoints in client mode', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>();
    await expect(callAIGateway({
      mode: 'client', provider: 'ollama', model: 'llama3.1', prompt: 'test', apiKey: '', baseUrl: 'https://example.com/ollama',
    }, { clientInvoker })).rejects.toMatchObject({ code: 'CLIENT_BASE_URL_INVALID', mode: 'client' });
    expect(clientInvoker).not.toHaveBeenCalled();
  });

  it('rejects custom NVIDIA endpoints in client mode', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>();
    await expect(callAIGateway({
      mode: 'client', provider: 'nvidia', model: 'nemotron', prompt: 'test', apiKey: 'nvapi-test', baseUrl: 'https://self-hosted.example/v1',
    }, { clientInvoker })).rejects.toMatchObject({ code: 'CLIENT_BASE_URL_INVALID', mode: 'client' });
    expect(clientInvoker).not.toHaveBeenCalled();
  });

  it('requires a client key for providers that need one', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>();

    await expect(callAIGateway({
      mode: 'client',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'test',
    }, { clientInvoker })).rejects.toMatchObject({ code: 'CLIENT_KEY_REQUIRED', mode: 'client' });
    expect(clientInvoker).not.toHaveBeenCalled();
  });

  it('fails closed in server mode when endpoint is missing', async () => {
    const fetcher = vi.fn();

    await expect(callAIGateway({
      mode: 'server',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'test',
      endpoint: '  ',
    }, { fetch: fetcher as unknown as typeof fetch })).rejects.toMatchObject({
      code: 'SERVER_ENDPOINT_REQUIRED',
      mode: 'server',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects private or query-bearing server endpoints', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(callAIGateway({ mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'http://192.168.1.20/ai' }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_ENDPOINT_INVALID' });
    await expect(callAIGateway({ mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://169.254.169.254/metadata' }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_ENDPOINT_INVALID' });
    await expect(callAIGateway({ mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://[fd00::1]/ai' }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_ENDPOINT_INVALID' });
    await expect(callAIGateway({ mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://[::ffff:127.0.0.1]/ai' }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_ENDPOINT_INVALID' });
    await expect(callAIGateway({ mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://gateway.example.test/ai?token=secret' }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_ENDPOINT_INVALID' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends only non-secret fields through the server gateway', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ text: 'server answer' }));
    const request = {
      mode: 'server' as const,
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      prompt: 'Server analysis',
      endpoint: 'https://gateway.example.test/ai',
    };

    const response = await callAIGateway(request, { fetch: fetcher });
    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(response.text).toBe('server answer');
    expect(body).toEqual({ provider: 'openai', model: 'gpt-4o-mini', prompt: 'Server analysis' });
    expect(String(init?.body)).not.toContain('sk-');
    expect(init?.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
    expect((init?.headers as Record<string, string>)['X-Request-Id']).toMatch(/^cpl-|^[0-9a-f-]{36}$/i);
    expect(init?.credentials).toBe('include');
  });

  it('normalizes unsafe, multiline, and oversized request ids before sending them', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ text: 'server answer' }));
    const baseRequest = {
      mode: 'server' as const,
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      prompt: 'request id validation',
      endpoint: 'https://gateway.example.test/ai',
    };

    await callAIGateway({ ...baseRequest, requestId: 'safe.id-1' }, { fetch: fetcher });
    await callAIGateway({ ...baseRequest, requestId: 'line\nbreak\r\nheader' }, { fetch: fetcher });
    await callAIGateway({ ...baseRequest, requestId: 'x'.repeat(129) }, { fetch: fetcher });

    const headers = fetcher.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)['X-Request-Id']);
    expect(headers[0]).toBe('safe.id-1');
    expect(headers[1]).toMatch(/^[A-Za-z0-9._:-]+$/);
    expect(headers[2]).toMatch(/^[A-Za-z0-9._:-]+$/);
    expect(headers[1]).not.toContain('\n');
    expect(headers[1]).not.toContain('\r');
    expect(headers[2]).toHaveLength(36);
  });

  it('never exposes a client secret from adapter errors', async () => {
    const secret = 'sk-client-secret-should-not-leak';
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>()
      .mockRejectedValue(new Error(`provider rejected ${secret}`));
    const errorSpy = vi.spyOn(console, 'error');

    await expect(callAIGateway({
      mode: 'client',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'test',
      apiKey: secret,
    }, { clientInvoker })).rejects.toMatchObject({ code: 'CLIENT_REQUEST_FAILED' });

    expect(errorSpy).not.toHaveBeenCalled();
    try {
      await callAIGateway({ mode: 'client', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', apiKey: secret }, { clientInvoker });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('does not expose a server response body on upstream failure', async () => {
    const secret = 'server-secret-in-body';
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ error: secret }, 502));

    await expect(callAIGateway({
      mode: 'server',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'test',
      endpoint: 'https://gateway.example.test/ai',
    }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_REQUEST_FAILED' });
    await expect(callAIGateway({
      mode: 'server',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: 'test',
      endpoint: 'https://gateway.example.test/ai',
    }, { fetch: fetcher })).rejects.not.toThrow(secret);
  });

  it('rejects empty prompts and malformed server responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ answer: 'wrong field' }));

    await expect(callAIGateway({
      mode: 'client', provider: 'ollama', model: 'llama3.1', prompt: '   ',
    }, { clientInvoker: vi.fn() })).rejects.toMatchObject({ code: 'EMPTY_PROMPT' });
    await expect(callAIGateway({
      mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://gateway.example.test/ai',
    }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_RESPONSE_INVALID' });
  });

  it('rejects oversized prompts before any provider call', async () => {
    const clientInvoker = vi.fn<(input: ClientAIInput) => Promise<string>>();
    await expect(callAIGateway({
      mode: 'client', provider: 'ollama', model: 'llama3.1', prompt: 'x'.repeat(32_001),
    }, { clientInvoker })).rejects.toMatchObject({ code: 'PROMPT_TOO_LARGE' });
    expect(clientInvoker).not.toHaveBeenCalled();
  });

  it('accepts validated server usage metadata and rejects malformed usage', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(mockJsonResponse({
      text: 'server answer', usage: { inputTokens: 12, outputTokens: 8, costUsd: 0.004 },
    }));
    const response = await callAIGateway({
      mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://gateway.example.test/ai',
    }, { fetch: fetcher });
    expect(response.usage).toEqual({ inputTokens: 12, outputTokens: 8, costUsd: 0.004 });

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ text: 'server answer', usage: { outputTokens: -1 } }));
    await expect(callAIGateway({
      mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://gateway.example.test/ai',
    }, { fetch: malformed })).rejects.toMatchObject({ code: 'SERVER_USAGE_INVALID' });
  });

  it('rejects an oversized server response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ text: 'x'.repeat(100_001) }));
    await expect(callAIGateway({
      mode: 'server', provider: 'openai', model: 'gpt-4o-mini', prompt: 'test', endpoint: 'https://gateway.example.test/ai',
    }, { fetch: fetcher })).rejects.toMatchObject({ code: 'SERVER_RESPONSE_TOO_LARGE' });
  });
});
