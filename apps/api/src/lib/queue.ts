// apps/api/src/lib/queue.ts
import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';

// Queue connection options (reuse Redis connection)
const connection = {
  host: new URL(process.env.REDIS_URL!).hostname,
  port: parseInt(new URL(process.env.REDIS_URL!).port || '6379'),
  password: new URL(process.env.REDIS_URL!).password || undefined,
};

// Define queue names
export const QUEUES = {
  SESSION_PROCESSING: 'session-processing',
  EARNINGS_CALCULATION: 'earnings-calculation',
  NOTIFICATION: 'notification',
  WITHDRAWAL: 'withdrawal',
  EMCIP_SYNC: 'emcip-sync',
} as const;

// Job type definitions
export interface SessionProcessingJob {
  sessionId: string;
  userId: string;
  dataUrl: string;
}

export interface EarningsCalculationJob {
  sessionId: string;
  userId: string;
  processingResult: {
    framesProcessed: number;
    entitiesDetected: number;
    qualityScore: number;
    distanceMeters: number;
    durationSeconds: number;
  };
}

export interface NotificationJob {
  userId: string;
  type: 'push' | 'sms';
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface WithdrawalJob {
  withdrawalId: string;
  userId: string;
  amount: number;
  payoutMethodId: string;
}

// Create queues
export const sessionQueue = new Queue<SessionProcessingJob>(
  QUEUES.SESSION_PROCESSING,
  { connection }
);

export const earningsQueue = new Queue<EarningsCalculationJob>(
  QUEUES.EARNINGS_CALCULATION,
  { connection }
);

export const notificationQueue = new Queue<NotificationJob>(
  QUEUES.NOTIFICATION,
  { connection }
);

export const withdrawalQueue = new Queue<WithdrawalJob>(
  QUEUES.WITHDRAWAL,
  { connection }
);

// Helper to add jobs
export async function addJob<T>(
  queue: Queue<T>,
  data: T,
  options?: { delay?: number; priority?: number; attempts?: number }
): Promise<Job<T>> {
  return queue.add('process', data, {
    attempts: options?.attempts ?? 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    delay: options?.delay,
    priority: options?.priority,
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

// Create worker helper
export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>
): Worker<T> {
  return new Worker<T>(queueName, processor, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
}
