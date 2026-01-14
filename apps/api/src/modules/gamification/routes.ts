// apps/api/src/modules/gamification/routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { requireAuth } from '../../middleware/auth';

import { gamificationService } from './service';
import * as v from './validators';

export const gamificationRoutes = new Hono();

// ============================================================================
// GET /gamification/progression
// Get user's XP, level, streak info
// ============================================================================
gamificationRoutes.get('/progression', requireAuth, async (c) => {
  const userId = c.get('userId');
  const progression = await gamificationService.getProgression(userId);
  return c.json(progression);
});

// ============================================================================
// GET /gamification/achievements
// Get all achievements with user progress
// ============================================================================
gamificationRoutes.get('/achievements', requireAuth, async (c) => {
  const userId = c.get('userId');
  const achievements = await gamificationService.getAchievements(userId);
  return c.json(achievements);
});

// ============================================================================
// GET /gamification/achievements/:id
// Get single achievement detail
// ============================================================================
gamificationRoutes.get('/achievements/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const achievementId = c.req.param('id');
  const achievement = await gamificationService.getAchievementDetail(userId, achievementId);
  return c.json(achievement);
});

// ============================================================================
// POST /gamification/achievements/:id/claim
// Claim achievement reward
// ============================================================================
gamificationRoutes.post('/achievements/:id/claim', requireAuth, async (c) => {
  const userId = c.get('userId');
  const achievementId = c.req.param('id');
  const result = await gamificationService.claimAchievement(userId, achievementId);
  return c.json(result);
});

// ============================================================================
// GET /gamification/challenges
// Get active challenges
// ============================================================================
gamificationRoutes.get('/challenges',
  requireAuth,
  zValidator('query', v.challengesQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const challenges = await gamificationService.getChallenges(userId, query);
    return c.json(challenges);
  }
);

// ============================================================================
// POST /gamification/challenges/:id/join
// Join a challenge
// ============================================================================
gamificationRoutes.post('/challenges/:id/join', requireAuth, async (c) => {
  const userId = c.get('userId');
  const challengeId = c.req.param('id');
  const result = await gamificationService.joinChallenge(userId, challengeId);
  return c.json(result);
});

// ============================================================================
// POST /gamification/challenges/:id/claim
// Claim challenge reward
// ============================================================================
gamificationRoutes.post('/challenges/:id/claim', requireAuth, async (c) => {
  const userId = c.get('userId');
  const challengeId = c.req.param('id');
  const result = await gamificationService.claimChallengeReward(userId, challengeId);
  return c.json(result);
});

// ============================================================================
// GET /gamification/leaderboard
// Get leaderboard
// ============================================================================
gamificationRoutes.get('/leaderboard',
  requireAuth,
  zValidator('query', v.leaderboardQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const leaderboard = await gamificationService.getLeaderboard(userId, query);
    return c.json(leaderboard);
  }
);

// ============================================================================
// GET /gamification/streaks
// Get streak information
// ============================================================================
gamificationRoutes.get('/streaks', requireAuth, async (c) => {
  const userId = c.get('userId');
  const streaks = await gamificationService.getStreakInfo(userId);
  return c.json(streaks);
});
