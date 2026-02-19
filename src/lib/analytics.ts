import posthog from 'posthog-js';
import { env } from './env';
import { supabase } from './supabase';

let initialized = false;

export const analytics = {
  init(): void {
    if (!env.posthogKey || initialized) return;
    posthog.init(env.posthogKey, { api_host: 'https://us.i.posthog.com' });
    initialized = true;
  },
  track(event: string, properties?: Record<string, string | number | boolean>): void {
    if (initialized) {
      posthog.capture(event, properties);
    }

    void supabase.auth.getUser().then(({ data }) => {
      void supabase.from('usage_events').insert({
        user_id: data.user?.id ?? null,
        event_name: event,
        metadata: properties ?? {},
      });
    });
  },
};
