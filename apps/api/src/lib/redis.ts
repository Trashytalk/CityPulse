// apps/api/src/lib/redis.ts
import { Redis } from 'ioredis';

import { env } from './env';

// Create Redis client
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message);
});

// Cache helpers
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Set cached value
 */
export async function setCached(
  key: string,
  value: unknown,
  ttl = DEFAULT_TTL
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await redis.setex(key, ttl, serialized);
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Delete cached values by pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userStats: (userId: string) => `user:${userId}:stats`,
  session: (sessionId: string) => `session:${sessionId}`,
  leaderboard: (scope: string, period: string, metric: string) =>
    `leaderboard:${scope}:${period}:${metric}`,
  coverage: (bounds: string) => `coverage:${bounds}`,
  wifiNearby: (h3Index: string) => `wifi:nearby:${h3Index}`,
};

// Rate limiting helpers
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
  
  const count = await redis.incr(windowKey);
  
  if (count === 1) {
    await redis.pexpire(windowKey, windowMs);
  }
  
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const resetAt = Math.ceil(now / windowMs) * windowMs;
  
  return { allowed, remaining, resetAt };
}
