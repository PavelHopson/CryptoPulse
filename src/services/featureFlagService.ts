import { supabase } from '../lib/supabase';
import { FeatureFlag, UserRole } from '../types/domain';
import { errorHandler } from '../lib/errorHandler';

export const featureFlagService = {
  async getFlag(featureKey: string, role: UserRole): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('role', role)
        .eq('enabled', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to fetch feature flag');
    }
  },
};
