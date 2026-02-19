import { AppError } from './errorHandler';

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const rateLimiter = {
  assertWithinBudget(key: string, budget: number, windowMs: number): void {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { tokens: 1, resetAt: now + windowMs });
      return;
    }

    if (bucket.tokens >= budget) {
      throw new AppError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED');
    }

    bucket.tokens += 1;
  },
};
