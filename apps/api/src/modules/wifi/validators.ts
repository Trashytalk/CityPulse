// apps/api/src/modules/wifi/validators.ts
import { z } from 'zod';

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(5000).default(500), // meters
  hasPassword: z.coerce.boolean().optional(),
  venueType: z.enum(['cafe', 'restaurant', 'mall', 'hotel', 'public', 'other', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(20),
  sortBy: z.enum(['distance', 'freshness', 'rating']).default('distance'),
});

export const feedbackSchema = z.object({
  success: z.boolean(),
  comment: z.string().max(500).optional(),
});

export const contributeSchema = z.object({
  ssid: z.string().min(1).max(64),
  password: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  venueName: z.string().max(200).optional(),
  venueType: z.enum(['cafe', 'restaurant', 'mall', 'hotel', 'public', 'other']).optional(),
  notes: z.string().max(500).optional(),
});

export const contributionsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type ContributeInput = z.infer<typeof contributeSchema>;
export type ContributionsQuery = z.infer<typeof contributionsQuerySchema>;
