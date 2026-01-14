// apps/api/src/modules/maps/routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { requireAuth, optionalAuth } from '../../middleware/auth';

import { mapsService } from './service';
import * as v from './validators';

export const mapsRoutes = new Hono();

// ============================================================================
// GET /maps/coverage
// Get coverage cells for a bounding box
// ============================================================================
mapsRoutes.get('/coverage',
  optionalAuth,
  zValidator('query', v.coverageQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const coverage = await mapsService.getCoverage(query);
    return c.json(coverage);
  }
);

// ============================================================================
// GET /maps/coverage/stats
// Get coverage statistics for an area
// ============================================================================
mapsRoutes.get('/coverage/stats',
  optionalAuth,
  zValidator('query', v.coverageStatsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const stats = await mapsService.getCoverageStats(query);
    return c.json(stats);
  }
);

// ============================================================================
// GET /maps/tiles/:z/:x/:y
// Get vector tile (MVT format)
// ============================================================================
mapsRoutes.get('/tiles/:z/:x/:y',
  async (c) => {
    const z = parseInt(c.req.param('z'));
    const x = parseInt(c.req.param('x'));
    const y = parseInt(c.req.param('y'));

    const tile = await mapsService.getVectorTile(z, x, y);

    return new Response(tile, {
      headers: {
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
);

// ============================================================================
// GET /maps/entities
// Get entities within bounding box
// ============================================================================
mapsRoutes.get('/entities',
  optionalAuth,
  zValidator('query', v.entitiesQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const entities = await mapsService.getEntities(query);
    return c.json(entities);
  }
);

// ============================================================================
// GET /maps/entities/:id
// Get entity detail
// ============================================================================
mapsRoutes.get('/entities/:id',
  optionalAuth,
  async (c) => {
    const entityId = c.req.param('id');
    const entity = await mapsService.getEntityDetail(entityId);
    return c.json(entity);
  }
);

// ============================================================================
// GET /maps/streetview/point
// Get nearest street view point to coordinates
// ============================================================================
mapsRoutes.get('/streetview/point',
  optionalAuth,
  zValidator('query', v.streetviewPointQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const point = await mapsService.getNearestStreetviewPoint(query);
    return c.json(point);
  }
);

// ============================================================================
// GET /maps/streetview/:frameId
// Get street view image
// ============================================================================
mapsRoutes.get('/streetview/:frameId',
  optionalAuth,
  async (c) => {
    const frameId = c.req.param('frameId');
    const size = c.req.query('size') || 'medium';

    const imageUrl = await mapsService.getStreetviewImage(frameId, size as any);

    // Redirect to signed URL
    return c.redirect(imageUrl);
  }
);

// ============================================================================
// GET /maps/streetview/:frameId/sequence
// Get sequence of frames around a point
// ============================================================================
mapsRoutes.get('/streetview/:frameId/sequence',
  optionalAuth,
  async (c) => {
    const frameId = c.req.param('frameId');
    const sequence = await mapsService.getStreetviewSequence(frameId);
    return c.json(sequence);
  }
);

// ============================================================================
// GET /maps/heatmap
// Get data for heatmap visualization
// ============================================================================
mapsRoutes.get('/heatmap',
  optionalAuth,
  zValidator('query', v.heatmapQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const heatmap = await mapsService.getHeatmapData(query);
    return c.json(heatmap);
  }
);

// ============================================================================
// GET /maps/bounties
// Get bounty locations on map
// ============================================================================
mapsRoutes.get('/bounties',
  requireAuth,
  zValidator('query', v.bountyMapQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const bounties = await mapsService.getBountyLocations(query);
    return c.json(bounties);
  }
);
