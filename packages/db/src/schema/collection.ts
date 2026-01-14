/**
 * @file schema/collection.ts
 * @description Collection schema: Sessions & Data
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
  real,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users } from './core';

// ============================================================================
// COLLECTION SESSIONS
// ============================================================================

export const collectionSessions = pgTable(
  'collection_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    // Session type
    mode: varchar('mode', { length: 20 }).notNull(),
    // 'passive' | 'dashcam' | 'explore'

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // 'active' | 'completed' | 'processing' | 'processed' | 'failed'

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),

    // Metrics (calculated after processing)
    distanceMeters: real('distance_meters'),
    durationSeconds: integer('duration_seconds'),
    frameCount: integer('frame_count'),
    qualityScore: integer('quality_score'), // 0-100

    // Earnings (calculated after processing)
    earnedCash: integer('earned_cash'), // In cents
    earnedCredits: integer('earned_credits'),

    // Storage references
    rawDataPath: text('raw_data_path'),
    processedDataPath: text('processed_data_path'),

    // Processing metadata
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    processingCompletedAt: timestamp('processing_completed_at', { withTimezone: true }),
    processingError: text('processing_error'),

    // Device info at time of collection
    deviceInfo: jsonb('device_info'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('collection_sessions_user_id_idx').on(table.userId),
    statusIdx: index('collection_sessions_status_idx').on(table.status),
    startedAtIdx: index('collection_sessions_started_at_idx').on(table.startedAt),
  })
);

export type CollectionSession = typeof collectionSessions.$inferSelect;

// ============================================================================
// FRAMES (extracted from video)
// ============================================================================

export const frames = pgTable(
  'frames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => collectionSessions.id, { onDelete: 'cascade' }),

    // Sequence
    sequenceNumber: integer('sequence_number').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),

    // Location (stored as separate columns for compatibility)
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    altitude: real('altitude'),
    heading: real('heading'), // Compass direction 0-360

    // Quality metrics
    qualityScore: integer('quality_score'), // 0-100
    blurScore: real('blur_score'),
    exposureScore: real('exposure_score'),

    // Storage
    originalPath: text('original_path'),
    processedPath: text('processed_path'),
    thumbnailPath: text('thumbnail_path'),

    // Processing status
    processed: boolean('processed').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('frames_session_id_idx').on(table.sessionId),
    capturedAtIdx: index('frames_captured_at_idx').on(table.capturedAt),
  })
);

// ============================================================================
// ENTITIES (objects detected in frames)
// ============================================================================

export const entityTypes = [
  'sign_street',
  'sign_traffic',
  'sign_business',
  'camera_dome',
  'camera_bullet',
  'camera_ptz',
  'camera_traffic',
  'infrastructure_power',
  'infrastructure_telecom',
  'infrastructure_light',
  'road_pothole',
  'road_speedbump',
  'building_commercial',
  'building_residential',
] as const;

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Source
    sourceFrameId: uuid('source_frame_id').references(() => frames.id),
    sourceSessionId: uuid('source_session_id').references(() => collectionSessions.id),

    // Classification
    type: varchar('type', { length: 50 }).notNull(),
    subtype: varchar('subtype', { length: 50 }),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    h3Index: varchar('h3_index', { length: 20 }).notNull(), // H3 resolution 9

    // ML confidence
    confidence: real('confidence').notNull(),

    // Extracted data (varies by type)
    attributes: jsonb('attributes'),

    // Verification
    verificationCount: integer('verification_count').notNull().default(0),
    verificationScore: real('verification_score').default(0),

    // Lifecycle
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('entities_type_idx').on(table.type),
    h3IndexIdx: index('entities_h3_index_idx').on(table.h3Index),
    confidenceIdx: index('entities_confidence_idx').on(table.confidence),
  })
);

export type Entity = typeof entities.$inferSelect;

// ============================================================================
// NETWORK SCANS (cellular + WiFi)
// ============================================================================

export const networkScans = pgTable(
  'network_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => collectionSessions.id, { onDelete: 'cascade' }),

    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    h3Index: varchar('h3_index', { length: 20 }).notNull(),

    // Connection type at time of scan
    connectionType: varchar('connection_type', { length: 20 }),
    // 'none' | 'wifi' | '2g' | '3g' | '4g' | '5g'

    // Cellular readings (array of visible towers)
    cellReadings: jsonb('cell_readings'),
    // [{ mcc, mnc, lac, cid, rsrp, rsrq, technology }]

    // WiFi readings (array of visible APs)
    wifiReadings: jsonb('wifi_readings'),
    // [{ bssid, ssid, rssi, frequency, security }]

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('network_scans_session_id_idx').on(table.sessionId),
    h3IndexIdx: index('network_scans_h3_index_idx').on(table.h3Index),
    scannedAtIdx: index('network_scans_scanned_at_idx').on(table.scannedAt),
  })
);
