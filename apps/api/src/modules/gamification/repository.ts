// apps/api/src/modules/gamification/repository.ts
import { db } from '@citypulse/db';
import {
  userProgression,
  achievements,
  userAchievements,
  challenges,
  userChallenges,
} from '@citypulse/db/schema';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';

export const gamificationRepository = {
  // ==========================================================================
  // PROGRESSION OPERATIONS
  // ==========================================================================
  async createProgression(data: {
    userId: string;
    totalXp: number;
    level: number;
    title: string;
    currentStreak: number;
    longestStreak: number;
  }) {
    const [progression] = await db
      .insert(userProgression)
      .values(data)
      .returning();

    return progression;
  },

  async getProgression(userId: string) {
    return db.query.userProgression.findFirst({
      where: eq(userProgression.userId, userId),
    });
  },

  async updateProgression(userId: string, data: Partial<{
    totalXp: number;
    level: number;
    title: string;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    totalDistanceKm: number;
    totalSessions: number;
    totalFrames: number;
    totalEntities: number;
    uniqueH3Cells: number;
  }>) {
    const [updated] = await db
      .update(userProgression)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userProgression.userId, userId))
      .returning();

    return updated;
  },

  // ==========================================================================
  // XP TRANSACTIONS
  // ==========================================================================
  async logXpTransaction(data: {
    userId: string;
    amount: number;
    source: string;
    metadata?: Record<string, unknown>;
    levelBefore: number;
    levelAfter: number;
  }) {
    // For now, we just update progression - could add XP log table later
    return data;
  },

  // ==========================================================================
  // ACHIEVEMENTS
  // ==========================================================================
  async getAllAchievementIds() {
    const result = await db
      .select({ id: achievements.id })
      .from(achievements);

    return result.map(r => r.id);
  },

  async initializeUserAchievements(userId: string, achievementIds: string[]) {
    if (achievementIds.length === 0) return;

    await db
      .insert(userAchievements)
      .values(achievementIds.map(achievementId => ({
        userId,
        achievementId,
        progress: 0,
      })))
      .onConflictDoNothing();
  },

  async getUserAchievements(userId: string) {
    return db.query.userAchievements.findMany({
      where: eq(userAchievements.userId, userId),
      with: {
        achievement: true,
      },
    });
  },

  async getUserAchievement(userId: string, achievementId: string) {
    return db.query.userAchievements.findFirst({
      where: and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ),
      with: {
        achievement: true,
      },
    });
  },

  async getUserAchievementBySlug(userId: string, slug: string) {
    const achievement = await db.query.achievements.findFirst({
      where: eq(achievements.slug, slug),
    });

    if (!achievement) return null;

    return db.query.userAchievements.findFirst({
      where: and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievement.id)
      ),
      with: {
        achievement: true,
      },
    });
  },

  async unlockAchievement(userId: string, achievementId: string) {
    await db
      .update(userAchievements)
      .set({
        progress: 1,
        unlockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
  },

  async updateAchievementProgress(userId: string, achievementId: string, progress: number) {
    await db
      .update(userAchievements)
      .set({
        progress,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
  },

  async claimAchievement(userId: string, achievementId: string) {
    await db
      .update(userAchievements)
      .set({
        claimed: true,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
  },

  // ==========================================================================
  // CHALLENGES
  // ==========================================================================
  async getActiveChallenges(type: string) {
    const now = new Date();

    const whereConditions = [
      eq(challenges.isActive, true),
      lte(challenges.startsAt, now),
      gte(challenges.endsAt, now),
    ];

    if (type !== 'all') {
      whereConditions.push(eq(challenges.type, type));
    }

    return db.query.challenges.findMany({
      where: and(...whereConditions),
      orderBy: asc(challenges.endsAt),
    });
  },

  async getUserChallenges(userId: string) {
    return db.query.userChallenges.findMany({
      where: eq(userChallenges.userId, userId),
    });
  },

  async getChallenge(challengeId: string) {
    return db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
    });
  },

  async getUserChallenge(userId: string, challengeId: string) {
    return db.query.userChallenges.findFirst({
      where: and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ),
    });
  },

  async joinChallenge(userId: string, challengeId: string) {
    const [joined] = await db
      .insert(userChallenges)
      .values({
        userId,
        challengeId,
        progress: 0,
        currentValue: 0,
        joinedAt: new Date(),
      })
      .returning();

    return joined;
  },

  async updateChallengeProgress(userId: string, challengeId: string, data: {
    progress: number;
    currentValue: number;
    completed?: boolean;
    completedAt?: Date;
  }) {
    await db
      .update(userChallenges)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ));
  },

  async claimChallengeReward(userId: string, challengeId: string) {
    await db
      .update(userChallenges)
      .set({
        claimed: true,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ));
  },

  async hasChallengesForDate(date: Date, type: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(challenges)
      .where(and(
        eq(challenges.type, type),
        gte(challenges.startsAt, dayStart),
        lte(challenges.startsAt, dayEnd)
      ));

    return Number(result[0]?.count) > 0;
  },

  async createChallenges(challengeData: Array<{
    name: string;
    description: string;
    type: string;
    goal: unknown;
    rewardXp: number;
    rewardCredits: number;
    rewardCash?: number;
    startsAt: Date;
    endsAt: Date;
  }>) {
    if (challengeData.length === 0) return [];

    return db
      .insert(challenges)
      .values(challengeData)
      .returning();
  },

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================
  async getLeaderboard(metric: string, limit: number) {
    const orderColumn = {
      xp: userProgression.totalXp,
      distance: userProgression.totalDistanceKm,
      sessions: userProgression.totalSessions,
      entities: userProgression.totalEntities,
    }[metric] || userProgression.totalXp;

    return db.query.userProgression.findMany({
      orderBy: desc(orderColumn),
      limit,
      with: {
        user: {
          columns: {
            id: true,
            phone: false, // Don't expose phone
          },
        },
      },
    });
  },

  async getUserRank(userId: string, metric: string) {
    const progression = await this.getProgression(userId);
    if (!progression) return null;

    const metricValue = {
      xp: progression.totalXp,
      distance: progression.totalDistanceKm,
      sessions: progression.totalSessions,
      entities: progression.totalEntities,
    }[metric] || progression.totalXp;

    const metricColumn = {
      xp: userProgression.totalXp,
      distance: userProgression.totalDistanceKm,
      sessions: userProgression.totalSessions,
      entities: userProgression.totalEntities,
    }[metric] || userProgression.totalXp;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userProgression)
      .where(sql`${metricColumn} > ${metricValue}`);

    return Number(result?.count) + 1;
  },
};
