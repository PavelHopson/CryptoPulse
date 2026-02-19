export type UserRole = 'free' | 'pro' | 'enterprise';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d: { price: number[] };
}

export interface Favorite {
  id: string;
  user_id: string;
  coin_id: string;
  created_at: string;
  active?: boolean;
}

export interface PortfolioAsset {
  id: string;
  user_id: string;
  coin_id: string;
  amount: number;
  buy_price: number;
}

export interface Alert {
  id: string;
  user_id: string;
  coin_id: string;
  target_price: number;
  direction: 'above' | 'below';
}

export interface FeatureFlag {
  id: string;
  feature_key: string;
  role: UserRole;
  limit_value: number | null;
  enabled: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  hosted_invoice_url?: string | null;
}
