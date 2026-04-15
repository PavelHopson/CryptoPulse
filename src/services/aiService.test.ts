import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AIConfig } from '../types';

// getUserProfile reads localStorage + has side effects we want to control.
// Expose a mutable holder so each test can swap the profile in place.
const profileHolder: { current: { preferences?: { ai?: AIConfig } } } = { current: {} };

vi.mock('./userService', () => ({
  getUserProfile: () => profileHolder.current,
}));

// @google/genai is only loaded dynamically by callGemini. Mock via a
// plain class so `new GoogleGenAI(...)` works — vi.fn() returned from
// mockImplementation is not a real constructor.
const generateContentMock = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: generateContentMock };
  },
}));

import { generateCoinAnalysis, getActiveProvider } from './aiService';

function setProfile(ai: AIConfig | undefined) {
  profileHolder.current = { preferences: { ai } };
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('aiService.getActiveProvider', () => {
  beforeEach(() => {
    setProfile(undefined);
  });

  it('falls back to gemini when no profile AI is configured', () => {
    expect(getActiveProvider()).toEqual({ provider: 'gemini', model: 'gemini-2.5-flash' });
  });

  it('reflects the configured provider + model', () => {
    setProfile({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' });
    expect(getActiveProvider()).toEqual({ provider: 'openai', model: 'gpt-4o-mini' });
  });

  it('honours ollama without requiring an API key', () => {
    setProfile({ provider: 'ollama', apiKey: '', model: 'llama3.1', baseUrl: 'http://localhost:11434' });
    expect(getActiveProvider()).toEqual({ provider: 'ollama', model: 'llama3.1' });
  });
});

describe('aiService.generateCoinAnalysis — provider dispatch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location: { origin: 'https://cryptopulse.test' } });
    generateContentMock.mockReset();
    setProfile(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "not configured" message when no API key and provider is not ollama', async () => {
    setProfile({ provider: 'openai', apiKey: '', model: 'gpt-4o-mini' });

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toContain('не настроен');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes to Gemini via @google/genai when provider=gemini', async () => {
    setProfile({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-2.5-flash' });
    generateContentMock.mockResolvedValueOnce({ text: 'BTC is bullish.' });

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('BTC is bullish.');
    expect(generateContentMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes to OpenAI Chat Completions when provider=openai', async () => {
    setProfile({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ choices: [{ message: { content: 'OpenAI says hold.' } }] }),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('OpenAI says hold.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages[0].role).toBe('user');
  });

  it('surfaces the OpenAI error message on non-ok responses', async () => {
    setProfile({ provider: 'openai', apiKey: 'sk-bad', model: 'gpt-4o-mini' });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ error: { message: 'Invalid API key' } }, 401),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toContain('Ошибка AI');
    expect(result).toContain('Invalid API key');
  });

  it('routes to Anthropic /v1/messages when provider=anthropic', async () => {
    setProfile({ provider: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ content: [{ text: 'Anthropic says neutral.' }] }),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('Anthropic says neutral.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-ant-test');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
  });

  it('routes to OpenRouter when provider=openrouter', async () => {
    setProfile({ provider: 'openrouter', apiKey: 'sk-or-test', model: 'google/gemini-2.5-flash' });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ choices: [{ message: { content: 'OpenRouter response.' } }] }),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('OpenRouter response.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers['HTTP-Referer']).toBe('https://cryptopulse.test');
  });

  it('routes to Ollama local endpoint without requiring an API key', async () => {
    setProfile({
      provider: 'ollama',
      apiKey: '',
      model: 'llama3.1',
      baseUrl: 'http://localhost:11434',
    });
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ response: 'Ollama local says hold.' }));

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('Ollama local says hold.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/generate');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('llama3.1');
    expect(body.prompt).not.toContain('no content restrictions');
  });

  it('appends uncensored preamble to prompt for abliterated/huihui models', async () => {
    setProfile({
      provider: 'ollama',
      apiKey: '',
      model: 'huihui-ai/Huihui-Qwen3.5-35B-A3B-abliterated',
      baseUrl: 'http://localhost:11434',
    });
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ response: 'Uncensored response.' }));

    await generateCoinAnalysis('Bitcoin', 50000, 2.5);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain('no content restrictions');
  });

  it('routes to NVIDIA NIM Chat Completions when provider=nvidia', async () => {
    setProfile({
      provider: 'nvidia',
      apiKey: 'nvapi-test',
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ choices: [{ message: { content: 'NVIDIA says buy on dip.' } }] }),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toBe('NVIDIA says buy on dip.');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer nvapi-test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('nvidia/llama-3.3-nemotron-super-49b-v1');
  });

  it('surfaces NVIDIA NIM errors via the error.message field', async () => {
    setProfile({
      provider: 'nvidia',
      apiKey: 'nvapi-bad',
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ error: { message: 'Quota exceeded' } }, 429),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toContain('Ошибка AI');
    expect(result).toContain('Quota exceeded');
  });

  it('falls back to `detail` field when NVIDIA NIM returns it', async () => {
    setProfile({
      provider: 'nvidia',
      apiKey: 'nvapi-bad',
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ detail: 'Model offline' }, 503),
    );

    const result = await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(result).toContain('Model offline');
  });

  it('respects a custom NVIDIA NIM baseUrl (self-hosted)', async () => {
    setProfile({
      provider: 'nvidia',
      apiKey: 'nvapi-test',
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
      baseUrl: 'https://self-hosted-nim.example.com/v1//',
    });
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ choices: [{ message: { content: 'custom' } }] }),
    );

    await generateCoinAnalysis('Bitcoin', 50000, 2.5);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://self-hosted-nim.example.com/v1/chat/completions',
    );
  });
});

describe('aiService.generateCoinAnalysis — prompt construction', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    setProfile({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes bullish sentiment for change24h > 1.5', async () => {
    await generateCoinAnalysis('Bitcoin', 50000, 5);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt: string = body.messages[0].content;
    expect(prompt).toContain('бычий импульс');
  });

  it('includes moderate-growth sentiment for 0 < change24h <= 1.5', async () => {
    await generateCoinAnalysis('Bitcoin', 50000, 0.5);
    const prompt: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('умеренный рост');
  });

  it('includes seller-pressure sentiment for change24h < -1.5', async () => {
    await generateCoinAnalysis('Bitcoin', 50000, -3);
    const prompt: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('давлением продавцов');
  });

  it('includes asset name and price in the prompt', async () => {
    await generateCoinAnalysis('Ethereum', 3500.42, 1.2);
    const prompt: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('Ethereum');
    expect(prompt).toContain('3500.42');
    expect(prompt).toContain('1.2%');
  });
});
