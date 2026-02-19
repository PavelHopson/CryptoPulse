import { supabase } from '../lib/supabase';
import { errorHandler } from '../lib/errorHandler';

interface UsageEvent {
  event_name: string;
  metadata: Record<string, string | number | boolean>;
}

export const metricsService = {
  async trackUsage(event: UsageEvent): Promise<void> {
    const { error } = await supabase.from('usage_events').insert({
      event_name: event.event_name,
      metadata: event.metadata,
    });
    if (error) throw errorHandler.toAppError(error, 'Unable to track usage event');
  },
  async getRevenueSnapshot(): Promise<{ mrr: number; active_subscribers: number } | null> {
    const { data, error } = await supabase.from('analytics_revenue_snapshot').select('*').maybeSingle();
    if (error) throw errorHandler.toAppError(error, 'Unable to fetch revenue snapshot');
    return data;
  },
};
