// apps/api/src/modules/gamification/service.ts
import { AppError, ERROR_CODES } from '../../lib/errors';

import { gamificationRepository } from './repository';
import type { ChallengesQuery, LeaderboardQuery } from './validators';

// XP calculation helpers
const XP_PER_LEVEL = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, // 1-10
  5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000, // 11-20
  21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600, 43500, // 21-30
  46500, 49600, 52800, 56100, 59500, 63000, 66600, 70300, 74100, 78000, // 31-40
  82000, 86100, 90300, 94600, 99000, 103500, 108100, 112800, 117600, 122500, // 41-50
];

const LEVEL_TITLES: Record<number, string> = {
  1: 'Newcomer',
  5: 'Explorer',
  10: 'Mapper',
  15: 'Scout',
  20: 'Pathfinder',
  25: 'Surveyor',
  30: 'Navigator',
  35: 'Trailblazer',
  40: 'Pioneer',
  45: 'Master',
  50: 'Legend',
};

function calculateLevel(totalXp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (totalXp >= XP_PER_LEVEL[i]) return i + 1;
  }
  return 1;
}

function calculateXpForLevel(level: number): number {
  return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)] || 0;
}

function getLevelTitle(level: number): string {
  let title = 'Newcomer';
  for (const [lvl, t] of Object.entries(LEVEL_TITLES)) {
    if (level >= parseInt(lvl)) title = t;
  }
  return title;
}

