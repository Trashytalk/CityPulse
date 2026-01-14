// apps/api/src/middleware/logger.ts
import type { Context, Next } from 'hono';
import { env } from '../lib/env';

// Simple logger interface
interface Logger {
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

// Create simple logger (can be swapped with pino in Node.js)
function createLogger(): Logger {
  const level = env.LOG_LEVEL;
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(level);

  const shouldLog = (msgLevel: string): boolean => {
    return levels.indexOf(msgLevel) >= currentLevelIndex;
  };

  const formatLog = (lvl: string, obj: Record<string, unknown>, msg?: string): void => {
    if (!shouldLog(lvl)) return;

    const timestamp = new Date().toISOString();
    const logData = { timestamp, level: lvl, ...obj };
    
    if (msg) {
      console.log(`[${timestamp}] ${lvl.toUpperCase()}: ${msg}`, JSON.stringify(logData));
    } else {
      console.log(`[${timestamp}] ${lvl.toUpperCase()}:`, JSON.stringify(logData));
    }
  };

  const baseLogger: Logger = {
    debug: (obj, msg) => formatLog('debug', obj, msg),
    info: (obj, msg) => formatLog('info', obj, msg),
    warn: (obj, msg) => formatLog('warn', obj, msg),
    error: (obj, msg) => formatLog('error', obj, msg),
    child: (bindings) => {
      const childLogger: Logger = {
        debug: (obj, msg) => formatLog('debug', { ...bindings, ...obj }, msg),
        info: (obj, msg) => formatLog('info', { ...bindings, ...obj }, msg),
        warn: (obj, msg) => formatLog('warn', { ...bindings, ...obj }, msg),
        error: (obj, msg) => formatLog('error', { ...bindings, ...obj }, msg),
        child: (moreBindings) => baseLogger.child({ ...bindings, ...moreBindings }),
      };
      return childLogger;
    },
  };

  return baseLogger;
}

export const logger = createLogger();

declare module 'hono' {
  interface ContextVariableMap {
    logger: Logger;
  }
}

/**
 * Request logging middleware
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = c.get('requestId');
  
  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });
  
  c.set('logger', reqLogger);
  
  // Log request start
  reqLogger.debug({ query: c.req.query() }, 'Request started');
  
  try {
    await next();
    
    // Log response
    const duration = Date.now() - start;
    const status = c.res.status;
    
    const logMethod = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    
    reqLogger[logMethod]({
      status,
      duration,
      userId: c.get('userId'),
    }, 'Request completed');
    
  } catch (error) {
    const duration = Date.now() - start;
    
    reqLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    }, 'Request failed');
    
    throw error;
  }
}

/**
 * Get logger from context or create new one
 */
export function getLogger(c: Context): Logger {
  return c.get('logger') || logger;
}
