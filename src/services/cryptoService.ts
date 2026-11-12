import { CoinData, AssetCategory, Timeframe, CandleData } from '../types';
import { getSystemConfig } from './adminService';
import { retry, isRetryableHttpStatus } from '../core/retry';

const API_URL = 'https://api.coingecko.com/api/v3';

/**
 * Where the data in a ServiceResponse came from. Allows the UI to show a
 * LIVE/CACHED/MOCK/RETRY/UNAVAILABLE badge and makes test assertions deterministic — no more
 * "did this come from the real API or not?" guessing.
 */
export type DataSource =
  /** Real data fetched from upstream API on the current call. */
  | 'api'
  /** Data restored from a verified local/provider cache (reserved for a future cache layer). */
  | 'cache'
  /** Mock data: non-crypto assets (forex/futures) which have no real API yet. */
  | 'mock'
  /** Mock data: we tried the real API, it failed transiently, retry exhausted. */
  | 'retry-mock'
  /** Mock data: the upstream returned a non-retryable response. */
  | 'unavailable-mock'
  /** A response deliberately combining live crypto data with demo assets. */
  | 'mixed';

/** Canonical status for user-facing data trust badges and paid-mode gates. */
export type DataStatus = 'LIVE' | 'CACHED' | 'MOCK' | 'RETRY' | 'UNAVAILABLE' | 'MIXED';

export function dataStatusForSource(source: DataSource): DataStatus {
  if (source === 'api') return 'LIVE';
  if (source === 'cache') return 'CACHED';
  if (source === 'mock') return 'MOCK';
  if (source === 'unavailable-mock') return 'UNAVAILABLE';
  if (source === 'mixed') return 'MIXED';
  return 'RETRY';
}

export type DataUseMode = 'research' | 'paid';

export const isTrustedDataStatus = (status: DataStatus): boolean =>
  status === 'LIVE' || status === 'CACHED';

export class UntrustedDataError extends Error {
  readonly code = 'UNTRUSTED_DATA';

  constructor(
    readonly status: DataStatus,
    readonly mode: DataUseMode,
  ) {
    super(`Источник данных ${status} нельзя использовать в режиме ${mode}. Нужны LIVE или CACHED данные.`);
    this.name = 'UntrustedDataError';
  }
}

export interface ServiceResponse<T> {
  data: T;
  error?: string;
  source: DataSource;
  /** Canonical status; `source` remains for backwards compatibility. */
  status: DataStatus;
  /** Time when this response was assembled, not a claim about mock freshness. */
  checkedAt: string;
}

