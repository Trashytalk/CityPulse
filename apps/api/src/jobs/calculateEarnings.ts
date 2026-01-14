// apps/api/src/jobs/calculateEarnings.ts
import type { Job } from 'bullmq';
import type { EarningsCalculationJob, NotificationJob } from '../lib/queue';
import { notificationQueue, addJob } from '../lib/queue';
import { db } from '@citypulse/db';
import { 
  collectionSessions, 
  wallets, 
  transactions,
  userProgression,
} from '@citypulse/db/schema';
import { eq, sql } from 'drizzle-orm';
import { 
  EARNING_RATES, 
  XP_REWARDS,
  QUALITY_THRESHOLDS,
} from '@citypulse/shared/constants';
import { logger } from '../middleware/logger';

/**
 * Calculate and distribute earnings for a processed session
 */
export async function calculateEarningsJob(job: Job<EarningsCalculationJob>) {
  const { sessionId, userId, processingResult } = job.data;
  const log = logger.child({ job: job.id, sessionId, userId });
  
  log.info({ processingResult }, 'Calculating earnings');
  
  const { 
    framesProcessed, 
    entitiesDetected, 
    qualityScore, 
    distanceMeters,
    durationSeconds,
  } = processingResult;
  
  // Get session mode
  const [session] = await db
    .select({ mode: collectionSessions.mode })
    .from(collectionSessions)
    .where(eq(collectionSessions.id, sessionId))
    .limit(1);
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  // Calculate base earnings
  const distanceKm = distanceMeters / 1000;
  let baseRate: number;
  
  switch (session.mode) {
    case 'passive':
      baseRate = EARNING_RATES.PASSIVE_PER_KM;
      break;
    case 'dashcam':
      baseRate = EARNING_RATES.DASHCAM_PER_KM;
      break;
    case 'explore':
      baseRate = EARNING_RATES.EXPLORE_PER_KM;
      break;
    default:
      baseRate = EARNING_RATES.PASSIVE_PER_KM;
  }
  
  let baseCash = Math.floor(distanceKm * baseRate);
  
  // Apply quality multiplier
  let qualityMultiplier = EARNING_RATES.QUALITY_AVERAGE;
  if (qualityScore >= QUALITY_THRESHOLDS.EXCELLENT) {
    qualityMultiplier = EARNING_RATES.QUALITY_EXCELLENT;
  } else if (qualityScore >= QUALITY_THRESHOLDS.GOOD) {
    qualityMultiplier = EARNING_RATES.QUALITY_GOOD;
  } else if (qualityScore < QUALITY_THRESHOLDS.AVERAGE) {
    qualityMultiplier = EARNING_RATES.QUALITY_POOR;
  }
  
  const totalCash = Math.floor(baseCash * qualityMultiplier);
  const totalCredits = totalCash * EARNING_RATES.CREDITS_PER_PESO;
  
  // Calculate XP
  let xp = XP_REWARDS.SESSION_BASE;
  xp += Math.floor(distanceKm * XP_REWARDS.SESSION_PER_KM);
  xp += Math.floor(qualityScore * XP_REWARDS.SESSION_QUALITY_BONUS);
  
  log.info({ totalCash, totalCredits, xp }, 'Earnings calculated');
  
  // Update session with earnings
  await db
    .update(collectionSessions)
    .set({
      earnedCash: totalCash,
      earnedCredits: totalCredits,
      earnedXp: xp,
    })
    .where(eq(collectionSessions.id, sessionId));
  
  // Credit wallet
  await db.transaction(async (tx) => {
    // Update wallet
    await tx
      .update(wallets)
      .set({
        cashBalance: sql`${wallets.cashBalance} + ${totalCash}`,
        creditBalance: sql`${wallets.creditBalance} + ${totalCredits}`,
        totalCashEarned: sql`${wallets.totalCashEarned} + ${totalCash}`,
        totalCreditsEarned: sql`${wallets.totalCreditsEarned} + ${totalCredits}`,
      })
      .where(eq(wallets.userId, userId));
    
    // Record transactions
    if (totalCash > 0) {
      const [wallet] = await tx
        .select({ id: wallets.id, cashBalance: wallets.cashBalance })
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .limit(1);
      
      await tx.insert(transactions).values({
        userId,
        walletId: wallet.id,
        type: 'earning',
        currency: 'cash',
        amount: totalCash,
        balanceAfter: wallet.cashBalance,
        description: 'Collection session earnings',
        referenceType: 'session',
        referenceId: sessionId,
      });
    }
    
    if (totalCredits > 0) {
      const [wallet] = await tx
        .select({ id: wallets.id, creditBalance: wallets.creditBalance })
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .limit(1);
      
      await tx.insert(transactions).values({
        userId,
        walletId: wallet.id,
        type: 'earning',
        currency: 'credits',
        amount: totalCredits,
        balanceAfter: wallet.creditBalance,
        description: 'Collection session credits',
        referenceType: 'session',
        referenceId: sessionId,
      });
    }
    
    // Update XP
    await tx
      .update(userProgression)
      .set({
        totalXp: sql`${userProgression.totalXp} + ${xp}`,
      })
      .where(eq(userProgression.userId, userId));
  });
  
  // Check for achievement unlocks
  await checkAchievements(userId, { distanceKm, qualityScore });
  
  // Send notification
  await addJob<NotificationJob>(notificationQueue, {
    userId,
    type: 'push',
    title: 'Session Complete! 🎉',
    body: `You earned ₱${(totalCash / 100).toFixed(2)} and ${totalCredits} credits!`,
    data: { sessionId, earnings: { cash: totalCash, credits: totalCredits, xp } },
  });
  
  log.info('Earnings distributed successfully');
  
  return { totalCash, totalCredits, xp };
}

/**
 * Check and unlock achievements
 */
async function checkAchievements(userId: string, stats: { distanceKm: number; qualityScore: number }) {
  // This would be expanded to check various achievement conditions
  logger.debug({ userId, stats }, 'Checking achievements');
}
