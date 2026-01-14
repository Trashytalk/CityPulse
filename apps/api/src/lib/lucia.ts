// apps/api/src/lib/lucia.ts
import { db } from '@citypulse/db';
import { authSessions, users } from '@citypulse/db/schema';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { Lucia, TimeSpan } from 'lucia';

import { env } from './env';

const adapter = new DrizzlePostgreSQLAdapter(db, authSessions, users);

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, 'd'),
  sessionCookie: {
    name: 'citypulse_session',
    expires: false, // Session cookies
    attributes: {
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    phone: attributes.phone,
    email: attributes.email,
    role: attributes.role,
  }),
});

// Type augmentation for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      phone: string;
      email: string | null;
      role: 'user' | 'admin' | 'moderator';
    };
  }
}

// Session validation helper
export async function validateSession(sessionId: string) {
  const result = await lucia.validateSession(sessionId);
  return result;
}

// Create session for user
export async function createSession(userId: string, deviceInfo?: string) {
  const session = await lucia.createSession(userId, {
    deviceInfo,
  });
  return session;
}

// Invalidate session
export async function invalidateSession(sessionId: string) {
  await lucia.invalidateSession(sessionId);
}

// Invalidate all user sessions
export async function invalidateAllUserSessions(userId: string) {
  await lucia.invalidateUserSessions(userId);
}
