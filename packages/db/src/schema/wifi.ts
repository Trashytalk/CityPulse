/**
 * @file schema/wifi.ts
 * @description WiFi schema: Networks, Unlocks, Contributions
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
  index,
} from 'drizzle-orm/pg-core';

import { users } from './core';

// ============================================================================
// WIFI NETWORKS
// ============================================================================

export const wifiNetworks = pgTable(
  'wifi_networks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Network identity
    bssid: varchar('bssid', { length: 20 }).notNull(), // Hashed in production
    ssid: varchar('ssid', { length: 100 }).notNull(),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    h3Index: varchar('h3_index', { length: 20 }).notNull(),

    // Venue info
    venueName: varchar('venue_name', { length: 200 }),
    venueType: varchar('venue_type', { length: 50 }),
    // 'cafe' | 'restaurant' | 'mall' | 'hotel' | 'public' | 'other'
    address: text('address'),

    // Network details
    security: varchar('security', { length: 20 }),
    // 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3'

    // Password (encrypted)
    hasPassword: boolean('has_password').notNull().default(false),
    encryptedPassword: text('encrypted_password'),

    // Quality metrics
    freshnessScore: real('freshness_score').notNull().default(0), // 0-1
    verificationScore: real('verification_score').notNull().default(0), // 0-1
    reportCount: integer('report_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failCount: integer('fail_count').notNull().default(0),

    // Cost to unlock
    unlockCost: integer('unlock_cost').notNull().default(50), // Credits

    // Contributor
    contributedBy: uuid('contributed_by').references(() => users.id),

    // Lifecycle
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bssidIdx: index('wifi_networks_bssid_idx').on(table.bssid),
    h3IndexIdx: index('wifi_networks_h3_index_idx').on(table.h3Index),
    freshnessIdx: index('wifi_networks_freshness_idx').on(table.freshnessScore),
  })
);

// ============================================================================
// WIFI UNLOCKS
// ============================================================================

export const wifiUnlocks = pgTable(
  'wifi_unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    networkId: uuid('network_id')
      .notNull()
      .references(() => wifiNetworks.id),

    // Cost at time of unlock
    creditsCost: integer('credits_cost').notNull(),

    // Feedback
    feedbackGiven: boolean('feedback_given').notNull().default(false),
    feedbackSuccess: boolean('feedback_success'),
    feedbackAt: timestamp('feedback_at', { withTimezone: true }),

    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('wifi_unlocks_user_id_idx').on(table.userId),
    networkIdIdx: index('wifi_unlocks_network_id_idx').on(table.networkId),
  })
);

// ============================================================================
// WIFI CONTRIBUTIONS
// ============================================================================

export const wifiContributions = pgTable(
  'wifi_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    networkId: uuid('network_id').references(() => wifiNetworks.id),

    // Submission data
    ssid: varchar('ssid', { length: 100 }).notNull(),
    password: text('password').notNull(), // Encrypted
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),

    // Venue info (user provided)
    venueName: varchar('venue_name', { length: 200 }),
    venueType: varchar('venue_type', { length: 50 }),

    // Review status
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending' | 'approved' | 'rejected' | 'duplicate'

    // Rewards (if approved)
    rewardCredits: integer('reward_credits'),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('wifi_contributions_user_id_idx').on(table.userId),
    statusIdx: index('wifi_contributions_status_idx').on(table.status),
  })
);
