// apps/api/src/modules/users/routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { requireAuth, optionalAuth } from '../../middleware/auth';

import { usersService } from './service';
import * as v from './validators';

export const userRoutes = new Hono();

// GET /users/me - Get current user with full profile
userRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');
  const user = await usersService.getFullProfile(userId);
  return c.json({ success: true, ...user });
});

// PATCH /users/me - Update user profile
userRoutes.patch('/me',
  requireAuth,
  zValidator('json', v.updateProfileSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');
    const user = await usersService.updateProfile(userId, input);
    return c.json({ success: true, ...user });
  }
);

// GET /users/me/stats - Get detailed statistics
userRoutes.get('/me/stats', requireAuth, async (c) => {
  const userId = c.get('userId');
  const stats = await usersService.getDetailedStats(userId);
  return c.json({ success: true, ...stats });
});

// GET /users/me/referrals - Get referral info
userRoutes.get('/me/referrals', requireAuth, async (c) => {
  const userId = c.get('userId');
  const referrals = await usersService.getReferralInfo(userId);
  return c.json({ success: true, ...referrals });
});

// POST /users/me/referral-code - Apply referral code
userRoutes.post('/me/referral-code',
  requireAuth,
  zValidator('json', v.applyReferralSchema),
  async (c) => {
    const userId = c.get('userId');
    const { code } = c.req.valid('json');
    const result = await usersService.applyReferralCode(userId, code);
    return c.json(result);
  }
);

// GET /users/me/activity - Activity feed
userRoutes.get('/me/activity',
  requireAuth,
  zValidator('query', v.activityQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const activity = await usersService.getActivityFeed(userId, query);
    return c.json({ success: true, ...activity });
  }
);

// DELETE /users/me - Delete account
userRoutes.delete('/me',
  requireAuth,
  zValidator('json', v.deleteAccountSchema),
  async (c) => {
    const userId = c.get('userId');
    const { confirmation } = c.req.valid('json');
    
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return c.json({ success: false, error: 'Invalid confirmation' }, 400);
    }
    
    await usersService.deleteAccount(userId);
    return c.json({ success: true });
  }
);

// GET /users/:id/public - Public profile
userRoutes.get('/:id/public', optionalAuth, async (c) => {
  const targetUserId = c.req.param('id');
  const profile = await usersService.getPublicProfile(targetUserId);
  return c.json({ success: true, ...profile });
});
