// apps/api/src/modules/wifi/routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../../middleware/auth';
import { wifiService } from './service';
import * as v from './validators';

export const wifiRoutes = new Hono();

// ============================================================================
// GET /wifi/nearby
// Find WiFi networks near a location
// ============================================================================
wifiRoutes.get('/nearby',
  requireAuth,
  zValidator('query', v.nearbyQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const networks = await wifiService.findNearby(userId, query);

    return c.json(networks);
  }
);

// ============================================================================
// GET /wifi/contributions/mine
// Get user's contribution history
// ============================================================================
wifiRoutes.get('/contributions/mine',
  requireAuth,
  zValidator('query', v.contributionsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const contributions = await wifiService.getUserContributions(userId, query);

    return c.json(contributions);
  }
);

// ============================================================================
// GET /wifi/unlocks/mine
// Get user's unlock history
// ============================================================================
wifiRoutes.get('/unlocks/mine',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');

    const unlocks = await wifiService.getUserUnlocks(userId);

    return c.json(unlocks);
  }
);

// ============================================================================
// GET /wifi/:id
// Get network details
// ============================================================================
wifiRoutes.get('/:id',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    const networkId = c.req.param('id');

    const network = await wifiService.getNetworkDetail(userId, networkId);

    return c.json(network);
  }
);

// ============================================================================
// POST /wifi/:id/unlock
// Unlock password (spend credits)
// ============================================================================
wifiRoutes.post('/:id/unlock',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    const networkId = c.req.param('id');

    const result = await wifiService.unlockPassword(userId, networkId);

    return c.json(result);
  }
);

// ============================================================================
// POST /wifi/:id/feedback
// Report whether password worked
// ============================================================================
wifiRoutes.post('/:id/feedback',
  requireAuth,
  zValidator('json', v.feedbackSchema),
  async (c) => {
    const userId = c.get('userId');
    const networkId = c.req.param('id');
    const { success, comment } = c.req.valid('json');

    const result = await wifiService.submitFeedback(userId, networkId, success, comment);

    return c.json(result);
  }
);

// ============================================================================
// POST /wifi/contribute
// Contribute a new WiFi password
// ============================================================================
wifiRoutes.post('/contribute',
  requireAuth,
  zValidator('json', v.contributeSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    const result = await wifiService.contribute(userId, input);

    return c.json(result);
  }
);
