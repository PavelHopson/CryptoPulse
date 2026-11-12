
import { TraderProfile } from '../types';

// These are fixed paper scenarios for comparing methods, not people or live accounts.
const MOCK_SCENARIOS: TraderProfile[] = [
  { id: 't1', rank: 1, name: 'Momentum / BTC', avatar: '↗', profitPercent: 45.2, winRate: 68, followers: 0, isHot: true, topAsset: 'BTC' },
  { id: 't2', rank: 2, name: 'Breakout / ETH', avatar: '◈', profitPercent: 31.2, winRate: 63, followers: 0, isHot: false, topAsset: 'ETH' },
  { id: 't3', rank: 3, name: 'Trend / SOL', avatar: '◇', profitPercent: 28.9, winRate: 61, followers: 0, isHot: true, topAsset: 'SOL' },
  { id: 't4', rank: 4, name: 'Mean reversion / XAU', avatar: '◌', profitPercent: 14.5, winRate: 58, followers: 0, isHot: false, topAsset: 'XAU' },
  { id: 't5', rank: 5, name: 'Range / EUR', avatar: '⇄', profitPercent: 9.8, winRate: 56, followers: 0, isHot: true, topAsset: 'EUR' },
  { id: 't6', rank: 6, name: 'Defensive / WTI', avatar: '▽', profitPercent: 8.7, winRate: 54, followers: 0, isHot: false, topAsset: 'WTI' },
  { id: 't7', rank: 7, name: 'Low volatility / BTC', avatar: '≈', profitPercent: 4.5, winRate: 52, followers: 0, isHot: true, topAsset: 'BTC' },
  { id: 't8', rank: 8, name: 'Stress test / ETH', avatar: '!', profitPercent: -1.2, winRate: 44, followers: 0, isHot: true, topAsset: 'ETH' },
];

export const getPaperScenarios = async (): Promise<TraderProfile[]> => {
  // Simulate API delay
  await new Promise(r => setTimeout(r, 600));
  return MOCK_SCENARIOS;
};
