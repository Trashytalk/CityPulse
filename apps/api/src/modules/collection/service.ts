// apps/api/src/modules/collection/service.ts
import { AppError, ERROR_CODES } from '../../lib/errors';
import { calculateH3Index } from '../../lib/geo';

import { collectionRepository } from './repository';
import type {
  CreateSessionInput,
  ListSessionsQuery,
  UpdateSessionInput,
  EndSessionInput,
  SensorDataBatch,
  NetworkScanBatch,
} from './validators';

export const collectionService = {
  // ==========================================================================
  // CREATE SESSION
  // ==========================================================================
  async createSession(userId: string, input: CreateSessionInput) {
    // Check if user has active session
    const activeSession = await collectionRepository.getActiveSession(userId);
    if (activeSession) {
      throw new AppError(
        ERROR_CODES.SESSION_ACTIVE,
        'You already have an active collection session',
        400
      );
    }

    // Create session
    const session = await collectionRepository.createSession({
      userId,
      mode: input.mode,
      status: 'active',
      startedAt: new Date(),
      deviceInfo: input.deviceInfo,
    });

    // Lazy import to avoid circular deps
    const { gamificationService } = await import('../gamification/service');
    await gamificationService.awardXp(userId, 5, 'session_started');

    return {
      id: session.id,
      mode: session.mode,
      status: session.status,
      startedAt: session.startedAt,
      uploadUrl: `/api/v1/collection/sessions/${session.id}/upload`,
    };
  },

  // ==========================================================================
  // GET SESSION
  // ==========================================================================
  async getSession(userId: string, sessionId: string) {
    const session = await collectionRepository.getSessionById(sessionId);

    if (!session || session.userId !== userId) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Session not found', 404);
    }

    return session;
  },

  // ==========================================================================
  // LIST SESSIONS
  // ==========================================================================
  async listSessions(userId: string, query: ListSessionsQuery) {
    const { sessions, total } = await collectionRepository.listUserSessions(userId, query);

    return {
      sessions,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + sessions.length < total,
      },
    };
  },

  // ==========================================================================
  // UPDATE SESSION
  // ==========================================================================
  async updateSession(userId: string, sessionId: string, input: UpdateSessionInput) {
    const session = await this.getSession(userId, sessionId);

    if (session.status !== 'active') {
      throw new AppError(
        ERROR_CODES.SESSION_ACTIVE,
        'Can only update active sessions',
        400
      );
    }

    const updated = await collectionRepository.updateSession(sessionId, {
      deviceInfo: input.deviceInfo as Record<string, unknown>,
    });

    return updated;
  },

  // ==========================================================================
  // END SESSION
  // ==========================================================================
  async endSession(userId: string, sessionId: string, input: EndSessionInput) {
    const session = await this.getSession(userId, sessionId);

    if (session.status !== 'active') {
      throw new AppError(
        ERROR_CODES.SESSION_ACTIVE,
        'Session is not active',
        400
      );
    }

    // Calculate duration
    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    // Update session
    const updated = await collectionRepository.updateSession(sessionId, {
      status: 'completed',
      endedAt,
      durationSeconds: input.clientMetrics?.durationSeconds || durationSeconds,
      distanceMeters: input.clientMetrics?.distanceMeters,
      frameCount: input.clientMetrics?.frameCount,
    });

    // Lazy import to avoid circular deps
    const { gamificationService } = await import('../gamification/service');

    // Award completion XP
    await gamificationService.awardXp(userId, 10, 'session_completed');

    // Update streak
    await gamificationService.updateStreak(userId);

    return updated;
  },

  // ==========================================================================
  // VERIFY SESSION OWNERSHIP
  // ==========================================================================
  async verifySessionOwnership(userId: string, sessionId: string) {
    const session = await collectionRepository.getSessionById(sessionId);

    if (!session || session.userId !== userId) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Session not found', 404);
    }

    return session;
  },

  // ==========================================================================
  // GET PROCESSING STATUS
  // ==========================================================================
  async getProcessingStatus(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);

    return {
      sessionId,
      status: session.status,
      processingStartedAt: session.processingStartedAt,
      processingCompletedAt: session.processingCompletedAt,
      processingError: session.processingError,
      earnings: session.status === 'processed' ? {
        cash: session.earnedCash,
        credits: session.earnedCredits,
      } : null,
    };
  },

  // ==========================================================================
  // STORE SENSOR DATA
  // ==========================================================================
  async storeSensorData(userId: string, sessionId: string, data: SensorDataBatch) {
    await this.verifySessionOwnership(userId, sessionId);

    // Convert readings to frames
    const frameData = data.readings.map((reading, index) => ({
      sequenceNumber: index,
      capturedAt: new Date(reading.timestamp),
      latitude: reading.gps.latitude,
      longitude: reading.gps.longitude,
      altitude: reading.gps.altitude,
      heading: reading.gps.heading,
    }));

    await collectionRepository.createFrames(sessionId, frameData);
  },

  // ==========================================================================
  // STORE NETWORK SCANS
  // ==========================================================================
  async storeNetworkScans(userId: string, sessionId: string, data: NetworkScanBatch) {
    await this.verifySessionOwnership(userId, sessionId);

    const scans = data.scans.map(scan => ({
      scannedAt: new Date(scan.timestamp),
      latitude: scan.location.latitude,
      longitude: scan.location.longitude,
      h3Index: calculateH3Index(scan.location.latitude, scan.location.longitude),
      connectionType: scan.connectionType,
      cellReadings: scan.cells,
      wifiReadings: scan.waps,
    }));

    await collectionRepository.createNetworkScans(sessionId, scans);
  },

  // ==========================================================================
  // GET USER STATS
  // ==========================================================================
  async getUserStats(userId: string) {
    const stats = await collectionRepository.getUserStats(userId);
    const recent = await collectionRepository.getRecentSessions(userId);

    return {
      totals: {
        sessions: Number(stats.totalSessions),
        distanceMeters: Number(stats.totalDistance),
        durationSeconds: Number(stats.totalDuration),
        frames: Number(stats.totalFrames),
        earnedCash: Number(stats.totalEarnedCash),
        earnedCredits: Number(stats.totalEarnedCredits),
      },
      averages: {
        qualityScore: Math.round(Number(stats.avgQualityScore)),
      },
      recentSessions: recent.map(s => ({
        id: s.id,
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt,
        distanceMeters: s.distanceMeters,
        earnedCash: s.earnedCash,
      })),
    };
  },
};
