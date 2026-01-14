// apps/api/src/jobs/worker.ts
import { createWorker, QUEUES } from '../lib/queue';
import { logger } from '../middleware/logger';

import { calculateEarningsJob } from './calculateEarnings';
import { processSessionJob } from './processSession';
import { processWithdrawalJob } from './processWithdrawal';
import { sendNotificationJob } from './sendNotification';


const log = logger.child({ module: 'worker' });

/**
 * Start all workers
 */
export function startWorkers() {
  log.info('Starting job workers...');
  
  // Session processing worker
  const sessionWorker = createWorker(QUEUES.SESSION_PROCESSING, processSessionJob);
  sessionWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Session processing completed');
  });
  sessionWorker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Session processing failed');
  });
  
  // Earnings calculation worker
  const earningsWorker = createWorker(QUEUES.EARNINGS_CALCULATION, calculateEarningsJob);
  earningsWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Earnings calculation completed');
  });
  earningsWorker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Earnings calculation failed');
  });
  
  // Notification worker
  const notificationWorker = createWorker(QUEUES.NOTIFICATION, sendNotificationJob);
  notificationWorker.on('completed', (job) => {
    log.debug({ jobId: job.id }, 'Notification sent');
  });
  notificationWorker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Notification failed');
  });
  
  // Withdrawal worker
  const withdrawalWorker = createWorker(QUEUES.WITHDRAWAL, processWithdrawalJob);
  withdrawalWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Withdrawal processed');
  });
  withdrawalWorker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Withdrawal processing failed');
  });
  
  log.info('All workers started');
  
  // Return workers for graceful shutdown
  return {
    sessionWorker,
    earningsWorker,
    notificationWorker,
    withdrawalWorker,
  };
}

/**
 * Graceful shutdown
 */
export async function stopWorkers(workers: ReturnType<typeof startWorkers>) {
  log.info('Stopping workers...');
  
  await Promise.all([
    workers.sessionWorker.close(),
    workers.earningsWorker.close(),
    workers.notificationWorker.close(),
    workers.withdrawalWorker.close(),
  ]);
  
  log.info('All workers stopped');
}

// Start workers if run directly
if (require.main === module) {
  const workers = startWorkers();
  
  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    await stopWorkers(workers);
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    await stopWorkers(workers);
    process.exit(0);
  });
}
