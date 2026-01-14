// apps/api/src/modules/gamification/validators.ts
import { z } from 'zod';

export const challengesQuerySchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'special', 'all']).default('all'),
  status: z.enum(['available', 'joined', 'completed', 'all']).default('all'),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'country', 'city', 'friends']).default('global'),
  period: z.enum(['daily', 'weekly', 'monthly', 'allTime']).default('weekly'),
  metric: z.enum(['xp', 'distance', 'sessions', 'entities']).default('xp'),
  limit: z.coerce.number().min(10).max(100).default(50),
});

export type ChallengesQuery = z.infer<typeof challengesQuerySchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
