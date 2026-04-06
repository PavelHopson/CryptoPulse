import { NewsArticle } from '../types';

// Cloudflare Worker URL — update after deploying
const NEWS_API = import.meta.env.VITE_NEWS_API || '';

// ====== PRIMARY: Cloudflare Worker parser ======

export const fetchMarketNews = async (): Promise<NewsArticle[]> => {
  // Try our Cloudflare Worker first
  if (NEWS_API) {
    try {
      const response = await fetch(`${NEWS_API}/crypto`);
      const data = await response.json();
      if (data.ok && data.articles?.length > 0) {
        return data.articles.slice(0, 8).map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source,
          publishedAt: a.publishedAt,
          imageUrl: a.imageUrl,
          type: 'MARKET' as const,
        }));
      }
    } catch (err) {
      console.warn('Worker news API unavailable, falling back to RSS');
    }
  }

  // Fallback: rss2json proxy
  return fetchViaRss2Json();
};

// ====== FALLBACK: rss2json proxy ======

const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';
const INVESTING_RU_RSS = 'https://ru.investing.com/rss/news.rss';

async function fetchViaRss2Json(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(INVESTING_RU_RSS)}`);
    const data = await response.json();

    if (data.status === 'ok') {
      return data.items.map((item: any) => ({
        id: item.guid || Math.random().toString(36),
        title: item.title,
        description: stripHtml(item.description).substring(0, 120) + '...',
        url: item.link,
        source: 'Investing.com',
        publishedAt: formatDate(item.pubDate),
        imageUrl: item.enclosure?.link || item.thumbnail || 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=200',
        type: 'MARKET',
      }));
    }
    return getMockNews();
  } catch (error) {
    console.error('News fetch error, using mock:', error);
    return getMockNews();
  }
}

// ====== PROJECT NEWS ======

export const getProjectNews = (): NewsArticle[] => [
  {
    id: 'p1',
    title: 'CryptoPulse 2077 — Полное обновление',
    description: 'Объединены 3 репозитория в один проект. Cyberpunk дизайн, AI аналитика, 3 темы оформления.',
    url: '#',
    source: 'CryptoPulse Team',
    publishedAt: 'Сегодня',
    type: 'PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'p2',
    title: 'Свой парсер новостей на Cloudflare Workers',
    description: 'Парсим CoinTelegraph, CoinDesk, Investing.com в реальном времени. Бесплатно, 100k запросов/день.',
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
