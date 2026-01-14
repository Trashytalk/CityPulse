// apps/api/src/lib/monitoring.ts
import * as Sentry from '@sentry/node';
import { env } from './env';
import { logger } from '../middleware/logger';

// Initialize Sentry if DSN is configured
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (env.NODE_ENV === 'production') {
        if (event.level === 'info' || event.level === 'debug') {
          return null;
        }
      }
      return event;
    },
  });
  logger.info('Sentry initialized');
}

/**
 * Capture an error to Sentry
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): string | undefined {
  logger.error({ error, context }, 'Error captured');
  
  if (!env.SENTRY_DSN) {
    return undefined;
  }
  
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!env.SENTRY_DSN) {
    return undefined;
  }
  
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  phone?: string;
  email?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startInactiveSpan> {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

// Axiom logging (optional)
interface AxiomLog {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

class AxiomLogger {
  private dataset = 'citypulse-logs';
  private buffer: AxiomLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    if (process.env.AXIOM_TOKEN) {
      // Flush every 5 seconds
      this.flushInterval = setInterval(() => this.flush(), 5000);
    }
  }
  
  log(level: string, message: string, data?: Record<string, unknown>) {
    if (!process.env.AXIOM_TOKEN) {
      return;
    }
    
    this.buffer.push({
      level,
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    // Flush if buffer is large
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0 || !process.env.AXIOM_TOKEN) {
      return;
    }
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await fetch(`https://api.axiom.co/v1/datasets/${this.dataset}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AXIOM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });
    } catch (error) {
      // Re-add logs on failure
      this.buffer.unshift(...logs);
    }
  }
  
  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    return this.flush();
  }
}

export const axiomLogger = new AxiomLogger();
