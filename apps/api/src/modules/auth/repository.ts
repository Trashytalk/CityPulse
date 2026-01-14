// apps/api/src/modules/auth/repository.ts
import { db } from '@citypulse/db';
import { otpCodes, authSessions } from '@citypulse/db/schema';
import { eq, and, gt, desc, sql } from 'drizzle-orm';

export const authRepository = {
  // ==========================================================================
  // OTP OPERATIONS
  // ==========================================================================
  async createOtp(data: {
    phone: string;
    code: string;
    expiresAt: Date;
  }) {
    const [otp] = await db
      .insert(otpCodes)
      .values({
        phone: data.phone,
        code: data.code,
        expiresAt: data.expiresAt,
      })
      .returning();
    
    return otp;
  },

  async getLatestOtp(phone: string) {
    return db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.phone, phone),
        gt(otpCodes.expiresAt, new Date())
      ),
      orderBy: desc(otpCodes.createdAt),
    });
  },

  async incrementOtpAttempts(id: string) {
    await db
      .update(otpCodes)
      .set({ 
        attempts: sql`${otpCodes.attempts} + 1` 
      })
      .where(eq(otpCodes.id, id));
  },

  async markOtpUsed(id: string) {
    await db
      .update(otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(otpCodes.id, id));
  },

  async countRecentOtpAttempts(phone: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(otpCodes)
      .where(and(
        eq(otpCodes.phone, phone),
        gt(otpCodes.createdAt, oneHourAgo)
      ));
    
    return Number(result[0]?.count) || 0;
  },

  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================
  async getUserSessions(userId: string) {
    return db.query.authSessions.findMany({
      where: and(
        eq(authSessions.userId, userId),
        gt(authSessions.expiresAt, new Date())
      ),
      orderBy: desc(authSessions.lastUsedAt),
    });
  },

  async getSessionById(sessionId: string) {
    return db.query.authSessions.findFirst({
      where: eq(authSessions.id, sessionId),
    });
  },

  async updateSessionLastUsed(sessionId: string) {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  },

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  async cleanupExpiredOtps() {
    const result = await db
      .delete(otpCodes)
      .where(sql`${otpCodes.expiresAt} < NOW() - INTERVAL '1 day'`);
    
    return result.rowCount;
  },

  async cleanupExpiredSessions() {
    const result = await db
      .delete(authSessions)
      .where(sql`${authSessions.expiresAt} < NOW()`);
    
    return result.rowCount;
  },
};
