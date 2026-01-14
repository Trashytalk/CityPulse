// apps/api/src/middleware/auth.ts
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '../lib/jwt';
import { db } from '@citypulse/db';
import { users } from '@citypulse/db/schema';
import { eq } from 'drizzle-orm';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    user: {
      id: string;
      phone: string;
      email: string | null;
      role: 'user' | 'admin' | 'moderator';
    };
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(c: Context, next: Next) {
  const token = extractToken(c);
  
  if (!token) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !payload.sub) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
  
  if (payload.type !== 'access') {
    throw new HTTPException(401, { message: 'Invalid token type' });
  }
  
  // Fetch user from database
  const [user] = await db
    .select({
      id: users.id,
      phone: users.phone,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  
  if (!user) {
    throw new HTTPException(401, { message: 'User not found' });
  }
  
  if (user.status === 'suspended') {
    throw new HTTPException(403, { message: 'Account suspended' });
  }
  
  if (user.status === 'deleted') {
    throw new HTTPException(401, { message: 'Account deleted' });
  }
  
  // Set user in context
  c.set('userId', user.id);
  c.set('user', {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  });
  
  await next();
}

/**
 * Optional authentication - continues if not authenticated
 */
export async function optionalAuth(c: Context, next: Next) {
  const token = extractToken(c);
  
  if (!token) {
    await next();
    return;
  }
  
  try {
    const payload = await verifyToken(token);
    
    if (payload && payload.sub && payload.type === 'access') {
      const [user] = await db
        .select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      
      if (user && user.status === 'active') {
        c.set('userId', user.id);
        c.set('user', {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
        });
      }
    }
  } catch {
    // Ignore token errors for optional auth
  }
  
  await next();
}

/**
 * Require admin role
 */
export async function requireAdmin(c: Context, next: Next) {
  // First verify authentication
  await requireAuth(c, async () => {});
  
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }
  
  await next();
}

/**
 * Require moderator or admin role
 */
export async function requireModerator(c: Context, next: Next) {
  await requireAuth(c, async () => {});
  
  const user = c.get('user');
  
  if (user.role !== 'admin' && user.role !== 'moderator') {
    throw new HTTPException(403, { message: 'Moderator access required' });
  }
  
  await next();
}
