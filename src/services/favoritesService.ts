import { AppError, errorHandler } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { Favorite, UserRole } from '../types/domain';

const sanitizeCoinId = (coinId: string): string => coinId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

const getFavoritesLimit = async (role: UserRole): Promise<number> => {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('limit_value')
    .eq('feature_key', 'favorites_limit')
    .eq('role', role)
    .eq('enabled', true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.limit_value) return Number.MAX_SAFE_INTEGER;
  return Number(data.limit_value);
};

export const favoritesService = {
  async list(userId: string): Promise<Favorite[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) throw error;
      return data;
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to fetch favorites');
    }
  },
  async add(userId: string, coinId: string, role: UserRole): Promise<void> {
    const normalizedCoinId = sanitizeCoinId(coinId);
    if (!normalizedCoinId) throw new AppError('Invalid coin id', 'VALIDATION_ERROR');

    try {
      const [current, limit] = await Promise.all([this.list(userId), getFavoritesLimit(role)]);
      const activeCount = current.filter((item) => item.active ?? true).length;
      if (activeCount >= limit) {
        throw new AppError(`Favorites limit reached for ${role} plan`, 'PLAN_LIMIT_REACHED');
      }
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, coin_id: normalizedCoinId, active: true });
      if (error) throw error;
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to add favorite');
    }
  },
  async remove(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('favorites').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to remove favorite');
    }
  },
  async markInactive(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const { error } = await supabase.from('favorites').update({ active: false }).in('id', ids);
      if (error) throw error;
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to mark favorites inactive');
    }
  },
};
