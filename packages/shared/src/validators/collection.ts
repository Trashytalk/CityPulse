/**
 * @file validators/collection.ts
 * @description Collection validation schemas
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

import { z } from 'zod';

export const collectionModeSchema = z.enum(['passive', 'dashcam', 'explore']);

export const createSessionSchema = z.object({
  mode: collectionModeSchema,
  deviceInfo: z
    .object({
      model: z.string().optional(),
      osVersion: z.string().optional(),
      appVersion: z.string().optional(),
    })
    .optional(),
});

export const endSessionSchema = z.object({
  clientMetrics: z
    .object({
      distanceMeters: z.number().min(0),
      durationSeconds: z.number().min(0),
      batteryEnd: z.number().min(0).max(100).optional(),
      averageSpeed: z.number().min(0).optional(),
      maxSpeed: z.number().min(0).optional(),
    })
    .optional(),
});

export const sensorReadingSchema = z.object({
  timestamp: z.string().datetime(),
  sensorType: z.enum(['accelerometer', 'gyroscope', 'magnetometer', 'barometer']),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  value: z.number().optional(),
});

export const uploadSensorDataSchema = z.object({
  readings: z.array(sensorReadingSchema).min(1).max(1000),
});

export const networkScanSchema = z.object({
  timestamp: z.string().datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  networkType: z.enum(['wifi', 'cellular']),
  signalStrength: z.number().optional(),
  ssid: z.string().optional(),
  bssid: z.string().optional(),
  frequency: z.number().optional(),
  carrier: z.string().optional(),
  cellId: z.string().optional(),
});

export const uploadNetworkScansSchema = z.object({
  scans: z.array(networkScanSchema).min(1).max(500),
});

export const boundingBoxSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .refine((data) => data.north > data.south, {
    message: 'North must be greater than south',
  })
  .refine(
    (data) => Math.abs(data.north - data.south) <= 1 && Math.abs(data.east - data.west) <= 1,
    { message: 'Bounding box too large (max 1 degree)' }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type UploadSensorDataInput = z.infer<typeof uploadSensorDataSchema>;
export type UploadNetworkScansInput = z.infer<typeof uploadNetworkScansSchema>;
export type BoundingBoxInput = z.infer<typeof boundingBoxSchema>;