function serviceResponse<T>(data: T, source: DataSource, error?: string): ServiceResponse<T> {
  return {
    data,
    ...(error ? { error } : {}),
    source,
    status: dataStatusForSource(source),
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Fail closed for research and paid workflows. Callers must opt in explicitly;
 * ordinary browsing can continue to display clearly labelled demo data.
 */
export function requireTrustedData<T>(result: ServiceResponse<T>, mode: DataUseMode): ServiceResponse<T> {
  const canonicalStatus = dataStatusForSource(result.source);
  if (result.status !== canonicalStatus || !isTrustedDataStatus(canonicalStatus)) {
    throw new UntrustedDataError(canonicalStatus, mode);
  }
  return result;
}

/**
 * Wraps a fetch call with exponential-backoff retry for transient errors
 * (408, 425, 429, 5xx). Non-retryable HTTP statuses and thrown errors
 * bubble up so the caller can decide how to handle them.
 */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return retry(
    async () => {
      const res = await fetch(input, init);
      if (!res.ok && isRetryableHttpStatus(res.status)) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    },
    { maxAttempts: 3, initialDelayMs: 500, maxDelayMs: 4000, jitter: true },
  );
}

// --- MOCK DATA GENERATORS ---

const generateSparkline = (basePrice: number, volatility: number = 0.02) => {
  return Array.from({length: 168}, () => basePrice + (Math.random() - 0.5) * (basePrice * volatility));
};

// Helper to simulate live price updates (Jitter)
const applyLiveJitter = (coins: CoinData[]): CoinData[] => {
  const config = getSystemConfig();
  const volMultiplier = config.marketVolatility; // 1.0 is default
  const bias = config.marketBias; 

  return coins.map(coin => {
    const baseVol = coin.category === 'crypto' ? 0.002 : 0.0005; 
    const volatility = baseVol * volMultiplier;
    
    let direction = (Math.random() - 0.5); // -0.5 to 0.5
    
    // Apply Bias
    if (bias === 'BULLISH') direction += 0.2;
    if (bias === 'BEARISH') direction -= 0.2;

    const change = 1 + (direction * volatility);
    const newPrice = coin.current_price * change;
    
    return {
      ...coin,
      current_price: newPrice,
      price_change_percentage_24h: coin.price_change_percentage_24h + (direction * 0.1 * volMultiplier)
    };
  });
};

// --- OHLC HISTORY FOR TRADINGVIEW CHARTS ---
const historyDays: Record<Timeframe, number> = { '1H': 1, '1D': 1, '1W': 7, '1M': 30, '1Y': 365 };

const createSyntheticHistory = (timeframe: Timeframe, currentPrice: number): CandleData[] => {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000); // unix timestamp in seconds
  let pointsCount = 100;
  let interval = 0; // seconds
  let volatility = 0.01;

  switch (timeframe) {
    case '1H':
      pointsCount = 100;
      interval = 60; // 1 minute candles for 1H view
      volatility = 0.001;
      break;
    case '1D':
      pointsCount = 96; // 15 min candles
      interval = 15 * 60;
      volatility = 0.005;
      break;
    case '1W':
      pointsCount = 84; // 2 hour candles
      interval = 2 * 60 * 60;
      volatility = 0.015;
      break;
    case '1M':
      pointsCount = 120; // 6 hour candles
      interval = 6 * 60 * 60;
      volatility = 0.04;
      break;
    case '1Y':
      pointsCount = 365; // daily candles
      interval = 24 * 60 * 60;
      volatility = 0.15;
      break;
  }

  // Generate backwards from current price
  let lastClose = currentPrice;
  
  for (let i = 0; i < pointsCount; i++) {
    const time = now - (i * interval);
    
    // Create a candle based on the "Close" of the previous (forward in time) candle
    // Since we are going backwards:
    // The "Close" of this candle is 'lastClose'
    // We generate an "Open" by applying random walk
    
    const changePercent = (Math.random() - 0.5) * volatility;
    const open = lastClose / (1 + changePercent);
    
    // High and Low
    const high = Math.max(open, lastClose) * (1 + Math.random() * (volatility * 0.5));
    const low = Math.min(open, lastClose) * (1 - Math.random() * (volatility * 0.5));

    // Format time: YYYY-MM-DD for Daily+, Unix for intraday
    let timeVal: any = time;
    if (timeframe === '1Y') {
        const d = new Date(time * 1000);
        timeVal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    candles.unshift({
      originalTime: time * 1000,
      time: timeVal,
      open,
      high,
      low,
      close: lastClose
    });

    lastClose = open; // Next backward candle closes where this one opened
  }

  return candles;
};

const mapMarketChartToCandles = (prices: unknown, timeframe: Timeframe): CandleData[] => {
  if (!Array.isArray(prices)) return [];
  return prices
    .filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[1] > 0)
    .map(([timestamp, close], index, points) => {
      const previous = points[index - 1]?.[1] ?? close;
      const next = points[index + 1]?.[1] ?? close;
      const open = previous;
      const high = Math.max(open, close, next);
      const low = Math.min(open, close, next);
      const originalTime = timestamp;
      const time = timeframe === '1Y'
        ? new Date(timestamp).toISOString().slice(0, 10)
        : String(Math.floor(timestamp / 1000));
      return { originalTime, time, open, high, low, close };
    });
};

