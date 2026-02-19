import axios from 'axios';
import { env } from '../lib/env';
import { CoinMarket } from '../types/domain';

const api = axios.create({ baseURL: env.apiBase });

export const cryptoService = {
  async getTopCoins(limit = 20): Promise<CoinMarket[]> {
    const { data } = await api.get<CoinMarket[]>('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: true,
        price_change_percentage: '24h',
      },
    });

    return data;
  },
};
