// apps/api/src/modules/maps/service.ts
import { AppError, ERROR_CODES } from '../../lib/errors';
import { getSignedDownloadUrl } from '../../lib/s3';

import { mapsRepository } from './repository';
import type {
  CoverageQuery,
  CoverageStatsQuery,
  EntitiesQuery,
  StreetviewPointQuery,
  HeatmapQuery,
  BountyMapQuery,
} from './validators';

// Simple clustering function for entity points
function clusterEntities(entities: any[], zoomLevel: number) {
  // Simple grid-based clustering
  const gridSize = 0.01 / Math.pow(2, zoomLevel - 10); // Adjust grid based on zoom

  const clusters: Map<string, { points: any[]; center: { lat: number; lng: number } }> = new Map();

  for (const entity of entities) {
    const gridX = Math.floor(entity.longitude / gridSize);
    const gridY = Math.floor(entity.latitude / gridSize);
    const key = `${gridX},${gridY}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        points: [],
        center: { lat: entity.latitude, lng: entity.longitude },
      });
    }

    clusters.get(key)!.points.push(entity);
  }

  return Array.from(clusters.values()).map(cluster => {
    if (cluster.points.length === 1) {
      const entity = cluster.points[0];
      return {
        type: 'Feature',
        id: entity.id,
        geometry: {
          type: 'Point',
          coordinates: [entity.longitude, entity.latitude],
        },
        properties: {
          type: entity.type,
          subtype: entity.subtype,
          confidence: entity.confidence,
          cluster: false,
        },
      };
    }

    // Calculate cluster center
    const avgLat = cluster.points.reduce((sum, p) => sum + p.latitude, 0) / cluster.points.length;
    const avgLng = cluster.points.reduce((sum, p) => sum + p.longitude, 0) / cluster.points.length;

    return {
      type: 'Feature',
      id: `cluster-${cluster.points[0].id}`,
      geometry: {
        type: 'Point',
        coordinates: [avgLng, avgLat],
      },
      properties: {
        cluster: true,
        point_count: cluster.points.length,
        cluster_id: cluster.points[0].id,
      },
    };
  });
}

export const mapsService = {
  // ==========================================================================
  // COVERAGE
  // ==========================================================================
  async getCoverage(query: CoverageQuery) {
    // Validate bounds
    if (query.north <= query.south || query.east <= query.west) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid bounding box', 400);
    }

    // Limit area to prevent huge queries
    const area = (query.north - query.south) * (query.east - query.west);
    if (area > 1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Bounding box too large', 400);
    }

    const cells = await mapsRepository.getCoverageCells(query);

    return {
      type: 'FeatureCollection',
      features: cells.map(cell => ({
        type: 'Feature',
        id: cell.h3Index,
        geometry: {
          type: 'Polygon',
          coordinates: [cell.boundary],
        },
        properties: {
          h3Index: cell.h3Index,
          status: cell.status,
          coveragePercent: cell.coveragePercent,
          qualityScore: cell.qualityScore,
          lastCollected: cell.lastCollected,
          frameCount: cell.frameCount,
        },
      })),
      metadata: {
        bounds: query,
        resolution: query.resolution,
        cellCount: cells.length,
      },
    };
  },

  async getCoverageStats(query: CoverageStatsQuery) {
    const stats = await mapsRepository.getCoverageStats(query);

    return {
      totalCells: stats.totalCells,
      coveredCells: stats.coveredCells,
      coveragePercent: stats.totalCells > 0
        ? Math.round((stats.coveredCells / stats.totalCells) * 100)
        : 0,

      qualityBreakdown: {
        excellent: stats.qualityExcellent,
        good: stats.qualityGood,
        average: stats.qualityAverage,
        poor: stats.qualityPoor,
      },

      freshness: {
        fresh: stats.freshnessFresh,       // < 7 days
        recent: stats.freshnessRecent,     // 7-30 days
        stale: stats.freshnessStale,       // 30-90 days
        outdated: stats.freshnessOutdated, // > 90 days
      },

      totalFrames: stats.totalFrames,
      totalEntities: stats.totalEntities,
      totalDistanceKm: stats.totalDistanceKm,

      lastUpdated: stats.lastUpdated,
    };
  },

  // ==========================================================================
  // VECTOR TILES
  // ==========================================================================
  async getVectorTile(z: number, x: number, y: number): Promise<Buffer> {
    // Check if tile exists in cache (R2 or Redis)
    const cached = await mapsRepository.getCachedTile(z, x, y);
    if (cached) return cached;

    // Generate tile on the fly
    const tile = await mapsRepository.generateVectorTile(z, x, y);

    // Cache for future requests
    await mapsRepository.cacheTile(z, x, y, tile);

    return tile;
  },

  // ==========================================================================
  // ENTITIES
  // ==========================================================================
  async getEntities(query: EntitiesQuery) {
    const typeFilter = query.types?.split(',').filter(Boolean);

    const entities = await mapsRepository.getEntities({
      ...query,
      types: typeFilter,
    });

    if (query.cluster) {
      // Cluster entities for better map performance
      return {
        type: 'FeatureCollection',
        features: clusterEntities(entities, 13), // Cluster at zoom 13
      };
    }

    return {
      type: 'FeatureCollection',
      features: entities.map(entity => ({
        type: 'Feature',
        id: entity.id,
        geometry: {
          type: 'Point',
          coordinates: [entity.longitude, entity.latitude],
        },
        properties: {
          type: entity.type,
          subtype: entity.subtype,
          confidence: entity.confidence,
          verificationScore: entity.verificationScore,
          attributes: entity.attributes,
          firstSeenAt: entity.firstSeenAt,
        },
      })),
    };
  },

  async getEntityDetail(entityId: string) {
    const entity = await mapsRepository.getEntity(entityId);

    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Entity not found', 404);
    }

    // Get source frame if available
    const sourceFrame = entity.sourceFrameId
      ? await mapsRepository.getFrame(entity.sourceFrameId)
      : null;

    return {
      id: entity.id,
      type: entity.type,
      subtype: entity.subtype,

      location: {
        latitude: entity.latitude,
        longitude: entity.longitude,
        h3Index: entity.h3Index,
      },

      confidence: entity.confidence,
      verificationScore: entity.verificationScore,
      verificationCount: entity.verificationCount,

      attributes: entity.attributes,

      source: sourceFrame ? {
        frameId: sourceFrame.id,
        sessionId: sourceFrame.sessionId,
        capturedAt: sourceFrame.capturedAt,
        thumbnailUrl: sourceFrame.thumbnailPath
          ? await getSignedDownloadUrl(sourceFrame.thumbnailPath)
          : null,
      } : null,

      firstSeenAt: entity.firstSeenAt,
      lastSeenAt: entity.lastSeenAt,
    };
  },

  // ==========================================================================
  // STREET VIEW
  // ==========================================================================
  async getNearestStreetviewPoint(query: StreetviewPointQuery) {
    const frame = await mapsRepository.getNearestFrame(
      query.lat,
      query.lng,
      query.radius
    );

    if (!frame) {
      return { found: false };
    }

    return {
      found: true,
      frame: {
        id: frame.id,
        sessionId: frame.sessionId,
        latitude: frame.latitude,
        longitude: frame.longitude,
        heading: frame.heading,
        capturedAt: frame.capturedAt,
        distance: frame.distance,
      },
    };
  },

  async getStreetviewImage(frameId: string, size: 'small' | 'medium' | 'large') {
    const frame = await mapsRepository.getFrame(frameId);

    if (!frame) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Frame not found', 404);
    }

    const pathField = {
      small: 'thumbnailPath',
      medium: 'processedPath',
      large: 'originalPath',
    }[size] as keyof typeof frame;

    const path = (frame[pathField] || frame.processedPath) as string | null;

    if (!path) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Image not available', 404);
    }

    return getSignedDownloadUrl(path);
  },

  async getStreetviewSequence(frameId: string) {
    const frame = await mapsRepository.getFrame(frameId);

    if (!frame) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Frame not found', 404);
    }

    // Get surrounding frames from same session
    const sequence = await mapsRepository.getFrameSequence(
      frame.sessionId,
      frame.sequenceNumber,
      5 // 5 frames before and after
    );

    return {
      current: {
        id: frame.id,
        sequenceNumber: frame.sequenceNumber,
        latitude: frame.latitude,
        longitude: frame.longitude,
        heading: frame.heading,
        capturedAt: frame.capturedAt,
      },

      sequence: sequence.map(f => ({
        id: f.id,
        sequenceNumber: f.sequenceNumber,
        latitude: f.latitude,
        longitude: f.longitude,
        heading: f.heading,
        capturedAt: f.capturedAt,
        isCurrent: f.id === frameId,
      })),

      navigation: {
        hasPrevious: sequence.some(f => f.sequenceNumber < frame.sequenceNumber),
        hasNext: sequence.some(f => f.sequenceNumber > frame.sequenceNumber),
        previousId: sequence.find(f => f.sequenceNumber === frame.sequenceNumber - 1)?.id,
        nextId: sequence.find(f => f.sequenceNumber === frame.sequenceNumber + 1)?.id,
      },
    };
  },

  // ==========================================================================
  // HEATMAP
  // ==========================================================================
  async getHeatmapData(query: HeatmapQuery) {
    const data = await mapsRepository.getHeatmapData(query);

    return {
      points: data.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        weight: point.value,
      })),

      metric: query.metric,
      bounds: {
        north: query.north,
        south: query.south,
        east: query.east,
        west: query.west,
      },
    };
  },

  // ==========================================================================
  // BOUNTIES
  // ==========================================================================
  async getBountyLocations(query: BountyMapQuery) {
    const bounties = await mapsRepository.getNearbyBounties(
      query.lat,
      query.lng,
      query.radius
    );

    return {
      type: 'FeatureCollection',
      features: bounties.map((bounty: any) => ({
        type: 'Feature',
        id: bounty.id,
        geometry: {
          type: 'Point',
          coordinates: [bounty.longitude, bounty.latitude],
        },
        properties: {
          name: bounty.name,
          reward: bounty.reward,
          difficulty: bounty.difficulty,
          expiresAt: bounty.expiresAt,
        },
      })),
    };
  },
};