export const fetchCoinHistory = async (coinId: string, timeframe: Timeframe, currentPrice: number): Promise<ServiceResponse<CandleData[]>> => {
  const endpoint = `${API_URL}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${historyDays[timeframe]}`;
  try {
    const response = await fetchWithRetry(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { prices?: unknown };
    const candles = mapMarketChartToCandles(payload.prices, timeframe);
    if (candles.length < 2) throw new Error('Исторические данные имеют недостаточную длину');
    return serviceResponse(candles, 'api');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Исторические данные недоступны';
    const source: DataSource = /^HTTP 4\d\d/.test(message) ? 'unavailable-mock' : 'retry-mock';
    return serviceResponse(createSyntheticHistory(timeframe, currentPrice), source, message);
  }
};


const MOCK_FOREX: CoinData[] = [
  {
    id: 'eur-usd', symbol: 'EUR/USD', name: 'Евро / Доллар', image: '',
    current_price: 1.0845, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 50000000000,
    high_24h: 1.0890, low_24h: 1.0810, price_change_24h: 0.0025, price_change_percentage_24h: 0.23,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 1.60, ath_change_percentage: -32, ath_date: '', atl: 0.82, atl_change_percentage: 32, atl_date: '', roi: null, last_updated: '',
    category: 'forex', sparkline_in_7d: { price: generateSparkline(1.08, 0.01) }
  },
  {
    id: 'usd-jpy', symbol: 'USD/JPY', name: 'Доллар / Йена', image: '',
    current_price: 155.60, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 40000000000,
    high_24h: 156.10, low_24h: 155.20, price_change_24h: -0.40, price_change_percentage_24h: -0.26,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 160.20, ath_change_percentage: -3, ath_date: '', atl: 75.00, atl_change_percentage: 100, atl_date: '', roi: null, last_updated: '',
    category: 'forex', sparkline_in_7d: { price: generateSparkline(155, 0.015) }
  },
  {
    id: 'usd-rub', symbol: 'USD/RUB', name: 'Доллар / Рубль', image: '',
    current_price: 92.45, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 5000000000,
    high_24h: 93.00, low_24h: 91.80, price_change_24h: 0.50, price_change_percentage_24h: 0.54,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 120.00, ath_change_percentage: -23, ath_date: '', atl: 23.00, atl_change_percentage: 300, atl_date: '', roi: null, last_updated: '',
    category: 'forex', sparkline_in_7d: { price: generateSparkline(92, 0.03) }
  },
  {
    id: 'usd-cny', symbol: 'USD/CNY', name: 'Доллар / Юань', image: '',
    current_price: 7.24, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 15000000000,
    high_24h: 7.25, low_24h: 7.23, price_change_24h: 0.01, price_change_percentage_24h: 0.14,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 8.28, ath_change_percentage: -12, ath_date: '', atl: 6.04, atl_change_percentage: 20, atl_date: '', roi: null, last_updated: '',
    category: 'forex', sparkline_in_7d: { price: generateSparkline(7.24, 0.005) }
  }
];

const MOCK_FUTURES: CoinData[] = [
  {
    id: 'spx-500', symbol: 'US500', name: 'S&P 500', image: '',
    current_price: 5230.50, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 0,
    high_24h: 5250.00, low_24h: 5210.00, price_change_24h: 15.50, price_change_percentage_24h: 0.30,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 5300, ath_change_percentage: -1.3, ath_date: '', atl: 666, atl_change_percentage: 685, atl_date: '', roi: null, last_updated: '',
    category: 'futures', sparkline_in_7d: { price: generateSparkline(5200, 0.03) }
  },
  {
    id: 'nasdaq-100', symbol: 'NAS100', name: 'Nasdaq 100', image: '',
    current_price: 18150.20, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 0,
    high_24h: 18300.00, low_24h: 17950.00, price_change_24h: 85.20, price_change_percentage_24h: 0.47,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 18500, ath_change_percentage: -1.9, ath_date: '', atl: 800, atl_change_percentage: 2100, atl_date: '', roi: null, last_updated: '',
    category: 'futures', sparkline_in_7d: { price: generateSparkline(18000, 0.04) }
  },
  {
    id: 'gold', symbol: 'XAU', name: 'Золото (Gold)', image: '',
    current_price: 2350.10, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 0,
    high_24h: 2365.00, low_24h: 2340.00, price_change_24h: 8.10, price_change_percentage_24h: 0.35,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 2450, ath_change_percentage: -4, ath_date: '', atl: 1050, atl_change_percentage: 123, atl_date: '', roi: null, last_updated: '',
    category: 'futures', sparkline_in_7d: { price: generateSparkline(2350, 0.02) }
  },
  {
    id: 'oil-wti', symbol: 'WTI', name: 'Нефть WTI', image: '',
    current_price: 78.40, market_cap: 0, market_cap_rank: 0, fully_diluted_valuation: null, total_volume: 0,
    high_24h: 79.20, low_24h: 77.80, price_change_24h: -0.90, price_change_percentage_24h: -1.14,
    market_cap_change_24h: 0, market_cap_change_percentage_24h: 0, circulating_supply: 0, total_supply: 0, max_supply: 0,
    ath: 147, ath_change_percentage: -46, ath_date: '', atl: -37, atl_change_percentage: 311, atl_date: '', roi: null, last_updated: '',
    category: 'futures', sparkline_in_7d: { price: generateSparkline(78, 0.05) }
  }
];

const MOCK_COINS: CoinData[] = [
  {
    id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 64231.45, market_cap: 1200000000000, market_cap_rank: 1, fully_diluted_valuation: 1300000000000, total_volume: 35000000000,
    high_24h: 65000, low_24h: 63000, price_change_24h: -1.2, price_change_percentage_24h: -1.2,
    market_cap_change_24h: -1000000000, market_cap_change_percentage_24h: -1.2, circulating_supply: 19000000, total_supply: 21000000, max_supply: 21000000,
    ath: 73750, ath_change_percentage: -12.5, ath_date: '2024-03-14T00:00:00.000Z', atl: 67.81, atl_change_percentage: 90000, atl_date: '2013-07-06T00:00:00.000Z', roi: null, last_updated: '2024-05-20T12:00:00.000Z',
    category: 'crypto', sparkline_in_7d: { price: generateSparkline(64000, 0.04) }
  },
  {
    id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 3050.12, market_cap: 360000000000, market_cap_rank: 2, fully_diluted_valuation: null, total_volume: 15000000000,
    high_24h: 3100, low_24h: 2950, price_change_24h: 2.5, price_change_percentage_24h: 2.5,
    market_cap_change_24h: 5000000000, market_cap_change_percentage_24h: 2.5, circulating_supply: 120000000, total_supply: 120000000, max_supply: null,
    ath: 4891, ath_change_percentage: -37.5, ath_date: '2021-11-16T00:00:00.000Z', atl: 0.42, atl_change_percentage: 700000, atl_date: '2015-10-21T00:00:00.000Z', roi: null, last_updated: '2024-05-20T12:00:00.000Z',
    category: 'crypto', sparkline_in_7d: { price: generateSparkline(3050, 0.04) }
  }
];

// --- NULL SAFETY: CoinGecko sometimes returns null fields ---
const sanitizeCoin = (c: any): CoinData => ({
  ...c,
  current_price: c.current_price ?? 0,
  market_cap: c.market_cap ?? 0,
  market_cap_rank: c.market_cap_rank ?? 0,
  fully_diluted_valuation: c.fully_diluted_valuation ?? null,
  total_volume: c.total_volume ?? 0,
  high_24h: c.high_24h ?? c.current_price ?? 0,
  low_24h: c.low_24h ?? c.current_price ?? 0,
  price_change_24h: c.price_change_24h ?? 0,
  price_change_percentage_24h: c.price_change_percentage_24h ?? 0,
  market_cap_change_24h: c.market_cap_change_24h ?? 0,
  market_cap_change_percentage_24h: c.market_cap_change_percentage_24h ?? 0,
  circulating_supply: c.circulating_supply ?? 0,
  total_supply: c.total_supply ?? null,
  max_supply: c.max_supply ?? null,
  ath: c.ath ?? 0,
  ath_change_percentage: c.ath_change_percentage ?? 0,
  atl: c.atl ?? 0,
  atl_change_percentage: c.atl_change_percentage ?? 0,
});

// --- DATA FETCHERS ---

export const fetchMarketData = async (category: AssetCategory): Promise<ServiceResponse<CoinData[]>> => {
  if (category === 'crypto') {
    return fetchTopCoins();
  } else if (category === 'forex') {
    await new Promise(r => setTimeout(r, 600));
    return serviceResponse(applyLiveJitter(MOCK_FOREX), 'mock', 'Для Forex пока используются демонстрационные данные.');
  } else if (category === 'futures') {
    await new Promise(r => setTimeout(r, 600));
    return serviceResponse(applyLiveJitter(MOCK_FUTURES), 'mock', 'Для фьючерсов пока используются демонстрационные данные.');
  }
  return serviceResponse([], 'mock', 'Источник данных для этой категории не настроен.');
};

export const fetchTopCoins = async (): Promise<ServiceResponse<CoinData[]>> => {
  try {
    const response = await fetchWithRetry(
      `${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h`,
    );

    if (!response.ok) {
      console.warn(`CoinGecko API ${response.status}, using mock data.`);
      const fallbackSource: DataSource = response.status === 429 || response.status >= 500 ? 'retry-mock' : 'unavailable-mock';
      return serviceResponse(
        applyLiveJitter(MOCK_COINS),
        fallbackSource,
        fallbackSource === 'retry-mock'
          ? 'Рыночные данные временно недоступны. Показан демонстрационный набор, а не кеш биржи.'
          : `Провайдер вернул HTTP ${response.status}. Показан демонстрационный набор, а не кеш биржи.`,
      );
    }

    const data = await response.json();
    return serviceResponse(
      data
        .filter((c: any) => c.current_price != null)
        .map((c: any) => sanitizeCoin({ ...c, category: 'crypto' })),
      'api',
    );
  } catch (error) {
    console.error('Failed to fetch coins:', error);
    return serviceResponse(
      applyLiveJitter(MOCK_COINS),
      'retry-mock',
      'Ошибка сети. Показан демонстрационный набор, а не кеш биржи.',
    );
  }
};

export const fetchCoinDetails = async (id: string, category: AssetCategory = 'crypto'): Promise<ServiceResponse<CoinData | null>> => {
  // Handle non-crypto assets using mock data
  if (category === 'forex') {
    const asset = MOCK_FOREX.find(a => a.id === id);
    return serviceResponse(asset ? applyLiveJitter([asset])[0] : null, 'mock', 'Для Forex пока используются демонстрационные данные.');
  }
  if (category === 'futures') {
    const asset = MOCK_FUTURES.find(a => a.id === id);
    return serviceResponse(asset ? applyLiveJitter([asset])[0] : null, 'mock', 'Для фьючерсов пока используются демонстрационные данные.');
  }

  // Existing Crypto logic
  try {
    const response = await fetchWithRetry(
      `${API_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}&sparkline=true&price_change_percentage=24h`,
    );
    if (!response.ok) {
      const mock = MOCK_COINS.find(c => c.id === id);
      const fallbackSource: DataSource = response.status === 429 || response.status >= 500 ? 'retry-mock' : 'unavailable-mock';
      return serviceResponse(
        mock ? applyLiveJitter([mock])[0] : null,
        fallbackSource,
        mock
          ? fallbackSource === 'retry-mock'
            ? 'Детали временно недоступны. Показан демонстрационный набор.'
            : `Провайдер вернул HTTP ${response.status}. Показан демонстрационный набор.`
          : 'Не удалось получить детали.',
      );
    }
    const data = await response.json();
    return serviceResponse(data[0] ? sanitizeCoin({ ...data[0], category: 'crypto' }) : null, 'api');
  } catch (error) {
    console.error('Error fetching detail:', error);
    const mock = MOCK_COINS.find(c => c.id === id);
    return serviceResponse(
      mock ? applyLiveJitter([mock])[0] : null,
      'retry-mock',
      mock ? 'Ошибка сети. Показан демонстрационный набор.' : 'Не удалось подключиться к провайдеру данных.',
    );
  }
};

export const fetchFavoriteCoins = async (ids: string[]): Promise<ServiceResponse<CoinData[]>> => {
  if (ids.length === 0) return serviceResponse([], 'api');

  // Filter mock non-crypto assets first
  const nonCryptoFavorites = [
    ...MOCK_FOREX.filter(a => ids.includes(a.id)),
    ...MOCK_FUTURES.filter(a => ids.includes(a.id))
  ];

  // Filter for actual crypto IDs
  const cryptoIds = ids.filter(id => !nonCryptoFavorites.find(nc => nc.id === id));

  if (cryptoIds.length === 0) {
    return serviceResponse(applyLiveJitter(nonCryptoFavorites), 'mock', 'В избранном только активы с демонстрационными данными.');
  }

  try {
    const response = await fetchWithRetry(
      `${API_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(cryptoIds.join(','))}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`,
    );

    if (!response.ok) {
      const fallbackSource: DataSource = response.status === 429 || response.status >= 500 ? 'retry-mock' : 'unavailable-mock';
      return serviceResponse(
        applyLiveJitter([
          ...nonCryptoFavorites,
          ...MOCK_COINS.filter(c => cryptoIds.includes(c.id)),
        ]),
        fallbackSource,
        fallbackSource === 'retry-mock'
          ? 'Не удалось обновить избранное. Показан демонстрационный набор.'
          : `Провайдер вернул HTTP ${response.status}. Показан демонстрационный набор.`,
      );
    }

    const data = await response.json();
    return serviceResponse(
      [
        ...applyLiveJitter(nonCryptoFavorites),
        ...data
          .filter((c: any) => c.current_price != null)
          .map((c: any) => sanitizeCoin({ ...c, category: 'crypto' })),
      ],
      nonCryptoFavorites.length > 0 ? 'mixed' : 'api',
      nonCryptoFavorites.length > 0
        ? 'Избранное объединяет LIVE-криптоактивы и демонстрационные Forex/Futures.'
        : undefined,
    );
  } catch (error) {
    console.error('Failed to fetch favorite coins:', error);
    return serviceResponse(
      applyLiveJitter([
        ...nonCryptoFavorites,
        ...MOCK_COINS.filter(c => cryptoIds.includes(c.id)),
      ]),
      'retry-mock',
      'Ошибка соединения. Показан демонстрационный набор.',
    );
  }
};
