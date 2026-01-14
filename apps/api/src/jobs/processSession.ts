// apps/api/src/jobs/processSession.ts
import type { Job } from 'bullmq';
import type { SessionProcessingJob, EarningsCalculationJob } from '../lib/queue';
import { earningsQueue, addJob } from '../lib/queue';
import { db } from '@citypulse/db';
import { collectionSessions } from '@citypulse/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../middleware/logger';
import { env } from '../lib/env';

/**
 * Process a collection session through ML pipeline
 */
export async function processSessionJob(job: Job<SessionProcessingJob>) {
  const { sessionId, userId, dataUrl } = job.data;
  const log = logger.child({ job: job.id, sessionId });
  
  log.info('Starting session processing');
  
  try {
    // Update session status to processing
    await db
      .update(collectionSessions)
      .set({ status: 'processing' })
      .where(eq(collectionSessions.id, sessionId));
    
    // Call ML service (Modal.com)
    const mlResult = await callMLService(sessionId, dataUrl);
    
    log.info({ mlResult }, 'ML processing complete');
    
    // Update session with processing results
    await db
      .update(collectionSessions)
      .set({
        status: 'processed',
        qualityScore: mlResult.qualityScore,
        frameCount: mlResult.framesProcessed,
      })
      .where(eq(collectionSessions.id, sessionId));
    
    // Get session details for earnings calculation
    const [session] = await db
      .select()
      .from(collectionSessions)
      .where(eq(collectionSessions.id, sessionId))
      .limit(1);
    
    // Queue earnings calculation
    await addJob<EarningsCalculationJob>(earningsQueue, {
      sessionId,
      userId,
      processingResult: {
        framesProcessed: mlResult.framesProcessed,
        entitiesDetected: mlResult.entitiesDetected,
        qualityScore: mlResult.qualityScore,
        distanceMeters: session.distanceMeters,
        durationSeconds: session.durationSeconds,
      },
    });
    
    log.info('Session processing complete, earnings calculation queued');
    
    return { success: true, mlResult };
    
  } catch (error) {
    log.error({ error }, 'Session processing failed');
    
    // Mark session as failed
    await db
      .update(collectionSessions)
      .set({ status: 'failed' })
      .where(eq(collectionSessions.id, sessionId));
    
    throw error;
  }
}

/**
 * Call Modal.com ML service
 */
async function callMLService(sessionId: string, dataUrl: string) {
  if (!env.MODAL_TOKEN) {
    // Development fallback - simulate ML results
    logger.warn('ML service not configured, using mock results');
    return {
      framesProcessed: Math.floor(Math.random() * 100) + 10,
      entitiesDetected: Math.floor(Math.random() * 50),
      qualityScore: Math.floor(Math.random() * 30) + 70,
    };
  }
  
  const response = await fetch('https://citypulse-ml--process-session.modal.run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MODAL_TOKEN}`,
    },
    body: JSON.stringify({
      sessionId,
      dataUrl,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`ML service error: ${response.statusText}`);
  }
  
  return response.json();
}
