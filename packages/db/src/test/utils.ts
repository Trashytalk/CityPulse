// packages/db/src/test/utils.ts
import { nanoid } from 'nanoid';

import { db } from '../index';
import { 
  users, 
  userProfiles, 
  userProgression, 
  wallets,
  collectionSessions,
  wifiNetworks,
} from '../schema';

/**
 * Create a test user with all related records
 */
export async function createTestUser(options: {
  phone?: string;
  role?: 'user' | 'admin' | 'moderator';
  displayName?: string;
  cashBalance?: number;
  creditBalance?: number;
} = {}) {
  const phone = options.phone || `+6391712345${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
  const userId = nanoid();
  
  const [user] = await db.insert(users).values({
    id: userId,
    phone,
    status: 'active',
    phoneVerified: true,
  }).returning();

  await db.insert(userProfiles).values({
    userId: user.id,
    displayName: options.displayName || 'Test User',
  });

  await db.insert(userProgression).values({
    userId: user.id,
    level: 1,
    totalXp: 0,
    title: 'Newcomer',
    currentStreak: 0,
    longestStreak: 0,
  });

  await db.insert(wallets).values({
    userId: user.id,
    cashBalance: options.cashBalance ?? 0,
    creditBalance: options.creditBalance ?? 1000, // Start with some credits
    pendingCash: 0,
    totalCashEarned: 0,
    totalCreditsEarned: options.creditBalance ?? 1000,
  });

  // Generate a mock token for testing
  const token = `test_token_${userId}`;

  return { user, token };
}

/**
 * Create a test collection session
 */
export async function createTestSession(userId: string, options: {
  mode?: 'passive' | 'dashcam' | 'explore';
  status?: 'active' | 'completed' | 'processing' | 'processed' | 'failed';
  distanceMeters?: number;
  durationSeconds?: number;
} = {}) {
  const [session] = await db.insert(collectionSessions).values({
    id: nanoid(),
    userId,
    mode: options.mode || 'dashcam',
    status: options.status || 'active',
    distanceMeters: options.distanceMeters || 0,
    durationSeconds: options.durationSeconds || 0,
    startedAt: new Date(),
  }).returning();

  return session;
}

/**
 * Create a test WiFi network
 */
export async function createTestWifiNetwork(options: {
  ssid?: string;
  latitude?: number;
  longitude?: number;
  hasPassword?: boolean;
  unlockCost?: number;
} = {}) {
  const [network] = await db.insert(wifiNetworks).values({
    id: nanoid(),
    ssid: options.ssid || `TestNetwork_${nanoid(6)}`,
    latitude: options.latitude || 14.5995,
    longitude: options.longitude || 120.9842,
    h3Index: `test_h3_${nanoid(8)}`,
    hasPassword: options.hasPassword ?? true,
    unlockCost: options.unlockCost ?? 50,
    freshnessScore: 100,
    verificationScore: 0,
    isActive: true,
    isVerified: false,
  }).returning();

  return network;
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      displayName: `Test User ${i + 1}`,
    });
    users.push(user);
  }
  return users;
}
