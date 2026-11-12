import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dataStatusForSource,
  fetchCoinDetails,
  fetchCoinHistory,
  fetchFavoriteCoins,
  fetchMarketData,
  fetchTopCoins,
  isTrustedDataStatus,
  requireTrustedData,
  UntrustedDataError,
} from './cryptoService';

// cryptoService imports adminService.getSystemConfig which reads localStorage
// and mutates market data via `applyLiveJitter`. We stub it to keep tests
// deterministic.
vi.mock('./adminService', () => ({
  getSystemConfig: () => ({ marketVolatility: 0, marketBias: 'NEUTRAL' }),
}));

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function installFetchMock(fetchMock: typeof fetch): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  return () => { globalThis.fetch = originalFetch; };
}

function makeCoinPayload(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    symbol: id.slice(0, 3).toUpperCase(),
    name: id,
    image: `https://example.com/${id}.png`,
    current_price: 100,
    market_cap: 1_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: 2_000_000,
    total_volume: 500_000,
    high_24h: 110,
    low_24h: 90,
    price_change_24h: 1,
    price_change_percentage_24h: 1,
    market_cap_change_24h: 10000,
    market_cap_change_percentage_24h: 1,
    circulating_supply: 1000,
    total_supply: 2000,
    max_supply: 2000,
    ath: 200,
    ath_change_percentage: -50,
    ath_date: '2024-01-01',
    atl: 10,
    atl_change_percentage: 900,
    atl_date: '2013-01-01',
    roi: null,
    last_updated: '2026-04-16',
    category: 'crypto',
    sparkline_in_7d: { price: [100, 101] },
    ...overrides,
  };
}

describe('fetchTopCoins', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    restoreFetch = installFetchMock(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('returns source="api" with sanitized data on success', async () => {
    const payload = [makeCoinPayload('bitcoin'), makeCoinPayload('ethereum')];
    fetchMock.mockResolvedValueOnce(mockJsonResponse(payload));

    const result = await fetchTopCoins();

    expect(result.source).toBe('api');
    expect(result.status).toBe('LIVE');
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('bitcoin');
    expect(result.data[0].category).toBe('crypto');
  });

  it('filters out coins with null current_price', async () => {
    const payload = [
      makeCoinPayload('bitcoin', { current_price: 50000 }),
      makeCoinPayload('broken', { current_price: null }),
    ];
    fetchMock.mockResolvedValueOnce(mockJsonResponse(payload));

    const result = await fetchTopCoins();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('bitcoin');
  });

  it('retries 3 times on HTTP 429, then falls back to mock with source="retry-mock"', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse(null, 429));

    const result = await fetchTopCoins();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.source).toBe('retry-mock');
    expect(result.status).toBe('RETRY');
    // retry() exhaustion throws RetryError which lands in the outer catch.
    // The fallback is explicitly marked as demo data and not exchange cache.
    expect(result.error).toContain('Ошибка сети');
    expect(result.error).toContain('не кеш биржи');
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('retries on 503, succeeds on third attempt', async () => {
    const payload = [makeCoinPayload('bitcoin')];
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(null, 503))
      .mockResolvedValueOnce(mockJsonResponse(null, 503))
      .mockResolvedValueOnce(mockJsonResponse(payload));

    const result = await fetchTopCoins();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.source).toBe('api');
    expect(result.data).toHaveLength(1);
  });

  it('does not retry on 404 — one call, falls through to non-ok branch', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(null, 404));

    const result = await fetchTopCoins();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('unavailable-mock');
    expect(result.status).toBe('UNAVAILABLE');
  });

  it('falls back to mock on network error with source="retry-mock"', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await fetchTopCoins();

    expect(result.source).toBe('retry-mock');
    expect(result.error).toContain('Ошибка сети');
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe('fetchCoinDetails', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    restoreFetch = installFetchMock(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('returns forex asset with source="mock" without calling fetch', async () => {
    const result = await fetchCoinDetails('eur-usd', 'forex');

    expect(result.source).toBe('mock');
    expect(result.status).toBe('MOCK');
    expect(result.error).toContain('демонстрационные');
    expect(result.data).not.toBeNull();
    expect(result.data?.id).toBe('eur-usd');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null data with source="mock" for unknown forex id', async () => {
    const result = await fetchCoinDetails('no-such-forex', 'forex');
    expect(result.source).toBe('mock');
    expect(result.data).toBeNull();
  });

  it('returns futures asset with source="mock"', async () => {
    const result = await fetchCoinDetails('gold', 'futures');
    expect(result.source).toBe('mock');
    expect(result.data?.id).toBe('gold');
  });

  it('returns crypto details with source="api" on successful fetch', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse([makeCoinPayload('bitcoin')]));

    const result = await fetchCoinDetails('bitcoin');
    expect(result.source).toBe('api');
    expect(result.data?.id).toBe('bitcoin');
  });

  it('falls back to mock crypto with source="retry-mock" on API failure', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    const result = await fetchCoinDetails('bitcoin');
    expect(result.source).toBe('retry-mock');
    expect(result.status).toBe('RETRY');
    expect(result.data).not.toBeNull();
    expect(result.data?.id).toBe('bitcoin');
    expect(result.error).toBeDefined();
  });

  it('returns null + error for unknown crypto when upstream fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'));

    const result = await fetchCoinDetails('unknown-coin-xyz');
    expect(result.source).toBe('retry-mock');
    expect(result.data).toBeNull();
    expect(result.error).toContain('подключиться');
  });
});

