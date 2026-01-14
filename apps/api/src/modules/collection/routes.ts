// apps/api/src/modules/collection/routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../../middleware/auth';
import { collectionService } from './service';
import * as v from './validators';

export const collectionRoutes = new Hono();

// ============================================================================
// POST /collection/sessions
// Start a new collection session
// ============================================================================
collectionRoutes.post('/sessions',
  requireAuth,
  zValidator('json', v.createSessionSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    const session = await collectionService.createSession(userId, input);

    return c.json(session, 201);
  }
);

// ============================================================================
// GET /collection/sessions
// List user's sessions
// ============================================================================
collectionRoutes.get('/sessions',
  requireAuth,
  zValidator('query', v.listSessionsSchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await collectionService.listSessions(userId, query);

    return c.json(result);
  }
);

// ============================================================================
// GET /collection/sessions/:id
// Get session details
// ============================================================================
collectionRoutes.get('/sessions/:id',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');

    const session = await collectionService.getSession(userId, sessionId);

    return c.json(session);
  }
);

// ============================================================================
// PATCH /collection/sessions/:id
// Update session (end session, add metadata)
// ============================================================================
collectionRoutes.patch('/sessions/:id',
  requireAuth,
  zValidator('json', v.updateSessionSchema),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    const input = c.req.valid('json');

    const session = await collectionService.updateSession(userId, sessionId, input);

    return c.json(session);
  }
);

// ============================================================================
// POST /collection/sessions/:id/end
// End a collection session
// ============================================================================
collectionRoutes.post('/sessions/:id/end',
  requireAuth,
  zValidator('json', v.endSessionSchema),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    const input = c.req.valid('json');

    const session = await collectionService.endSession(userId, sessionId, input);

    return c.json(session);
  }
);

// ============================================================================
// GET /collection/sessions/:id/status
// Get processing status
// ============================================================================
collectionRoutes.get('/sessions/:id/status',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');

    const status = await collectionService.getProcessingStatus(userId, sessionId);

    return c.json(status);
  }
);

// ============================================================================
// POST /collection/sessions/:id/sensor-data
// Upload sensor data batch (non-video data)
// ============================================================================
collectionRoutes.post('/sessions/:id/sensor-data',
  requireAuth,
  zValidator('json', v.sensorDataBatchSchema),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    const data = c.req.valid('json');

    await collectionService.storeSensorData(userId, sessionId, data);

    return c.json({ success: true });
  }
);

// ============================================================================
// POST /collection/sessions/:id/network-scans
// Upload network scan batch
// ============================================================================
collectionRoutes.post('/sessions/:id/network-scans',
  requireAuth,
  zValidator('json', v.networkScanBatchSchema),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    const data = c.req.valid('json');

    await collectionService.storeNetworkScans(userId, sessionId, data);

    return c.json({ success: true });
  }
);

// ============================================================================
// GET /collection/stats
// Get user's collection statistics
// ============================================================================
collectionRoutes.get('/stats',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');

    const stats = await collectionService.getUserStats(userId);

    return c.json(stats);
  }
);
