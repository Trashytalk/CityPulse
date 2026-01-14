// apps/api/src/middleware/requestId.ts
import type { Context, Next } from 'hono';
import { randomUUID } from 'crypto';

// Header name for request ID
const REQUEST_ID_HEADER = 'X-Request-ID';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Add unique request ID to each request
 */
export async function requestId(c: Context, next: Next) {
  // Use provided request ID or generate new one
  const existingId = c.req.header(REQUEST_ID_HEADER);
  const id = existingId || randomUUID();
  
  // Set in context for use in logging
  c.set('requestId', id);
  
  // Add to response headers
  c.header(REQUEST_ID_HEADER, id);
  
  await next();
}
