
export type AssetCategory = 'crypto' | 'forex' | 'futures';
export type Timeframe = '1H' | '1D' | '1W' | '1M' | '1Y';

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: null | {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
  category?: AssetCategory;
}

export interface Position {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  amount: number;
  leverage: number;
  timestamp: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE_FEE';
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  date: string;
}

export interface AssetAllocation {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformancePoint {
  date: string;
  value: number;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For Ollama or custom endpoints
}

export const AI_MODELS: Record<AIProvider, { name: string; models: string[]; needsKey: boolean; placeholder: string }> = {
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    needsKey: true,
    placeholder: 'AIza...',
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini'],
    needsKey: true,
    placeholder: 'sk-...',
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6'],
    needsKey: true,
    placeholder: 'sk-ant-...',
  },
  openrouter: {
    name: 'OpenRouter',
    models: ['google/gemini-2.5-flash', 'anthropic/claude-sonnet-4-6', 'openai/gpt-4o', 'meta-llama/llama-4-maverick'],
    needsKey: true,
    placeholder: 'sk-or-...',
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['huihui-ai/Huihui-Qwen3.5-35B-A3B-abliterated', 'llama3.1', 'mistral', 'gemma2', 'qwen2.5'],
    needsKey: false,
    placeholder: 'http://localhost:11434',
  },
};

export interface UserPreferences {
  currency: 'USD' | 'EUR' | 'RUB';
  language: 'EN' | 'RU';
  notifications: {
    email: boolean;
    push: boolean;
    priceAlerts: boolean;
  };
  twoFactorEnabled: boolean;
  ai?: AIConfig;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'LOGIN' | 'PROFILE_UPDATE' | 'BALANCE_ADJUSTMENT' | 'SECURITY_UPDATE';
  details: string;
  timestamp: string;
  ip?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  balance: number;
  equity: number;
  positions: Position[];
  transactions?: Transaction[];
  preferences: UserPreferences;
  is_pro: boolean;
  member_since: string;
  status?: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  achievements: Achievement[];
  level: number;
  xp: number;
}

export interface ChartPoint {
  time: string;
  price: number;
  originalTime: number;
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  originalTime: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  type: 'MARKET' | 'PROJECT';
}

export interface TraderProfile {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  profitPercent: number;
  winRate: number;
  followers: number;
  isHot: boolean;
  topAsset: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  marketVolatility: number;
  marketBias: 'NEUTRAL' | 'BULLISH' | 'BEARISH';
  allowRegistrations: boolean;
  globalAlert: string | null;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  source: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balanceEth: number;
  provider: string | null; // 'Metamask' | 'WalletConnect' etc
}