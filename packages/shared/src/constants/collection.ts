/**
 * @file constants/collection.ts
 * @description Collection constants
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

// H3 resolution for coverage tracking
export const H3_RESOLUTION = 9; // ~174m edge length

// Session limits
export const SESSION_LIMITS = {
  MAX_DURATION_HOURS: 8,
  MAX_DISTANCE_KM: 200,
  MIN_DISTANCE_METERS: 100, // Minimum to earn rewards
  MIN_DURATION_SECONDS: 60, // Minimum to earn rewards
  MAX_IDLE_MINUTES: 10, // Auto-pause after 10 min no movement
} as const;

// Upload limits
export const UPLOAD_LIMITS = {
  MAX_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TOTAL_SIZE: 500 * 1024 * 1024, // 500MB per session
  MAX_SENSOR_READINGS_PER_REQUEST: 1000,
  MAX_NETWORK_SCANS_PER_REQUEST: 500,
  UPLOAD_EXPIRY_MINUTES: 60,
} as const;

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  AVERAGE: 50,
  POOR: 30,
} as const;

// Coverage status
export const COVERAGE_STATUS = {
  NONE: 0,
  PARTIAL: 50,
  FULL: 80,
} as const;

// Freshness categories (in days)
export const FRESHNESS = {
  FRESH: 7,
  RECENT: 30,
  STALE: 90,
  OUTDATED: Infinity,
} as const;

// Processing status
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;
