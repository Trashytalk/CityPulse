/**
 * @file types/entity.ts
 * @description Entity-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

export type EntityType =
  | 'business'
  | 'signage'
  | 'infrastructure'
  | 'vehicle'
  | 'landmark'
  | 'other';

export type EntitySubtype = string; // e.g., 'restaurant', 'stop_sign', 'fire_hydrant'

export interface Entity {
  id: string;
  type: EntityType;
  subtype?: EntitySubtype | null;
  latitude: number;
  longitude: number;
  h3Index: string;
  confidence: number;
  attributes?: Record<string, unknown> | null;
  sourceFrameId?: string | null;
  sourceSessionId?: string | null;
  boundingBox?: number[] | null; // [x1, y1, x2, y2]
  ocrText?: string | null;
  verificationScore: number;
  verificationCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityWithSource extends Entity {
  sourceFrame?: {
    thumbnailUrl?: string;
    capturedAt: Date;
  };
}

export interface EntityCluster {
  centroid: {
    latitude: number;
    longitude: number;
  };
  count: number;
  types: Record<EntityType, number>;
}
