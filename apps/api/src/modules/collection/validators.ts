// apps/api/src/modules/collection/validators.ts
import { z } from 'zod';

// Collection modes
export const collectionModes = ['passive', 'dashcam', 'explore'] as const;

// Create session
export const createSessionSchema = z.object({
  mode: z.enum(collectionModes),
  deviceInfo: z.object({
    platform: z.enum(['ios', 'android']),
    osVersion: z.string(),
    appVersion: z.string(),
    deviceModel: z.string(),
    deviceId: z.string().optional(),
  }).optional(),
  startLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
  }).optional(),
});

// List sessions query
export const listSessionsSchema = z.object({
  status: z.enum(['active', 'completed', 'processing', 'processed', 'failed']).optional(),
  mode: z.enum(collectionModes).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['startedAt', 'endedAt', 'distanceMeters', 'earnedCash']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Update session
export const updateSessionSchema = z.object({
  deviceInfo: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// End session
export const endSessionSchema = z.object({
  endLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  clientMetrics: z.object({
    distanceMeters: z.number().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    frameCount: z.number().nonnegative().optional(),
    averageSpeed: z.number().nonnegative().optional(),
  }).optional(),
});

// Sensor data batch
export const sensorDataBatchSchema = z.object({
  startTime: z.number(), // Unix timestamp ms
  endTime: z.number(),
  readings: z.array(z.object({
    timestamp: z.number(),
    gps: z.object({
      latitude: z.number(),
      longitude: z.number(),
      altitude: z.number().optional(),
      accuracy: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
    }),
    imu: z.object({
      accel: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      gyro: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    }).optional(),
  })),
});

// Network scan batch
export const networkScanBatchSchema = z.object({
  scans: z.array(z.object({
    timestamp: z.number(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    connectionType: z.enum(['none', 'wifi', '2g', '3g', '4g', '5g']).optional(),
    cells: z.array(z.object({
      mcc: z.number(),
      mnc: z.number(),
      lac: z.number(),
      cid: z.number(),
      rsrp: z.number().optional(),
      rsrq: z.number().optional(),
      technology: z.string().optional(),
    })).optional(),
    waps: z.array(z.object({
      bssid: z.string(),
      ssid: z.string(),
      rssi: z.number(),
      frequency: z.number().optional(),
      security: z.string().optional(),
    })).optional(),
  })),
});

// Types
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type SensorDataBatch = z.infer<typeof sensorDataBatchSchema>;
export type NetworkScanBatch = z.infer<typeof networkScanBatchSchema>;
