// apps/api/src/middleware/rateLimit.ts
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { checkRateLimit } from '../lib/redis';
import { env } from '../lib/env';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
}

/**
 * Create rate limit middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    max = env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = defaultKeyGenerator,
    skip,
  } = options;
  
  return async (c: Context, next: Next) => {
    // Check if should skip
    if (skip && skip(c)) {
      await next();
      return;
    }
    
    const key = keyGenerator(c);
    const { allowed, remaining, resetAt } = await checkRateLimit(key, max, windowMs);
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', new Date(resetAt).toISOString());
    
    if (!allowed) {
      c.header('Retry-After', Math.ceil((resetAt - Date.now()) / 1000).toString());
      throw new HTTPException(429, { message: 'Rate limit exceeded' });
    }
    
    await next();
  };
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(c: Context): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwardedFor = c.req.header('X-Forwarded-For');
  const realIp = c.req.header('X-Real-IP');
  
  const ip = forwardedFor?.split(',')[0].trim() 
    || realIp 
    || c.req.header('CF-Connecting-IP') // Cloudflare
    || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * User-based rate limit key generator
 */
export function userKeyGenerator(c: Context): string {
  const userId = c.get('userId');
  if (userId) {
    return `user:${userId}`;
  }
  return defaultKeyGenerator(c);
}

/**
 * Endpoint-specific rate limit key generator
 */
export function endpointKeyGenerator(c: Context): string {
  const method = c.req.method;
  const path = c.req.path;
  const base = defaultKeyGenerator(c);
  return `${base}:${method}:${path}`;
}

// Preset rate limiters
export const rateLimiters = {
  // Standard API rate limit
  standard: rateLimit(),
  
  // Strict rate limit for sensitive operations
  strict: rateLimit({
    windowMs: 60000,
    max: 10,
  }),
  
  // Auth endpoints (OTP requests)
  auth: rateLimit({
    windowMs: 600000, // 10 minutes
    max: 5,
    keyGenerator: endpointKeyGenerator,
  }),
  
  // Upload endpoints
  upload: rateLimit({
    windowMs: 60000,
    max: 30,
    keyGenerator: userKeyGenerator,
  }),
};
