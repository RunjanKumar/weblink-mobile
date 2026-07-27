import {config} from '../constants/config';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, scope: string, args: unknown[]): void {
  // Suppress noisy debug/info logs in production builds.
  if (config.isProduction && (level === 'debug' || level === 'info')) {
    return;
  }
  const prefix = `[${scope}]`;
  /* eslint-disable no-console */
  switch (level) {
    case 'error':
      console.error(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    default:
      console.log(prefix, ...args);
  }
  /* eslint-enable no-console */
}

export const logger = {
  debug: (scope: string, ...args: unknown[]) => emit('debug', scope, args),
  info: (scope: string, ...args: unknown[]) => emit('info', scope, args),
  warn: (scope: string, ...args: unknown[]) => emit('warn', scope, args),
  error: (scope: string, ...args: unknown[]) => emit('error', scope, args),
};
