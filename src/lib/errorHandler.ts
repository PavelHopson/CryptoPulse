import { logger } from './logger';
import { sentry } from './sentry';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN_ERROR',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = {
  toAppError(error: unknown, fallbackMessage = 'Unexpected error'): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) return new AppError(error.message, 'GENERIC_ERROR', error);
    return new AppError(fallbackMessage, 'UNKNOWN_ERROR', error);
  },
  log(error: unknown, context: string): void {
    const appError = this.toAppError(error);
    logger.error('application_error', { context, code: appError.code, message: appError.message });
    sentry.capture(error, { context, code: appError.code });
  },
};
