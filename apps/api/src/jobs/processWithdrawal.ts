// apps/api/src/jobs/processWithdrawal.ts
import { db } from '@citypulse/db';
import { withdrawals, wallets, payoutMethods, users } from '@citypulse/db/schema';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';

import { decrypt } from '../lib/encryption';
import { env } from '../lib/env';
import type { WithdrawalJob, NotificationJob } from '../lib/queue';
import { notificationQueue, addJob } from '../lib/queue';
import { sendWithdrawalSMS } from '../lib/sms';
import { logger } from '../middleware/logger';

/**
 * Process a withdrawal request
 */
export async function processWithdrawalJob(job: Job<WithdrawalJob>) {
  const { withdrawalId, userId, amount, payoutMethodId } = job.data;
  const log = logger.child({ job: job.id, withdrawalId, userId });
  
  log.info({ amount }, 'Processing withdrawal');
  
  try {
    // Get withdrawal and payout method details
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);
    
    if (!withdrawal) {
      throw new Error(`Withdrawal not found: ${withdrawalId}`);
    }
    
    if (withdrawal.status !== 'pending') {
      log.warn({ status: withdrawal.status }, 'Withdrawal not in pending status');
      return { success: false, reason: 'invalid_status' };
    }
    
    const [payoutMethod] = await db
      .select()
      .from(payoutMethods)
      .where(eq(payoutMethods.id, payoutMethodId))
      .limit(1);
    
    if (!payoutMethod) {
      throw new Error(`Payout method not found: ${payoutMethodId}`);
    }
    
    // Update status to processing
    await db
      .update(withdrawals)
      .set({ status: 'processing' })
      .where(eq(withdrawals.id, withdrawalId));
    
    // Decrypt account identifier
    const accountIdentifier = await decrypt(payoutMethod.accountIdentifier);
    
    // Process payout based on provider
    let providerReference: string | null = null;
    
    switch (payoutMethod.provider) {
      case 'gcash':
        providerReference = await processGCashPayout(accountIdentifier, withdrawal.netAmount);
        break;
      case 'grabpay':
        providerReference = await processGrabPayPayout(accountIdentifier, withdrawal.netAmount);
        break;
      case 'bank_transfer':
        providerReference = await processBankTransfer(accountIdentifier, withdrawal.netAmount);
        break;
      default:
        throw new Error(`Unsupported payout provider: ${payoutMethod.provider}`);
    }
    
    // Update withdrawal as completed
    await db
      .update(withdrawals)
      .set({
        status: 'completed',
        providerReference,
        processedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId));
    
    // Clear pending balance
    await db
      .update(wallets)
      .set({
        pendingCash: 0,
      })
      .where(eq(wallets.userId, userId));
    
    // Get user phone for SMS notification
    const [user] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // Send SMS notification
    if (user?.phone) {
      await sendWithdrawalSMS(
        user.phone,
        withdrawal.netAmount,
        payoutMethod.displayName
      );
    }
    
    // Send push notification
    await addJob<NotificationJob>(notificationQueue, {
      userId,
      type: 'push',
      title: 'Withdrawal Complete! 💰',
      body: `₱${(withdrawal.netAmount / 100).toFixed(2)} has been sent to your ${payoutMethod.displayName}`,
      data: { withdrawalId },
    });
    
    log.info({ providerReference }, 'Withdrawal processed successfully');
    
    return { success: true, providerReference };
    
  } catch (error) {
    log.error({ error }, 'Withdrawal processing failed');
    
    // Mark as failed
    await db
      .update(withdrawals)
      .set({
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(withdrawals.id, withdrawalId));
    
    // Return funds to available balance
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);
    
    if (withdrawal) {
      await db
        .update(wallets)
        .set({
          pendingCash: 0,
        })
        .where(eq(wallets.userId, userId));
    }
    
    throw error;
  }
}

/**
 * Process GCash payout
 */
async function processGCashPayout(_phone: string, _amount: number): Promise<string> {
  if (env.NODE_ENV !== 'production') {
    // Mock for development
    logger.warn('Using mock GCash payout');
    return `MOCK_GCASH_${Date.now()}`;
  }
  
  // Actual GCash API integration would go here
  throw new Error('GCash integration not configured');
}

/**
 * Process GrabPay payout
 */
async function processGrabPayPayout(_phone: string, _amount: number): Promise<string> {
  if (env.NODE_ENV !== 'production') {
    logger.warn('Using mock GrabPay payout');
    return `MOCK_GRABPAY_${Date.now()}`;
  }
  
  throw new Error('GrabPay integration not configured');
}

/**
 * Process bank transfer
 */
async function processBankTransfer(_accountNumber: string, _amount: number): Promise<string> {
  if (env.NODE_ENV !== 'production') {
    logger.warn('Using mock bank transfer');
    return `MOCK_BANK_${Date.now()}`;
  }
  
  throw new Error('Bank transfer integration not configured');
}
