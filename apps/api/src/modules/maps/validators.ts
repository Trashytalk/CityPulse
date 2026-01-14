// apps/api/src/modules/maps/validators.ts
import { z } from 'zod';

export const coverageQuerySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  resolution: z.coerce.number().min(5).max(12).default(9),
});

export const coverageStatsQuerySchema = z.object({
  // Can be bounds or city/region name
  north: z.coerce.number().optional(),
  south: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  west: z.coerce.number().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});

export const entitiesQuerySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  types: z.string().optional(), // Comma-separated entity types
  minConfidence: z.coerce.number().min(0).max(1).default(0.7),
  limit: z.coerce.number().min(1).max(1000).default(500),
  cluster: z.coerce.boolean().default(true),
});

export const streetviewPointQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(10).max(500).default(50),
});

export const heatmapQuerySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  metric: z.enum(['coverage', 'quality', 'freshness', 'entities']).default('coverage'),
});

export const bountyMapQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1000).max(50000).default(10000), // meters
});

export type CoverageQuery = z.infer<typeof coverageQuerySchema>;
export type CoverageStatsQuery = z.infer<typeof coverageStatsQuerySchema>;
export type EntitiesQuery = z.infer<typeof entitiesQuerySchema>;
export type StreetviewPointQuery = z.infer<typeof streetviewPointQuerySchema>;
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
export type BountyMapQuery = z.infer<typeof bountyMapQuerySchema>;
