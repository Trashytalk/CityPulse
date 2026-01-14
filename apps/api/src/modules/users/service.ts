// apps/api/src/modules/users/service.ts
import { usersRepository } from './repository';
import { AppError, ERROR_CODES } from '../../lib/errors';
import type { UpdateProfileInput, ActivityQuery } from './validators';

export const usersService = {
  // ==========================================================================
  // FIND BY ID
  // ==========================================================================
  async findById(userId: string) {
    return usersRepository.findById(userId);
  },

  // ==========================================================================
  // GET FULL PROFILE
  // ==========================================================================
  async getFullProfile(userId: string) {
    const user = await usersRepository.getUserWithRelations(userId);
    
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }
    
    return {
      id: user.id,
      phone: maskPhone(user.phone),
      email: user.email,
      status: user.status,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      
      profile: {
        displayName: user.profile?.displayName,
        avatarUrl: user.profile?.avatarUrl,
        bio: user.profile?.bio,
        primaryCity: user.profile?.primaryCity,
        countryCode: user.profile?.countryCode,
        timezone: user.profile?.timezone,
        preferredLanguage: user.profile?.preferredLanguage,
        referralCode: user.profile?.referralCode,
      },
      
      progression: {
        level: user.progression?.level || 1,
        totalXp: user.progression?.totalXp || 0,
        title: user.progression?.title || 'Newcomer',
        currentStreak: user.progression?.currentStreak || 0,
        longestStreak: user.progression?.longestStreak || 0,
      },
      
      wallet: {
        cashBalance: user.wallet?.cashBalance || 0,
        creditBalance: user.wallet?.creditBalance || 0,
      },
    };
  },

  // ==========================================================================
  // GET PUBLIC PROFILE
  // ==========================================================================
  async getPublicProfile(userId: string) {
    const user = await usersRepository.getUserWithRelations(userId);
    
    if (!user || user.status !== 'active') {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }
    
    return {
      id: user.id,
      profile: {
        displayName: user.profile?.displayName || 'Anonymous',
        avatarUrl: user.profile?.avatarUrl,
        primaryCity: user.profile?.primaryCity,
      },
      progression: {
        level: user.progression?.level || 1,
        title: user.progression?.title || 'Newcomer',
      },
    };
  },

  // ==========================================================================
  // FIND BY PHONE
  // ==========================================================================
  async findByPhone(phone: string) {
    return usersRepository.findByPhone(phone);
  },

  // ==========================================================================
  // CREATE USER
  // ==========================================================================
  async create(data: { phone: string; email?: string }) {
    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();
    
    const user = await usersRepository.createUser({
      phone: data.phone,
      email: data.email,
    });
    
    // Create profile with referral code
    await usersRepository.createProfile({
      userId: user.id,
      referralCode,
    });
    
    return user;
  },

  // ==========================================================================
  // UPDATE PROFILE
  // ==========================================================================
  async updateProfile(userId: string, input: UpdateProfileInput) {
    await usersRepository.updateProfile(userId, input);
    return this.getFullProfile(userId);
  },

  // ==========================================================================
  // GET DETAILED STATS
  // ==========================================================================
  async getDetailedStats(userId: string) {
    const [progressionStats, coverageStats] = await Promise.all([
      usersRepository.getProgressionStats(userId),
      usersRepository.getCoverageStats(userId),
    ]);
    
    return {
      progression: {
        level: progressionStats.level,
        totalXp: progressionStats.totalXp,
        xpToNextLevel: calculateXpToNextLevel(progressionStats.level, progressionStats.totalXp),
        achievementsUnlocked: progressionStats.achievementsUnlocked,
        totalAchievements: progressionStats.totalAchievements,
        currentStreak: progressionStats.currentStreak,
        longestStreak: progressionStats.longestStreak,
      },
      coverage: {
        uniqueCellsVisited: coverageStats.uniqueCells,
        uniqueBarangays: coverageStats.uniqueBarangays,
        uniqueCities: coverageStats.uniqueCities,
        topCity: coverageStats.topCity,
        coverageRank: coverageStats.rank,
      },
    };
  },

  // ==========================================================================
  // REFERRAL SYSTEM
  // ==========================================================================
  async getReferralInfo(userId: string) {
    const profile = await usersRepository.getProfile(userId);
    const referrals = await usersRepository.getReferrals(userId);
    const earnings = await usersRepository.getReferralEarnings(userId);
    
    return {
      referralCode: profile?.referralCode,
      referralLink: `https://citypulse.app/r/${profile?.referralCode}`,
      
      stats: {
        totalReferrals: referrals.length,
        activeReferrals: referrals.filter((r) => (r.user as any)?.lastActiveAt).length,
        totalEarned: earnings.total,
        pendingBonus: earnings.pending,
      },
      
      rewards: {
        perReferral: 100,
        bonusOnFirstCollection: 50,
      },
      
      referrals: referrals.map((r) => ({
        id: r.userId,
        displayName: r.displayName || 'Anonymous',
        joinedAt: (r.user as any)?.createdAt,
        isActive: !!(r.user as any)?.lastActiveAt,
        earnedBonus: 0,
      })),
    };
  },

  async applyReferralCode(userId: string, code: string) {
    // Check if user already has a referrer
    const profile = await usersRepository.getProfile(userId);
    if (profile?.referredBy) {
      throw new AppError(ERROR_CODES.REFERRAL_USED, 'You have already used a referral code', 400);
    }
    
    // Find referrer by code
    const referrer = await usersRepository.findByReferralCode(code);
    if (!referrer) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid referral code', 400);
    }
    
    // Can't refer yourself
    if (referrer.userId === userId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'You cannot use your own referral code', 400);
    }
    
    // Apply referral
    await usersRepository.setReferrer(userId, referrer.userId);
    
    return {
      success: true,
      creditsAwarded: 100,
      message: 'Referral code applied! You received 100 credits.',
    };
  },

  // ==========================================================================
  // ACTIVITY FEED
  // ==========================================================================
  async getActivityFeed(userId: string, query: ActivityQuery) {
    const activities = await usersRepository.getActivityFeed(userId, query);
    
    return {
      activities: activities.map(formatActivity),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: activities.length === query.limit,
      },
    };
  },

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  async markPhoneVerified(userId: string) {
    await usersRepository.updateUser(userId, { phoneVerified: true });
  },

  async updateLastActive(userId: string) {
    await usersRepository.updateUser(userId, { lastActiveAt: new Date() });
  },

  async deleteAccount(userId: string) {
    await usersRepository.softDeleteUser(userId);
  },
};

// Helper functions
function maskPhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/(\+\d{2})\d{6}(\d{4})/, '$1******$2');
}

function calculateXpToNextLevel(level: number, currentXp: number): number {
  const nextLevelXp = Math.floor(100 * Math.pow(1.5, level - 1));
  const currentLevelXp = level > 1 ? Math.floor(100 * Math.pow(1.5, level - 2)) : 0;
  return nextLevelXp - (currentXp - currentLevelXp);
}

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  let exists = true;
  
  while (exists) {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    exists = !!(await usersRepository.findByReferralCode(code));
  }
  
  return code!;
}

function formatActivity(activity: any) {
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    metadata: activity.metadata,
    createdAt: activity.created_at,
  };
}
