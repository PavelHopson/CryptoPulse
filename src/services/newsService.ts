import { NewsArticle } from '../types';

export type NewsSource = 'worker' | 'rss' | 'mock';
export type NewsStatus = 'LIVE' | 'RETRY' | 'MOCK' | 'UNAVAILABLE';

export interface NewsServiceResponse {
  data: NewsArticle[];
  source: NewsSource;
  status: NewsStatus;
  checkedAt: string;
  error?: string;
}

// Cloudflare Worker — live news parser
const NEWS_API = import.meta.env.VITE_NEWS_API || 'https://cryptopulse-news.hopsintoxin.workers.dev';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=200';
const NEWS_REQUEST_TIMEOUT_MS = 5_000;

async function fetchNewsWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeImageUrl(value: unknown): string {
  return safeHttpUrl(value) ?? FALLBACK_IMAGE_URL;
}

function newsResponse(data: NewsArticle[], source: NewsSource, status: NewsStatus, error?: string): NewsServiceResponse {
  return {
    data,
    source,
    status,
    checkedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

// ====== PRIMARY: Cloudflare Worker parser ======

export const fetchMarketNewsWithStatus = async (): Promise<NewsServiceResponse> => {
  let workerUnavailable = false;

  // Try our Cloudflare Worker first
  if (NEWS_API) {
    try {
      const response = await fetchNewsWithTimeout(`${NEWS_API}/crypto`);
      const data = await response.json();
      if (data.ok && Array.isArray(data.articles) && data.articles.length > 0) {
        const articles = data.articles
          .slice(0, 8)
          .map((a: any): NewsArticle | null => {
            const url = safeHttpUrl(a.url);
            if (!url) return null;
            return {
              id: String(a.id ?? url),
              title: String(a.title ?? 'Без заголовка'),
              description: String(a.description ?? ''),
              url,
              source: String(a.source ?? 'Источник'),
              publishedAt: String(a.publishedAt ?? ''),
              imageUrl: safeImageUrl(a.imageUrl),
              type: 'MARKET' as const,
            };
          })
          .filter((article: NewsArticle | null): article is NewsArticle => article !== null);
        if (articles.length > 0) return newsResponse(articles, 'worker', 'LIVE');
      }
    } catch (err) {
      console.warn('Worker news API unavailable, falling back to RSS');
    }
    workerUnavailable = true;
  }

  // Fallback: rss2json proxy
  return fetchViaRss2Json(workerUnavailable);
};

export const fetchMarketNews = async (): Promise<NewsArticle[]> => (await fetchMarketNewsWithStatus()).data;

// ====== FALLBACK: rss2json proxy ======

const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';
const INVESTING_RU_RSS = 'https://ru.investing.com/rss/news.rss';

async function fetchViaRss2Json(workerUnavailable: boolean): Promise<NewsServiceResponse> {
  try {
    const response = await fetchNewsWithTimeout(`${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(INVESTING_RU_RSS)}`);
    const data = await response.json();

    if (data.status === 'ok' && Array.isArray(data.items)) {
      const articles = data.items
        .map((item: any): NewsArticle | null => {
          const url = safeHttpUrl(item.link);
          if (!url) return null;
          return {
            id: String(item.guid || url),
            title: String(item.title ?? 'Без заголовка'),
            description: stripHtml(String(item.description ?? '')).substring(0, 120) + '...',
            url,
            source: 'Investing.com',
            publishedAt: formatDate(String(item.pubDate ?? '')),
            imageUrl: safeImageUrl(item.enclosure?.link || item.thumbnail),
            type: 'MARKET' as const,
          };
        })
        .filter((article: NewsArticle | null): article is NewsArticle => article !== null);
      if (articles.length > 0) return newsResponse(articles, 'rss', workerUnavailable ? 'RETRY' : 'LIVE');
    }
    return newsResponse(getMockNews(), 'mock', 'UNAVAILABLE', 'Провайдеры новостей вернули пустой ответ. Показан демонстрационный набор.');
  } catch (error) {
    console.error('News fetch error, using mock:', error);
    return newsResponse(getMockNews(), 'mock', 'UNAVAILABLE', 'Провайдеры новостей недоступны. Показан демонстрационный набор.');
  }
}

// ====== PROJECT NEWS ======

export const getProjectNews = (): NewsArticle[] => [
  {
    id: 'p1',
    title: 'CryptoPulse Research Lab — обновление платформы',
    description: 'Strategy Lab, прозрачные статусы источников, CSV-импорт и нейтральный AI-разбор без реальных ордеров.',
    url: '#',
    source: 'CryptoPulse Team',
    publishedAt: 'Сегодня',
    type: 'PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'p2',
    title: 'Свой парсер новостей на Cloudflare Workers',
    description: 'Парсим CoinTelegraph, CoinDesk и Investing.com через настроенный Worker; доступность и лимиты зависят от окружения.',
    url: '#',
    source: 'Dev Team',
    publishedAt: 'Сегодня',
    type: 'PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'p3',
    title: 'Добавлены рынки Форекс и Фьючерсов',
    description: 'Теперь доступны пары EUR/USD, USD/RUB, Gold, Oil, S&P 500, Nasdaq.',
    url: '#',
    source: 'Dev Team',
    publishedAt: 'Вчера',
    type: 'PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&q=80&w=200',
  },
];

// ====== FALLBACK MOCK DATA ======

const getMockNews = (): NewsArticle[] => [
  {
    id: '1',
    title: 'Биткоин тестирует уровень $65,000 на фоне новостей из США',
    description: 'Рынок криптовалют показывает высокую волатильность в ожидании решения ФРС по процентной ставке.',
    url: 'https://ru.investing.com/crypto/bitcoin/news',
    source: 'Investing.com',
    publishedAt: '1 час назад',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=200',
    type: 'MARKET',
  },
  {
    id: '2',
    title: 'Ethereum обновление: переход на Pectra',
    description: 'Сеть Ethereum готовится к крупному обновлению, которое улучшит производительность и снизит комиссии.',
    url: 'https://www.coindesk.com',
    source: 'CoinDesk',
    publishedAt: '2 часа назад',
    imageUrl: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&q=80&w=200',
    type: 'MARKET',
  },
];

// ====== UTILS ======

function stripHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