function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export const gamificationService = {
  // ==========================================================================
  // INITIALIZE PROGRESSION
  // ==========================================================================
  async initializeProgression(userId: string) {
    await gamificationRepository.createProgression({
      userId,
      totalXp: 0,
      level: 1,
      title: 'Newcomer',
      currentStreak: 0,
      longestStreak: 0,
    });

    // Initialize all achievements with 0 progress
    const achievementIds = await gamificationRepository.getAllAchievementIds();
    await gamificationRepository.initializeUserAchievements(userId, achievementIds);
  },

  // ==========================================================================
  // GET PROGRESSION
  // ==========================================================================
  async getProgression(userId: string) {
    const progression = await gamificationRepository.getProgression(userId);

    if (!progression) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Progression not found', 404);
    }

    const currentLevelXp = calculateXpForLevel(progression.level);
    const nextLevelXp = calculateXpForLevel(progression.level + 1);
    const xpInCurrentLevel = progression.totalXp - currentLevelXp;
    const xpNeededForNextLevel = nextLevelXp - currentLevelXp;

    return {
      level: progression.level,
      title: progression.title,
      totalXp: progression.totalXp,

      levelProgress: {
        current: xpInCurrentLevel,
        required: xpNeededForNextLevel,
        percentage: xpNeededForNextLevel > 0
          ? Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100)
          : 100,
      },

      streak: {
        current: progression.currentStreak,
        longest: progression.longestStreak,
        lastActivityDate: progression.lastActivityDate,
        isActiveToday: isToday(progression.lastActivityDate),
      },

      stats: {
        totalDistanceKm: progression.totalDistanceKm,
        totalSessions: progression.totalSessions,
        totalFrames: progression.totalFrames,
        totalEntities: progression.totalEntities,
        uniqueH3Cells: progression.uniqueH3Cells,
      },
    };
  },

  // ==========================================================================
  // AWARD XP
  // ==========================================================================
  async awardXp(
    userId: string,
    amount: number,
    source: string,
    metadata?: Record<string, unknown>
  ) {
    const progression = await gamificationRepository.getProgression(userId);
    if (!progression) return null;

    const newTotalXp = progression.totalXp + amount;
    const newLevel = calculateLevel(newTotalXp);
    const leveledUp = newLevel > progression.level;

    // Update progression
    await gamificationRepository.updateProgression(userId, {
      totalXp: newTotalXp,
      level: newLevel,
      title: getLevelTitle(newLevel),
    });

    // Log XP transaction
    await gamificationRepository.logXpTransaction({
      userId,
      amount,
      source,
      metadata,
      levelBefore: progression.level,
      levelAfter: newLevel,
    });

    // If leveled up, award bonus
    if (leveledUp) {
      const { paymentsService } = await import('../payments/service');
      const levelUpBonus = newLevel * 10;
      await paymentsService.creditCredits(userId, levelUpBonus, 'level_up_bonus', {
        newLevel,
      });

      // Check for level-based achievements
      await this.checkAchievement(userId, `level_${newLevel}`);
    }

    return { awarded: amount, newTotal: newTotalXp, leveledUp, newLevel };
  },

  // ==========================================================================
  // UPDATE STREAK
  // ==========================================================================
  async updateStreak(userId: string) {
    const progression = await gamificationRepository.getProgression(userId);
    if (!progression) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = progression.lastActivityDate
      ? new Date(progression.lastActivityDate)
      : null;

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
    }

    let newStreak = progression.currentStreak;

    if (!lastActivity) {
      // First activity
      newStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already active today, no change
        return;
      } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = progression.currentStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, progression.longestStreak);

    await gamificationRepository.updateProgression(userId, {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: today,
    });

    // Award streak bonus XP
    if (newStreak > 1) {
      await this.awardXp(userId, newStreak * 5, 'streak_bonus', { streak: newStreak });
    }

    // Check streak achievements
    if (newStreak >= 7) await this.checkAchievement(userId, 'streak_7');
    if (newStreak >= 30) await this.checkAchievement(userId, 'streak_30');
    if (newStreak >= 100) await this.checkAchievement(userId, 'streak_100');
  },

  // ==========================================================================
  // ACHIEVEMENTS
  // ==========================================================================
  async getAchievements(userId: string) {
    const userAchievements = await gamificationRepository.getUserAchievements(userId);

    const categories: Record<string, unknown[]> = {
      distance: [],
      sessions: [],
      coverage: [],
      quality: [],
      social: [],
      special: [],
    };

    for (const ua of userAchievements) {
      if (!ua.achievement) continue;

      const achievement = {
        id: ua.achievement.id,
        slug: ua.achievement.slug,
        name: ua.achievement.name,
        description: ua.achievement.description,
        iconUrl: ua.achievement.iconUrl,
        difficulty: ua.achievement.difficulty,
        isHidden: ua.achievement.isHidden && !ua.unlockedAt,

        progress: ua.progress,
        isUnlocked: !!ua.unlockedAt,
        unlockedAt: ua.unlockedAt,

        rewards: {
          xp: ua.achievement.rewardXp,
          credits: ua.achievement.rewardCredits,
        },

        claimed: ua.claimed,
      };

      const category = ua.achievement.category || 'special';
      if (!ua.achievement.isHidden || ua.unlockedAt) {
        if (categories[category]) {
          categories[category].push(achievement);
        }
      }
    }

    // Sort by unlocked status, then progress
    for (const category of Object.keys(categories)) {
      categories[category].sort((a: any, b: any) => {
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progress - a.progress;
      });
    }

    return {
      categories,
      summary: {
        total: userAchievements.length,
        unlocked: userAchievements.filter(a => a.unlockedAt).length,
        claimable: userAchievements.filter(a => a.unlockedAt && !a.claimed).length,
      },
    };
  },

  async getAchievementDetail(userId: string, achievementId: string) {
    const ua = await gamificationRepository.getUserAchievement(userId, achievementId);

    if (!ua || !ua.achievement) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Achievement not found', 404);
    }

    return {
      ...ua.achievement,
      progress: ua.progress,
      isUnlocked: !!ua.unlockedAt,
      unlockedAt: ua.unlockedAt,
      claimed: ua.claimed,
      claimedAt: ua.claimedAt,
    };
  },

  async checkAchievement(userId: string, slug: string) {
    const ua = await gamificationRepository.getUserAchievementBySlug(userId, slug);
    if (!ua || ua.unlockedAt) return; // Not found or already unlocked

    // For now, just unlock if checking
    await gamificationRepository.unlockAchievement(userId, ua.achievementId);
  },

  async claimAchievement(userId: string, achievementId: string) {
    const ua = await gamificationRepository.getUserAchievement(userId, achievementId);

    if (!ua || !ua.achievement) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Achievement not found', 404);
    }

    if (!ua.unlockedAt) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Achievement not yet unlocked', 400);
    }

    if (ua.claimed) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Already claimed', 400);
    }

    // Mark as claimed
    await gamificationRepository.claimAchievement(userId, achievementId);

    // Award credits
    if (ua.achievement.rewardCredits > 0) {
      const { paymentsService } = await import('../payments/service');
      await paymentsService.creditCredits(
        userId,
        ua.achievement.rewardCredits,
        'achievement_reward',
        { achievement: ua.achievement.slug }
      );
    }

    return {
      success: true,
      rewards: {
        xp: ua.achievement.rewardXp,
        credits: ua.achievement.rewardCredits,
      },
    };
  },

  // ==========================================================================
  // CHALLENGES
  // ==========================================================================
  async getChallenges(userId: string, query: ChallengesQuery) {
    const challenges = await gamificationRepository.getActiveChallenges(query.type);
    const userChallenges = await gamificationRepository.getUserChallenges(userId);

    const userChallengeMap = new Map(userChallenges.map(uc => [uc.challengeId, uc]));

    const result = challenges.map(challenge => {
      const userChallenge = userChallengeMap.get(challenge.id);

      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        type: challenge.type,

        goal: challenge.goal,
        progress: userChallenge?.progress || 0,
        currentValue: userChallenge?.currentValue || 0,

        rewards: {
          xp: challenge.rewardXp,
          credits: challenge.rewardCredits,
          cash: challenge.rewardCash,
        },

        timing: {
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
          timeRemaining: Math.max(0, new Date(challenge.endsAt).getTime() - Date.now()),
        },

        status: userChallenge
          ? userChallenge.completed
            ? userChallenge.claimed ? 'claimed' : 'completed'
            : 'joined'
          : 'available',
      };
    });

    // Filter by status if requested
    const filtered = query.status === 'all'
      ? result
      : result.filter(c => c.status === query.status);

    return {
      daily: filtered.filter(c => c.type === 'daily'),
      weekly: filtered.filter(c => c.type === 'weekly'),
      monthly: filtered.filter(c => c.type === 'monthly'),
      special: filtered.filter(c => c.type === 'special'),
    };
  },

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await gamificationRepository.getChallenge(challengeId);

    if (!challenge) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Challenge not found', 404);
    }

    if (new Date() > challenge.endsAt) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This challenge has ended', 400);
    }

    // Check if already joined
    const existing = await gamificationRepository.getUserChallenge(userId, challengeId);
    if (existing) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Already joined this challenge', 400);
    }

    await gamificationRepository.joinChallenge(userId, challengeId);

    return { success: true, message: 'Joined challenge' };
  },

  async claimChallengeReward(userId: string, challengeId: string) {
    const challenge = await gamificationRepository.getChallenge(challengeId);
    const userChallenge = await gamificationRepository.getUserChallenge(userId, challengeId);

    if (!challenge || !userChallenge) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Challenge not found', 404);
    }

    if (!userChallenge.completed) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Challenge not yet completed', 400);
    }

    if (userChallenge.claimed) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Already claimed', 400);
    }

    await gamificationRepository.claimChallengeReward(userId, challengeId);

    // Award rewards
    const { paymentsService } = await import('../payments/service');

    if (challenge.rewardXp > 0) {
      await this.awardXp(userId, challenge.rewardXp, 'challenge_reward', { challengeId });
    }

    if (challenge.rewardCredits > 0) {
      await paymentsService.creditCredits(userId, challenge.rewardCredits, 'challenge_reward', { challengeId });
    }

    if (challenge.rewardCash && challenge.rewardCash > 0) {
      await paymentsService.creditCash(userId, challenge.rewardCash, 'challenge_reward', { challengeId });
    }

    return {
      success: true,
      rewards: {
        xp: challenge.rewardXp,
        credits: challenge.rewardCredits,
        cash: challenge.rewardCash,
      },
    };
  },

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================
  async getLeaderboard(userId: string, query: LeaderboardQuery) {
    const entries = await gamificationRepository.getLeaderboard(query.metric, query.limit);
    const userRank = await gamificationRepository.getUserRank(userId, query.metric);

    return {
      entries: entries.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        level: entry.level,
        title: entry.title,
        value: {
          xp: entry.totalXp,
          distance: entry.totalDistanceKm,
          sessions: entry.totalSessions,
          entities: entry.totalEntities,
        }[query.metric],
        isCurrentUser: entry.userId === userId,
      })),
      userRank,
      scope: query.scope,
      period: query.period,
      metric: query.metric,
    };
  },

  // ==========================================================================
  // STREAKS
  // ==========================================================================
  async getStreakInfo(userId: string) {
    const progression = await gamificationRepository.getProgression(userId);

    if (!progression) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Progression not found', 404);
    }

    return {
      currentStreak: progression.currentStreak,
      longestStreak: progression.longestStreak,
      lastActivityDate: progression.lastActivityDate,
      isActiveToday: isToday(progression.lastActivityDate),
      streakBonus: progression.currentStreak * 5,
    };
  },
};
