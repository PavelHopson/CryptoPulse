import { describe, expect, it, vi } from 'vitest';
import { listResearchRuns, ResearchApiError, resolveResearchApiBaseUrl, saveResearchRun } from './researchApi';

describe('Research API client', () => {
  it('stays explicitly disabled when no endpoint is configured', async () => {
    const fetcher = vi.fn();
    await expect(listResearchRuns({ baseUrl: '', fetch: fetcher })).resolves.toEqual({ configured: false, runs: [] });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(saveResearchRun('demo', { value: 1 }, { baseUrl: '', fetch: fetcher })).resolves.toEqual({ configured: false, saved: false });
  });

  it('rejects insecure or private endpoints', () => {
    expect(() => resolveResearchApiBaseUrl({ baseUrl: 'http://research.example.test' })).toThrow(ResearchApiError);
    expect(() => resolveResearchApiBaseUrl({ baseUrl: 'https://127.0.0.1:8787' })).toThrow(ResearchApiError);
    expect(resolveResearchApiBaseUrl({ baseUrl: 'https://research.example.test' })).toBe('https://research.example.test');
  });

  it('lists owned runs with credentials and a request id', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      runs: [{ id: 'run-1', title: 'Breakout', payload: { mode: 'paper' }, createdAt: '2026-11-12T08:00:00.000Z' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await listResearchRuns({ baseUrl: 'https://research.example.test', fetch: fetcher, requestId: () => 'req-1', csrfToken: () => 'csrf-1' });
    expect(result).toEqual({ configured: true, runs: [{ id: 'run-1', title: 'Breakout', payload: { mode: 'paper' }, createdAt: '2026-11-12T08:00:00.000Z' }] });
    expect(fetcher).toHaveBeenCalledWith('https://research.example.test/v1/research', expect.objectContaining({ method: 'GET', credentials: 'include', headers: expect.objectContaining({ 'X-Request-Id': 'req-1', 'X-CSRF-Token': 'csrf-1' }) }));
  });

  it('normalizes an unsafe request id before sending it as a header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ runs: [] }), { status: 200 }));
    await expect(listResearchRuns({
      baseUrl: 'https://research.example.test',
      fetch: fetcher,
      requestId: () => 'request id with spaces',
    })).resolves.toEqual({ configured: true, runs: [] });
    const request = fetcher.mock.calls[0]?.[1];
    const id = (request?.headers as Record<string, string>)?.['X-Request-Id'] || '';
    expect(id).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/);
    expect(id).not.toContain(' ');
  });

  it('fails closed when the server returns a malformed research row', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      runs: [{ id: 'run-1', title: 'Broken', createdAt: '2026-11-12T08:00:00.000Z' }],
    }), { status: 200 }));
    await expect(listResearchRuns({ baseUrl: 'https://research.example.test', fetch: fetcher })).rejects.toMatchObject({ code: 'RESPONSE_INVALID' });
  });

  it('rejects paper artifacts that contain a secret field before network use', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: 'run-2', title: 'MA test', createdAt: '2026-11-12T08:01:00.000Z' }), { status: 201 }));
    await expect(saveResearchRun('MA test', { mode: 'paper', provider: 'none', apiKey: 'do-not-send' }, { baseUrl: 'https://research.example.test', fetch: fetcher, requestId: () => 'req-2' })).rejects.toMatchObject({ code: 'PAYLOAD_INVALID' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('saves a bounded paper artifact with credentials and no bearer header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: 'run-2', title: 'MA test', createdAt: '2026-11-12T08:01:00.000Z' }), { status: 201 }));
    const result = await saveResearchRun('MA test', { mode: 'paper', metrics: { netReturnPct: 1.2 } }, { baseUrl: 'https://research.example.test', fetch: fetcher, requestId: () => 'req-2' });
    expect(result).toEqual({ configured: true, saved: true, id: 'run-2', title: 'MA test', createdAt: '2026-11-12T08:01:00.000Z' });
    const request = fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({ title: 'MA test', payload: { mode: 'paper', metrics: { netReturnPct: 1.2 } } });
    expect((request?.headers as Record<string, string>)?.Authorization).toBeUndefined();
  });

  it('rejects oversized payloads before network use', async () => {
    const fetcher = vi.fn();
    await expect(saveResearchRun('Too large', { content: 'x'.repeat(200_001) }, { baseUrl: 'https://research.example.test', fetch: fetcher })).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

