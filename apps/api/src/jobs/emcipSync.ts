// apps/api/src/jobs/emcipSync.ts
import type { Job } from 'bullmq';
import { db } from '@citypulse/db';
import { entities } from '@citypulse/db/schema';
import { gte, eq } from 'drizzle-orm';
import { logger } from '../middleware/logger';
import { env } from '../lib/env';

interface EMCIPEntity {
  source: 'citypulse';
  sourceId: string;
  entityType: string;
  subType: string;
  location: {
    latitude: number;
    longitude: number;
    h3Index: string;
    address?: string;
  };
  attributes: Record<string, unknown>;
  confidence: number;
  capturedAt: string;
  verificationScore: number;
}

interface EMCIPSyncJob {
  entityIds?: string[];
  since?: string; // ISO date string
  batchSize?: number;
}

/**
 * Sync entities to EMCIP platform
 */
export async function emcipSyncJob(job: Job<EMCIPSyncJob>) {
  const { entityIds, since, batchSize = 100 } = job.data;
  const log = logger.child({ job: job.id });
  
  log.info('Starting EMCIP sync');
  
  if (!env.EMCIP_WEBHOOK_URL || !env.EMCIP_API_KEY) {
    log.warn('EMCIP not configured, skipping sync');
    return { synced: 0, reason: 'not_configured' };
  }
  
  try {
    // Fetch entities to sync
    let entityRecords;
    
    if (entityIds && entityIds.length > 0) {
      // Sync specific entities
      entityRecords = await db
        .select()
        .from(entities)
        .where(eq(entities.id, entityIds[0])) // TODO: Use inArray
        .limit(batchSize);
    } else if (since) {
      // Sync entities created since date
      entityRecords = await db
        .select()
        .from(entities)
        .where(gte(entities.createdAt, new Date(since)))
        .limit(batchSize);
    } else {
      // Sync pending entities
      entityRecords = await db
        .select()
        .from(entities)
        .where(eq(entities.emcipSynced, false))
        .limit(batchSize);
    }
    
    if (entityRecords.length === 0) {
      log.info('No entities to sync');
      return { synced: 0 };
    }
    
    // Transform to EMCIP format
    const payload: EMCIPEntity[] = entityRecords.map(e => ({
      source: 'citypulse',
      sourceId: e.id,
      entityType: e.type,
      subType: e.subtype || '',
      location: {
        latitude: e.latitude,
        longitude: e.longitude,
        h3Index: e.h3Index,
        address: e.address,
      },
      attributes: e.attributes as Record<string, unknown>,
      confidence: e.confidence,
      capturedAt: e.createdAt.toISOString(),
      verificationScore: e.verificationScore || 0,
    }));
    
    // Send to EMCIP
    const response = await fetch(env.EMCIP_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.EMCIP_API_KEY!,
      },
      body: JSON.stringify({ entities: payload }),
    });
    
    if (!response.ok) {
      throw new Error(`EMCIP sync failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Mark entities as synced
    for (const entity of entityRecords) {
      await db
        .update(entities)
        .set({ emcipSynced: true, emcipSyncedAt: new Date() })
        .where(eq(entities.id, entity.id));
    }
    
    log.info({ count: entityRecords.length }, 'EMCIP sync completed');
    
    return { synced: entityRecords.length, result };
    
  } catch (error) {
    log.error({ error }, 'EMCIP sync failed');
    throw error;
  }
}

/**
 * Sync a batch of entities to EMCIP
 */
export async function syncEntitiesToEMCIP(entityRecords: typeof entities.$inferSelect[]) {
  const payload: EMCIPEntity[] = entityRecords.map(e => ({
    source: 'citypulse',
    sourceId: e.id,
    entityType: e.type,
    subType: e.subtype || '',
    location: {
      latitude: e.latitude,
      longitude: e.longitude,
      h3Index: e.h3Index,
    },
    attributes: e.attributes as Record<string, unknown>,
    confidence: e.confidence,
    capturedAt: e.createdAt.toISOString(),
    verificationScore: e.verificationScore || 0,
  }));
  
  const response = await fetch(process.env.EMCIP_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.EMCIP_API_KEY!,
    },
    body: JSON.stringify({ entities: payload }),
  });
  
  if (!response.ok) {
    throw new Error(`EMCIP sync failed: ${response.statusText}`);
  }
  
  return response.json();
}
