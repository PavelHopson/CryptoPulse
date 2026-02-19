export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: string | number | boolean | null | undefined;
}

const emit = (level: LogLevel, message: string, meta?: LogMeta): void => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {}),
  };
  const serialized = JSON.stringify(payload);
  if (level === 'debug') console.debug(serialized);
  if (level === 'info') console.info(serialized);
  if (level === 'warn') console.warn(serialized);
  if (level === 'error') console.error(serialized);
};

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    emit('debug', message, meta);
  },
  info(message: string, meta?: LogMeta): void {
    emit('info', message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    emit('warn', message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    emit('error', message, meta);
  },
};
