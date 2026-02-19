const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

for (const key of required) {
  if (!import.meta.env[key]) {
    console.warn(`[env] Missing ${key}`);
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined,
  apiBase: import.meta.env.VITE_API_BASE || 'https://api.coingecko.com/api/v3',
  posthogKey: import.meta.env.VITE_POSTHOG_KEY as string | undefined,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  appEnv: import.meta.env.VITE_APP_ENV as string | undefined,
};
