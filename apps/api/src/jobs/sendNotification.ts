// apps/api/src/jobs/sendNotification.ts
import type { Job } from 'bullmq';
import type { NotificationJob } from '../lib/queue';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { sendSMS } from '../lib/sms';
import { db } from '@citypulse/db';
import { users, userProfiles } from '@citypulse/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../middleware/logger';

const expo = new Expo();

/**
 * Send push or SMS notification
 */
export async function sendNotificationJob(job: Job<NotificationJob>) {
  const { userId, type, title, body, data } = job.data;
  const log = logger.child({ job: job.id, userId, type });
  
  log.info({ title, body }, 'Sending notification');
  
  // Get user contact info
  const [user] = await db
    .select({
      phone: users.phone,
      pushToken: userProfiles.pushToken,
      notificationsEnabled: userProfiles.notificationsEnabled,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user) {
    log.warn('User not found');
    return { sent: false, reason: 'user_not_found' };
  }
  
  if (!user.notificationsEnabled) {
    log.info('Notifications disabled for user');
    return { sent: false, reason: 'notifications_disabled' };
  }
  
  if (type === 'push') {
    return sendPushNotification(user.pushToken, title, body, data, log);
  } else if (type === 'sms') {
    return sendSMSNotification(user.phone, body, log);
  }
  
  log.warn({ type }, 'Unknown notification type');
  return { sent: false, reason: 'unknown_type' };
}

/**
 * Send push notification via Expo
 */
async function sendPushNotification(
  pushToken: string | null,
  title: string | undefined,
  body: string,
  data: Record<string, unknown> | undefined,
  log: typeof logger
) {
  if (!pushToken) {
    log.info('No push token for user');
    return { sent: false, reason: 'no_push_token' };
  }
  
  if (!Expo.isExpoPushToken(pushToken)) {
    log.warn({ pushToken }, 'Invalid push token');
    return { sent: false, reason: 'invalid_push_token' };
  }
  
  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };
  
  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    log.info({ tickets }, 'Push notification sent');
    return { sent: true, tickets };
  } catch (error) {
    log.error({ error }, 'Failed to send push notification');
    throw error;
  }
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(
  phone: string | null,
  body: string,
  log: typeof logger
) {
  if (!phone) {
    log.info('No phone number for user');
    return { sent: false, reason: 'no_phone' };
  }
  
  try {
    await sendSMS(phone, body);
    log.info('SMS notification sent');
    return { sent: true };
  } catch (error) {
    log.error({ error }, 'Failed to send SMS notification');
    throw error;
  }
}
