/**
 * @file schema/core.ts
 * @description Core database schema: Users & Auth
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Auth identifiers
    phone: varchar('phone', { length: 20 }).unique(),
    email: varchar('email', { length: 255 }).unique(),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // 'active' | 'suspended' | 'deleted'

    // Trust & verification
    phoneVerified: boolean('phone_verified').notNull().default(false),
    emailVerified: boolean('email_verified').notNull().default(false),
    trustScore: integer('trust_score').notNull().default(100),
    // 0-100, affects payout multipliers

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  },
  (table) => ({
    phoneIdx: uniqueIndex('users_phone_idx').on(table.phone),
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================================
// USER PROFILES
// ============================================================================

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Display
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),

    // Location preference
    primaryCity: varchar('primary_city', { length: 100 }),
    countryCode: varchar('country_code', { length: 2 }),
    timezone: varchar('timezone', { length: 50 }).default('Asia/Manila'),

    // Preferences
    preferredLanguage: varchar('preferred_language', { length: 5 }).default('en'),
    notificationsEnabled: boolean('notifications_enabled').default(true),
    marketingOptIn: boolean('marketing_opt_in').default(false),

    // Referral
    referralCode: varchar('referral_code', { length: 20 }).unique(),
    referredBy: uuid('referred_by').references(() => users.id),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId),
    referralCodeIdx: uniqueIndex('user_profiles_referral_code_idx').on(table.referralCode),
  })
);

export type UserProfile = typeof userProfiles.$inferSelect;

// ============================================================================
// AUTH SESSIONS
// ============================================================================

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Token
    refreshToken: text('refresh_token').notNull(),

    // Device info
    deviceId: varchar('device_id', { length: 100 }),
    deviceType: varchar('device_type', { length: 50 }),
    // 'ios' | 'android' | 'web'
    deviceName: varchar('device_name', { length: 100 }),
    appVersion: varchar('app_version', { length: 20 }),

    // Security
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('auth_sessions_user_id_idx').on(table.userId),
    refreshTokenIdx: index('auth_sessions_refresh_token_idx').on(table.refreshToken),
    expiresAtIdx: index('auth_sessions_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// OTP CODES
// ============================================================================

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    phone: varchar('phone', { length: 20 }).notNull(),
    code: varchar('code', { length: 6 }).notNull(),

    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    phoneCodeIdx: index('otp_codes_phone_code_idx').on(table.phone, table.code),
    expiresAtIdx: index('otp_codes_expires_at_idx').on(table.expiresAt),
  })
);
