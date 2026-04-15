import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketNews, getProjectNews } from './newsService';

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('newsService.getProjectNews', () => {
  it('returns a fixed list of project announcements', () => {
    const news = getProjectNews();
    expect(news.length).toBeGreaterThanOrEqual(3);
    for (const n of news) {
      expect(n.type).toBe('PROJECT');
      expect(n.title).toBeTruthy();
      expect(n.url).toBeDefined();
      expect(n.imageUrl).toBeDefined();
    }
  });

  it('is stable across multiple calls (no randomness)', () => {
    const a = getProjectNews();
    const b = getProjectNews();
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });
});

describe('newsService.fetchMarketNews — Cloudflare Worker primary path', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns articles from the Worker endpoint when response.ok is true', async () => {
    const articles = [
      {
        id: 'a1',
        title: 'BTC hits 70k',
        description: 'Price rally',
        url: 'https://example.com/1',
        source: 'CoinDesk',
        publishedAt: '1h ago',
        imageUrl: 'https://img/1.png',
      },
      {
        id: 'a2',
        title: 'ETH Pectra upgrade ships',
        description: 'Mainnet live',
        url: 'https://example.com/2',
        source: 'CoinTelegraph',
        publishedAt: '2h ago',
        imageUrl: 'https://img/2.png',
      },
    ];
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: true, articles }));

    const result = await fetchMarketNews();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a1');
    expect(result[0].type).toBe('MARKET');
    expect(result[1].title).toBe('ETH Pectra upgrade ships');
    // First call must be the Worker endpoint
    expect(fetchMock.mock.calls[0][0]).toContain('/crypto');
  });

  it('slices Worker articles to the first 8 entries', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      title: `Article ${i}`,
      description: 'desc',
      url: `https://example.com/${i}`,
      source: 'src',
      publishedAt: '1h',
      imageUrl: 'img',
    }));
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: true, articles: many }));

    const result = await fetchMarketNews();
    expect(result).toHaveLength(8);
    expect(result[7].id).toBe('a7');
  });

  it('falls through to RSS fallback when Worker returns ok=false', async () => {
    // Worker returns ok=false -> fallthrough
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: false, articles: [] }));
    // RSS2JSON returns valid data
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        status: 'ok',
        items: [
          {
            guid: 'rss-1',
            title: 'RSS news',
            description: '<p>html <b>desc</b></p>',
            link: 'https://rss/1',
            pubDate: new Date().toISOString(),
          },
        ],
      }),
    );

    const result = await fetchMarketNews();
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('Investing.com');
    // HTML stripped from description
    expect(result[0].description).not.toContain('<');
  });

  it('falls through to RSS fallback when Worker fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('worker down'));
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        status: 'ok',
        items: [
          {
            guid: 'rss-2',
            title: 'Another RSS story',
            description: 'plain',
            link: 'https://rss/2',
            pubDate: new Date().toISOString(),
          },
        ],
      }),
    );

    const result = await fetchMarketNews();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rss-2');
    expect(result[0].title).toBe('Another RSS story');
  });

  it('falls through to Worker empty-articles path when ok=true but articles=[]', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: true, articles: [] }));
    // RSS fallback
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        status: 'ok',
        items: [
          {
            guid: 'rss-3',
            title: 'Third story',
            description: 'desc',
            link: 'https://rss/3',
            pubDate: new Date().toISOString(),
          },
        ],
      }),
    );

    const result = await fetchMarketNews();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rss-3');
  });
});

describe('newsService.fetchMarketNews — full-fallback to mock data', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns mock news when both Worker and RSS fail', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await fetchMarketNews();

    // Mock data always has at least 2 entries with MARKET type
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((n) => n.type === 'MARKET')).toBe(true);
  });

  it('returns mock news when RSS returns status !== ok', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ ok: false, articles: [] }))
      .mockResolvedValueOnce(mockJsonResponse({ status: 'error' }));

    const result = await fetchMarketNews();
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((n) => n.type === 'MARKET')).toBe(true);
  });

  it('returns mock news when RSS fetch throws', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ ok: false, articles: [] }))
      .mockRejectedValueOnce(new Error('rss unreachable'));

    const result = await fetchMarketNews();
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe('newsService.fetchMarketNews — RSS date formatting', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats minute-scale RSS dates as "N мин назад"', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: false, articles: [] }));
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        status: 'ok',
        items: [
          {
            guid: 'x',
            title: 't',
            description: 'd',
            link: 'l',
            pubDate: new Date(Date.now() - 30 * 60_000).toISOString(),
          },
        ],
      }),
    );

    const result = await fetchMarketNews();
    expect(result[0].publishedAt).toMatch(/мин назад/);
  });

  it('formats hour-scale RSS dates as "N ч назад"', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ ok: false, articles: [] }));
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        status: 'ok',
        items: [
          {
            guid: 'x',
            title: 't',
            description: 'd',
            link: 'l',
            pubDate: new Date(Date.now() - 3 * 3600_000).toISOString(),
          },
        ],
      }),
    );

    const result = await fetchMarketNews();
    expect(result[0].publishedAt).toMatch(/ч назад/);
  });
});
