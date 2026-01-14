// apps/api/src/modules/users/validators.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  primaryCity: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  preferredLanguage: z.enum(['en', 'tl', 'id', 'vi', 'th']).optional(),
  notificationsEnabled: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const applyReferralSchema = z.object({
  code: z.string().length(8).toUpperCase(),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['all', 'earnings', 'achievements', 'challenges']).default('all'),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