describe('fetchCoinHistory', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    restoreFetch = installFetchMock(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('maps CoinGecko market_chart prices to live candles', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ prices: [[1_700_000_000_000, 100], [1_700_060_000_000, 102], [1_700_120_000_000, 101]] }));

    const result = await fetchCoinHistory('bitcoin', '1H', 101);

    expect(result.status).toBe('LIVE');
    expect(result.data).toHaveLength(3);
    expect(result.data[1]).toMatchObject({ open: 100, close: 102, high: 102, low: 100 });
  });

  it('labels fallback history as unavailable for non-retryable upstream errors', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(null, 404));

    const result = await fetchCoinHistory('bitcoin', '1D', 100);

    expect(result.status).toBe('UNAVAILABLE');
    expect(result.source).toBe('unavailable-mock');
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe('fetchFavoriteCoins', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    restoreFetch = installFetchMock(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('returns empty data with source="api" for empty id list', async () => {
    const result = await fetchFavoriteCoins([]);
    expect(result.data).toEqual([]);
    expect(result.source).toBe('api');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns only non-crypto favorites with source="mock" when all ids are forex/futures', async () => {
    const result = await fetchFavoriteCoins(['eur-usd', 'gold']);

    expect(result.source).toBe('mock');
    expect(result.data).toHaveLength(2);
    expect(result.data.map((c) => c.id).sort()).toEqual(['eur-usd', 'gold']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks favorites as mixed when live crypto data is combined with demo assets', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse([makeCoinPayload('bitcoin', { current_price: 50000 })]),
    );

    const result = await fetchFavoriteCoins(['bitcoin', 'eur-usd']);

    expect(result.source).toBe('mixed');
    expect(result.status).toBe('MIXED');
    expect(result.error).toContain('LIVE-криптоактивы');
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    const ids = result.data.map((c) => c.id);
    expect(ids).toContain('bitcoin');
    expect(ids).toContain('eur-usd');
  });

  it('uses retry-mock fallback on fetch failure', async () => {
    fetchMock.mockRejectedValue(new Error('dns'));
    const result = await fetchFavoriteCoins(['bitcoin']);
    expect(result.source).toBe('retry-mock');
    expect(result.error).toContain('соединения');
  });
});

describe('fetchMarketData (category router)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    restoreFetch = installFetchMock(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('delegates to fetchTopCoins for category="crypto"', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse([makeCoinPayload('bitcoin')]));
    const result = await fetchMarketData('crypto');
    expect(result.source).toBe('api');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns forex mocks with source="mock"', async () => {
    const result = await fetchMarketData('forex');
    expect(result.source).toBe('mock');
    expect(result.status).toBe('MOCK');
    expect(result.error).toContain('демонстрационные');
    expect(result.data.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns futures mocks with source="mock"', async () => {
    const result = await fetchMarketData('futures');
    expect(result.source).toBe('mock');
    expect(result.status).toBe('MOCK');
    expect(result.data.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('data trust policy', () => {
  let restoreFetch: (() => void) | undefined;

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
  });

  it('maps every source to one canonical status, including reserved cache', () => {
    expect(dataStatusForSource('api')).toBe('LIVE');
    expect(dataStatusForSource('cache')).toBe('CACHED');
    expect(dataStatusForSource('mock')).toBe('MOCK');
    expect(dataStatusForSource('retry-mock')).toBe('RETRY');
    expect(dataStatusForSource('unavailable-mock')).toBe('UNAVAILABLE');
    expect(dataStatusForSource('mixed')).toBe('MIXED');
    expect(isTrustedDataStatus('LIVE')).toBe(true);
    expect(isTrustedDataStatus('CACHED')).toBe(true);
    expect(isTrustedDataStatus('MOCK')).toBe(false);
    expect(isTrustedDataStatus('RETRY')).toBe(false);
    expect(isTrustedDataStatus('UNAVAILABLE')).toBe(false);
    expect(isTrustedDataStatus('MIXED')).toBe(false);
  });

  it('fails closed when research or paid mode receives synthetic data', async () => {
    restoreFetch = installFetchMock(vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch);
    const result = await fetchTopCoins();

    expect(() => requireTrustedData(result, 'research')).toThrow(UntrustedDataError);
    expect(() => requireTrustedData(result, 'paid')).toThrow(/LIVE или CACHED/);
  });

  it('allows live data through research mode', async () => {
    restoreFetch = installFetchMock(vi.fn().mockResolvedValue(mockJsonResponse([makeCoinPayload('bitcoin')])) as unknown as typeof fetch);
    const result = await fetchTopCoins();

    expect(requireTrustedData(result, 'research')).toBe(result);
  });

  it('rejects a forged status that disagrees with the source', async () => {
    const result = {
      data: [],
      source: 'mock' as const,
      status: 'LIVE' as const,
      checkedAt: new Date().toISOString(),
    };
    expect(() => requireTrustedData(result, 'research')).toThrow(UntrustedDataError);
  });
});
