// apps/api/src/lib/notifications.ts
import type { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Expo } from 'expo-server-sdk';

import { logger } from '../middleware/logger';

const expo = new Expo();

/**
 * Send a push notification via Expo
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<ExpoPushTicket[]> {
  if (!Expo.isExpoPushToken(pushToken)) {
    throw new Error('Invalid push token');
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
    logger.debug({ tickets }, 'Push notification sent');
    return tickets;
  } catch (error) {
    logger.error({ error }, 'Failed to send push notification');
    throw error;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendBulkPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  // Filter valid tokens
  const validMessages = messages.filter(m => 
    typeof m.to === 'string' ? Expo.isExpoPushToken(m.to) : m.to.every(t => Expo.isExpoPushToken(t))
  );
  
  if (validMessages.length === 0) {
    return [];
  }
  
  // Chunk messages to avoid rate limits
  const chunks = expo.chunkPushNotifications(validMessages);
  const tickets: ExpoPushTicket[] = [];
  
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      logger.error({ error }, 'Failed to send push notification chunk');
    }
  }
  
  return tickets;
}

/**
 * Notification message templates
 */
export const notificationTemplates = {
  sessionProcessed: (earnings: number) => ({
    title: 'Session Complete! 🎉',
    body: `Your session earned ₱${(earnings / 100).toFixed(2)}!`,
  }),
  
  achievementUnlocked: (name: string) => ({
    title: '🏆 Achievement Unlocked!',
    body: `You've earned: ${name}`,
  }),
  
  withdrawalCompleted: (amount: number) => ({
    title: 'Withdrawal Complete! 💰',
    body: `₱${(amount / 100).toFixed(2)} has been sent to your account`,
  }),
  
  withdrawalFailed: (reason: string) => ({
    title: 'Withdrawal Failed ❌',
    body: `Your withdrawal could not be processed: ${reason}`,
  }),
  
  streakReminder: (streak: number) => ({
    title: `Keep your ${streak}-day streak! 🔥`,
    body: "Don't lose your progress - collect today!",
  }),
  
  levelUp: (level: number, title: string) => ({
    title: `Level ${level} Reached! 🚀`,
    body: `Congratulations! You're now a ${title}`,
  }),
  
  challengeEnding: (name: string, hoursLeft: number) => ({
    title: 'Challenge Ending Soon! ⏰',
    body: `${name} ends in ${hoursLeft} hours`,
  }),
  
  referralBonus: (amount: number) => ({
    title: 'Referral Bonus! 🎁',
    body: `You earned ₱${(amount / 100).toFixed(2)} from a referral`,
  }),
  
  wifiUnlockReminder: () => ({
    title: 'WiFi Available Nearby 📶',
    body: 'Unlock community WiFi networks with your credits',
  }),
};
