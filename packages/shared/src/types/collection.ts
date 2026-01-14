/**
 * @file types/collection.ts
 * @description Collection/session-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

import type { LineString } from 'geojson';

export type CollectionMode = 'passive' | 'dashcam' | 'explore';
export type SessionStatus = 'active' | 'completed' | 'processing' | 'processed' | 'failed';

export interface CollectionSession {
  id: string;
  userId: string;
  mode: CollectionMode;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date | null;
  distanceMeters: number;
  durationSeconds: number;
  frameCount: number;
  qualityScore?: number | null;
  earnedCash: number;
  earnedCredits: number;
  earnedXp: number;
  routeGeometry?: LineString | null;
  coverageCells: string[];
  clientMetrics?: ClientMetrics | null;
  processingMetrics?: ProcessingMetrics | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientMetrics {
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  batteryStart?: number;
  batteryEnd?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  gpsAccuracy?: number;
}

export interface ProcessingMetrics {
  framesProcessed: number;
  entitiesDetected: number;
  processingTimeMs: number;
  mlModelVersion?: string;
}

export interface Frame {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  capturedAt: Date;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  h3Index: string;
  rawImageUrl: string;
  processedImageUrl?: string | null;
  thumbnailUrl?: string | null;
  qualityScore?: number | null;
  processingStatus: 'pending' | 'processing' | 'processed' | 'failed';
  createdAt: Date;
}

export interface SensorReading {
  id: string;
  sessionId: string;
  timestamp: Date;
  sensorType: 'accelerometer' | 'gyroscope' | 'magnetometer' | 'barometer';
  x?: number | null;
  y?: number | null;
  z?: number | null;
  value?: number | null;
}

export interface NetworkScan {
  id: string;
  sessionId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  networkType: 'wifi' | 'cellular';
  signalStrength?: number | null;
  ssid?: string | null;
  bssid?: string | null;
  frequency?: number | null;
  carrier?: string | null;
  cellId?: string | null;
}

export interface UploadChunk {
  id: string;
  sessionId: string;
  uploadId: string;
  chunkNumber: number;
  totalChunks: number;
  byteOffset: number;
  byteSize: number;
  checksum: string;
  status: 'pending' | 'uploaded' | 'verified' | 'failed';
  createdAt: Date;
}
