// apps/api/src/modules/collection/repository.ts
import { db } from '@citypulse/db';
import { collectionSessions, frames, networkScans, entities } from '@citypulse/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { ListSessionsQuery } from './validators';

export const collectionRepository = {
  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================
  async createSession(data: {
    userId: string;
    mode: string;
    status: string;
    startedAt: Date;
    deviceInfo?: Record<string, unknown>;
  }) {
    const [session] = await db
      .insert(collectionSessions)
      .values({
        userId: data.userId,
        mode: data.mode,
        status: data.status,
        startedAt: data.startedAt,
        deviceInfo: data.deviceInfo,
      })
      .returning();

    return session;
  },

  async getSessionById(sessionId: string) {
    return db.query.collectionSessions.findFirst({
      where: eq(collectionSessions.id, sessionId),
    });
  },

  async getActiveSession(userId: string) {
    return db.query.collectionSessions.findFirst({
      where: and(
        eq(collectionSessions.userId, userId),
        eq(collectionSessions.status, 'active')
      ),
    });
  },

  async listUserSessions(userId: string, query: ListSessionsQuery) {
    const orderByColumn = {
      startedAt: collectionSessions.startedAt,
      endedAt: collectionSessions.endedAt,
      distanceMeters: collectionSessions.distanceMeters,
      earnedCash: collectionSessions.earnedCash,
    }[query.sortBy];

    const orderFn = query.sortOrder === 'asc' ? asc : desc;

    const whereConditions = [eq(collectionSessions.userId, userId)];
    
    if (query.status) {
      whereConditions.push(eq(collectionSessions.status, query.status));
    }
    if (query.mode) {
      whereConditions.push(eq(collectionSessions.mode, query.mode));
    }

    const sessions = await db.query.collectionSessions.findMany({
      where: and(...whereConditions),
      orderBy: orderFn(orderByColumn),
      limit: query.limit,
      offset: query.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collectionSessions)
      .where(and(...whereConditions));

    return { sessions, total: Number(count) };
  },

  async updateSession(sessionId: string, data: Partial<{
    status: string;
    endedAt: Date;
    durationSeconds: number;
    distanceMeters: number;
    frameCount: number;
    qualityScore: number;
    earnedCash: number;
    earnedCredits: number;
    rawDataPath: string;
    processedDataPath: string;
    processingStartedAt: Date;
    processingCompletedAt: Date;
    processingError: string;
    deviceInfo: Record<string, unknown>;
  }>) {
    const [updated] = await db
      .update(collectionSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(collectionSessions.id, sessionId))
      .returning();

    return updated;
  },

  // ==========================================================================
  // FRAME OPERATIONS
  // ==========================================================================
  async createFrames(sessionId: string, frameData: Array<{
    sequenceNumber: number;
    capturedAt: Date;
    latitude: number;
    longitude: number;
    altitude?: number;
    heading?: number;
  }>) {
    if (frameData.length === 0) return [];

    return db
      .insert(frames)
      .values(frameData.map(f => ({
        sessionId,
        ...f,
      })))
      .returning();
  },

  async getSessionFrames(sessionId: string) {
    return db.query.frames.findMany({
      where: eq(frames.sessionId, sessionId),
      orderBy: asc(frames.sequenceNumber),
    });
  },

  // ==========================================================================
  // NETWORK SCAN OPERATIONS
  // ==========================================================================
  async createNetworkScans(sessionId: string, scans: Array<{
    scannedAt: Date;
    latitude: number;
    longitude: number;
    h3Index: string;
    connectionType?: string;
    cellReadings?: unknown;
    wifiReadings?: unknown;
  }>) {
    if (scans.length === 0) return [];

    return db
      .insert(networkScans)
      .values(scans.map(s => ({
        sessionId,
        ...s,
      })))
      .returning();
  },

  // ==========================================================================
  // STATS
  // ==========================================================================
  async getUserStats(userId: string) {
    const [stats] = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        totalDistance: sql<number>`coalesce(sum(${collectionSessions.distanceMeters}), 0)`,
        totalDuration: sql<number>`coalesce(sum(${collectionSessions.durationSeconds}), 0)`,
        totalFrames: sql<number>`coalesce(sum(${collectionSessions.frameCount}), 0)`,
        totalEarnedCash: sql<number>`coalesce(sum(${collectionSessions.earnedCash}), 0)`,
        totalEarnedCredits: sql<number>`coalesce(sum(${collectionSessions.earnedCredits}), 0)`,
        avgQualityScore: sql<number>`coalesce(avg(${collectionSessions.qualityScore}), 0)`,
      })
      .from(collectionSessions)
      .where(eq(collectionSessions.userId, userId));

    return stats;
  },

  async getRecentSessions(userId: string, limit = 5) {
    return db.query.collectionSessions.findMany({
      where: eq(collectionSessions.userId, userId),
      orderBy: desc(collectionSessions.startedAt),
      limit,
    });
  },
};
