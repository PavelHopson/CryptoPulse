import * as Sentry from '@sentry/react';
import { env } from './env';

let initialized = false;

export const sentry = {
  init(): void {
    if (initialized || !env.sentryDsn) return;
    Sentry.init({
      dsn: env.sentryDsn,
      tracesSampleRate: 0.2,
      environment: env.appEnv ?? 'development',
    });
    initialized = true;
  },
  capture(error: unknown, context?: Record<string, string | number | boolean>): void {
    if (!initialized) return;
    Sentry.captureException(error, { extra: context });
  },
};
