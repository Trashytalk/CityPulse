/**
 * @file schema/gamification.ts
 * @description Gamification schema: XP, Achievements, Challenges
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { users } from './core';

// ============================================================================
// USER PROGRESSION
// ============================================================================

export const userProgression = pgTable(
  'user_progression',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Experience
    totalXp: integer('total_xp').notNull().default(0),
    level: integer('level').notNull().default(1),

    // Title (based on level thresholds)
    title: varchar('title', { length: 50 }).default('Newcomer'),

    // Streak tracking
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastActivityDate: timestamp('last_activity_date', { withTimezone: true }),

    // Lifetime stats
    totalDistanceKm: real('total_distance_km').notNull().default(0),
    totalSessions: integer('total_sessions').notNull().default(0),
    totalFrames: integer('total_frames').notNull().default(0),
    totalEntities: integer('total_entities').notNull().default(0),

    // Area coverage
    uniqueH3Cells: integer('unique_h3_cells').notNull().default(0),
    uniqueBarangays: integer('unique_barangays').notNull().default(0),
    uniqueCities: integer('unique_cities').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_progression_user_id_idx').on(table.userId),
    levelIdx: index('user_progression_level_idx').on(table.level),
    totalXpIdx: index('user_progression_total_xp_idx').on(table.totalXp),
  })
);

// ============================================================================
// ACHIEVEMENTS (definitions)
// ============================================================================

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),

  // Category
  category: varchar('category', { length: 50 }).notNull(),
  // 'distance' | 'sessions' | 'coverage' | 'quality' | 'social' | 'special'

  // Requirements
  requirement: jsonb('requirement').notNull(),
  // { type: 'distance', value: 100 } or { type: 'streak', value: 7 }

  // Rewards
  rewardXp: integer('reward_xp').notNull().default(0),
  rewardCredits: integer('reward_credits').notNull().default(0),

  // Display
  iconUrl: text('icon_url'),
  badgeColor: varchar('badge_color', { length: 7 }),

  // Metadata
  difficulty: varchar('difficulty', { length: 20 }).default('normal'),
  // 'easy' | 'normal' | 'hard' | 'epic' | 'legendary'
  isHidden: boolean('is_hidden').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// USER ACHIEVEMENTS (unlocked)
// ============================================================================

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id),

    // Progress (for progressive achievements)
    progress: real('progress').notNull().default(0), // 0.0 to 1.0

    // Completion
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }),

    // Claim status (for rewards)
    claimed: boolean('claimed').notNull().default(false),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userAchievementIdx: uniqueIndex('user_achievements_user_achievement_idx').on(
      table.userId,
      table.achievementId
    ),
    unlockedAtIdx: index('user_achievements_unlocked_at_idx').on(table.unlockedAt),
  })
);

// ============================================================================
// CHALLENGES (time-limited)
// ============================================================================

export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull(),

    // Type
    type: varchar('type', { length: 20 }).notNull(),
    // 'daily' | 'weekly' | 'monthly' | 'special'

    // Goal
    goal: jsonb('goal').notNull(),
    // { metric: 'distance', target: 10 }

    // Rewards
    rewardXp: integer('reward_xp').notNull().default(0),
    rewardCredits: integer('reward_credits').notNull().default(0),
    rewardCash: integer('reward_cash').default(0), // cents

    // Duration
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

    // Scope
    scope: varchar('scope', { length: 20 }).default('global'),
    // 'global' | 'city' | 'team'
    scopeId: varchar('scope_id', { length: 100 }), // city name or team id

    // Limits
    maxParticipants: integer('max_participants'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('challenges_type_idx').on(table.type),
    startsAtIdx: index('challenges_starts_at_idx').on(table.startsAt),
    isActiveIdx: index('challenges_is_active_idx').on(table.isActive),
  })
);

// ============================================================================
// USER CHALLENGES (participation)
// ============================================================================

export const userChallenges = pgTable(
  'user_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id),

    // Progress
    progress: real('progress').notNull().default(0),
    currentValue: real('current_value').notNull().default(0),

    // Completion
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Rewards claimed
    claimed: boolean('claimed').notNull().default(false),

    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userChallengeIdx: uniqueIndex('user_challenges_user_challenge_idx').on(
      table.userId,
      table.challengeId
    ),
  })
);
