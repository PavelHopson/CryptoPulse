/**
 * CryptoPulse News Parser — Cloudflare Worker
 *
 * Parses RSS feeds from CoinTelegraph, CoinDesk, Investing.com
 * Returns clean JSON for the CryptoPulse frontend.
 *
 * Endpoints:
 *   GET /              → all news (merged, sorted by date)
 *   GET /crypto        → crypto news only
 *   GET /markets       → traditional markets news
 *   GET /health        → health check
 */

export interface Env {
  CORS_ORIGIN: string;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  timestamp: number;
  imageUrl: string;
  category: 'crypto' | 'markets' | 'forex' | 'general';
}

// ====== RSS FEED SOURCES ======

const FEEDS = {
  crypto: [
    {
      url: 'https://cointelegraph.com/rss',
      source: 'CoinTelegraph',
      sourceIcon: 'https://cointelegraph.com/favicon.ico',
      category: 'crypto' as const,
    },
    {
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      source: 'CoinDesk',
      sourceIcon: 'https://www.coindesk.com/favicon.ico',
      category: 'crypto' as const,
    },
    {
      url: 'https://cryptonews.com/news/feed/',
      source: 'CryptoNews',
      sourceIcon: 'https://cryptonews.com/favicon.ico',
      category: 'crypto' as const,
    },
  ],
  markets: [
    {
      url: 'https://ru.investing.com/rss/news.rss',
      source: 'Investing.com',
      sourceIcon: 'https://ru.investing.com/favicon.ico',
      category: 'markets' as const,
    },
    {
      url: 'https://ru.investing.com/rss/news_301.rss',
      source: 'Investing.com Crypto',
      sourceIcon: 'https://ru.investing.com/favicon.ico',
      category: 'crypto' as const,
    },
  ],
};

// ====== XML PARSER (no deps, runs on edge) ======

function extractTag(xml: string, tag: string): string {
  // Handle CDATA: <![CDATA[content]]>
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const pattern = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : '';
}

function extractImageFromContent(html: string): string {
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
  return imgMatch ? imgMatch[1] : '';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRSSItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string; image: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string; image: string }> = [];

  // Split by <item> tags
  const itemBlocks = xml.split(/<item[\s>]/i).slice(1);

  for (const block of itemBlocks.slice(0, 15)) { // Max 15 items per feed
    const itemXml = block.split(/<\/item>/i)[0];
    if (!itemXml) continue;

    const title = stripHtml(extractTag(itemXml, 'title'));
    const description = stripHtml(extractTag(itemXml, 'description')).substring(0, 200);
    const link = extractTag(itemXml, 'link') || extractAttribute(itemXml, 'link', 'href');
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');

    // Try multiple image sources
    let image = extractAttribute(itemXml, 'media:content', 'url')
      || extractAttribute(itemXml, 'media:thumbnail', 'url')
      || extractAttribute(itemXml, 'enclosure', 'url')
      || extractImageFromContent(extractTag(itemXml, 'content:encoded'))
      || extractImageFromContent(extractTag(itemXml, 'description'));

    if (title && link) {
      items.push({ title, description, link, pubDate, image });
    }
  }

  return items;
}

// ====== FETCH & PARSE FEED ======

async function fetchFeed(feed: typeof FEEDS.crypto[0]): Promise<NewsArticle[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'CryptoPulse/2.0 NewsParser (Cloudflare Worker)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      cf: { cacheTtl: 300 }, // Cache 5 min on Cloudflare edge
    });

    if (!response.ok) {
      console.error(`Feed ${feed.source} returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSItems(xml);

    return items.map((item, i) => {
      const timestamp = item.pubDate ? new Date(item.pubDate).getTime() : Date.now() - i * 60000;

      return {
        id: `${feed.source.toLowerCase().replace(/\s+/g, '-')}-${Math.abs(hashCode(item.link))}`,
        title: item.title,
        description: item.description || '',
        url: item.link,
        source: feed.source,
        sourceIcon: feed.sourceIcon,
        publishedAt: item.pubDate ? formatRelativeTime(timestamp) : '',
        timestamp,
        imageUrl: item.image || `https://placehold.co/400x200/0d001a/00f3ff?text=${encodeURIComponent(feed.source)}`,
        category: feed.category,
      };
    });
  } catch (err) {
    console.error(`Error fetching ${feed.source}:`, err);
    return [];
  }
}

// ====== UTILS ======

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300', // Browser cache 5 min
  };
}

// ====== WORKER HANDLER ======

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const headers = corsHeaders(env.CORS_ORIGIN || '*');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { headers });
    }

    // Determine which feeds to fetch
    let feedsToFetch: typeof FEEDS.crypto;

    if (path === '/crypto') {
      feedsToFetch = FEEDS.crypto;
    } else if (path === '/markets') {
      feedsToFetch = FEEDS.markets;
    } else {
      // Default: all feeds
      feedsToFetch = [...FEEDS.crypto, ...FEEDS.markets];
    }

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(feedsToFetch.map(fetchFeed));

    const articles: NewsArticle[] = results
      .filter((r): r is PromiseFulfilledResult<NewsArticle[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => b.timestamp - a.timestamp) // Newest first
      .slice(0, 50); // Max 50 articles

    const response = {
      ok: true,
      count: articles.length,
      sources: [...new Set(articles.map(a => a.source))],
      articles,
    };

    return new Response(JSON.stringify(response), { headers });
  },
} satisfies ExportedHandler<Env>;
