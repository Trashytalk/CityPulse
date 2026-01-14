// apps/api/src/modules/users/repository.ts
import { db } from '@citypulse/db';
import { users, userProfiles, userProgression, wallets } from '@citypulse/db/schema';
import { eq, sql } from 'drizzle-orm';

export const usersRepository = {
  async getUserWithRelations(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        profile: true,
        progression: true,
        wallet: true,
      },
    });
  },

  async findById(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  },

  async findByPhone(phone: string) {
    return db.query.users.findFirst({
      where: eq(users.phone, phone),
    });
  },

  async createUser(data: { phone: string; email?: string }) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async updateUser(userId: string, data: Partial<typeof users.$inferInsert>) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  },

  async createProfile(data: { userId: string; referralCode: string }) {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  },

  async getProfile(userId: string) {
    return db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
  },

  async updateProfile(userId: string, data: Partial<typeof userProfiles.$inferInsert>) {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  },

  async findByReferralCode(code: string) {
    return db.query.userProfiles.findFirst({
      where: eq(userProfiles.referralCode, code),
    });
  },

  async setReferrer(userId: string, referrerId: string) {
    await db
      .update(userProfiles)
      .set({ referredBy: referrerId })
      .where(eq(userProfiles.userId, userId));
  },

  async getReferrals(userId: string) {
    return db.query.userProfiles.findMany({
      where: eq(userProfiles.referredBy, userId),
      with: {
        user: {
          columns: { createdAt: true, lastActiveAt: true },
        },
      },
    });
  },

  async getReferralEarnings(userId: string) {
    const result = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM transactions
      WHERE user_id = ${userId}
        AND type IN ('referral_bonus', 'referrer_bonus')
    `);
    return (result.rows?.[0] as { total: number; pending: number }) || { total: 0, pending: 0 };
  },

  async getProgressionStats(userId: string) {
    const progression = await db.query.userProgression.findFirst({
      where: eq(userProgression.userId, userId),
    });
    
    const achievementCount = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE unlocked_at IS NOT NULL) as unlocked,
        COUNT(*) as total
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ${userId}
    `);
    
    const row = achievementCount.rows?.[0] as { unlocked: number; total: number } | undefined;
    
    return {
      level: progression?.level || 1,
      totalXp: progression?.totalXp || 0,
      currentStreak: progression?.currentStreak || 0,
      longestStreak: progression?.longestStreak || 0,
      achievementsUnlocked: Number(row?.unlocked || 0),
      totalAchievements: Number(row?.total || 0),
    };
  },

  async getCoverageStats(userId: string) {
    const result = await db.execute(sql`
      WITH user_cells AS (
        SELECT DISTINCT h3_index
        FROM frames f
        JOIN collection_sessions cs ON f.session_id = cs.id
        WHERE cs.user_id = ${userId}
      )
      SELECT 
        COUNT(DISTINCT h3_index) as unique_cells,
        COUNT(DISTINCT substring(h3_index, 1, 10)) as unique_barangays,
        COUNT(DISTINCT substring(h3_index, 1, 8)) as unique_cities
      FROM user_cells
    `);
    
    const row = result.rows?.[0] as { unique_cells: number; unique_barangays: number; unique_cities: number } | undefined;
    
    return {
      uniqueCells: Number(row?.unique_cells || 0),
      uniqueBarangays: Number(row?.unique_barangays || 0),
      uniqueCities: Number(row?.unique_cities || 0),
      topCity: 'Manila',
      rank: 0,
    };
  },

  async getActivityFeed(userId: string, query: { limit: number; offset: number; type: string }) {
    const result = await db.execute(sql`
      SELECT * FROM (
        SELECT 
          id,
          'session_complete' as type,
          'Session Completed' as title,
          CONCAT('Earned ₱', earned_cash / 100.0, ' and ', earned_credits, ' PC') as description,
          jsonb_build_object('distance', distance_meters, 'mode', mode) as metadata,
          completed_at as created_at
        FROM collection_sessions
        WHERE user_id = ${userId} AND status = 'processed'
        
        UNION ALL
        
        SELECT
          ua.id,
          'achievement_unlocked' as type,
          a.name as title,
          a.description,
          jsonb_build_object('xp', a.reward_xp, 'credits', a.reward_credits) as metadata,
          ua.unlocked_at as created_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ${userId} AND ua.unlocked_at IS NOT NULL
        
        UNION ALL
        
        SELECT
          id,
          'withdrawal' as type,
          'Withdrawal Processed' as title,
          CONCAT('₱', amount / 100.0, ' sent to your account') as description,
          jsonb_build_object('status', status) as metadata,
          completed_at as created_at
        FROM withdrawals
        WHERE user_id = ${userId} AND status = 'completed'
      ) activities
      WHERE type = ${query.type} OR ${query.type} = 'all'
      ORDER BY created_at DESC
      LIMIT ${query.limit}
      OFFSET ${query.offset}
    `);
    
    return result.rows || [];
  },

  async softDeleteUser(userId: string) {
    await db.update(users).set({
      status: 'deleted',
      phone: null,
      email: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    
    await db.update(userProfiles).set({
      displayName: 'Deleted User',
      avatarUrl: null,
      bio: null,
      referralCode: null,
    }).where(eq(userProfiles.userId, userId));
  },
};
