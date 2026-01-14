/* eslint-disable no-console */
// packages/db/src/seed.ts
import { nanoid } from 'nanoid';

import {
  users,
  userProfiles,
  userProgression,
  wallets,
  achievements,
  challenges,
  wifiNetworks,
} from './schema';

import { db } from './index';

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = {
  first_session: { name: 'First Steps', category: 'sessions', requirement: 1, xp: 50, credits: 100 },
  sessions_10: { name: 'Getting Started', category: 'sessions', requirement: 10, xp: 100, credits: 200 },
  sessions_50: { name: 'Regular Collector', category: 'sessions', requirement: 50, xp: 250, credits: 500 },
  sessions_100: { name: 'Dedicated Explorer', category: 'sessions', requirement: 100, xp: 500, credits: 1000 },
  distance_10: { name: 'Urban Walker', category: 'distance', requirement: 10, xp: 100, credits: 200 },
  distance_50: { name: 'City Explorer', category: 'distance', requirement: 50, xp: 250, credits: 500 },
  distance_100: { name: 'Metro Master', category: 'distance', requirement: 100, xp: 500, credits: 1000 },
  streak_7: { name: 'Week Warrior', category: 'streak', requirement: 7, xp: 200, credits: 400 },
  streak_30: { name: 'Monthly Maven', category: 'streak', requirement: 30, xp: 500, credits: 1000 },
  wifi_first: { name: 'Network Finder', category: 'wifi', requirement: 1, xp: 50, credits: 100 },
  wifi_10: { name: 'WiFi Hunter', category: 'wifi', requirement: 10, xp: 200, credits: 400 },
  entities_100: { name: 'Entity Spotter', category: 'entities', requirement: 100, xp: 150, credits: 300 },
  entities_1000: { name: 'Data Collector', category: 'entities', requirement: 1000, xp: 500, credits: 1000 },
};

async function seed() {
  console.log('🌱 Seeding database...');

  // Create achievements
  console.log('Creating achievements...');
  const achievementData = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([code, def]) => ({
    id: nanoid(),
    code,
    name: def.name,
    description: `Unlock by reaching ${def.requirement} ${def.category}`,
    category: def.category,
    xpReward: def.xp,
    creditReward: def.credits,
    requirement: def.requirement,
    requirementType: def.category,
    isHidden: false,
  }));

  for (const achievement of achievementData) {
    await db.insert(achievements).values(achievement).onConflictDoNothing();
  }
  console.log(`  ✓ ${achievementData.length} achievements created`);

  // Create sample challenges
  console.log('Creating challenges...');
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const challengeData = [
    {
      id: nanoid(),
      code: 'weekly_distance_10',
      name: 'Weekly Walker',
      description: 'Collect 10km this week',
      type: 'weekly' as const,
      targetMetric: 'distance',
      targetValue: 10,
      xpReward: 100,
      creditReward: 200,
      cashReward: 0,
      startsAt: now,
      endsAt: weekEnd,
      isActive: true,
    },
    {
      id: nanoid(),
      code: 'weekly_sessions_5',
      name: 'Consistent Collector',
      description: 'Complete 5 sessions this week',
      type: 'weekly' as const,
      targetMetric: 'sessions',
      targetValue: 5,
      xpReward: 75,
      creditReward: 150,
      cashReward: 0,
      startsAt: now,
      endsAt: weekEnd,
      isActive: true,
    },
  ];

  for (const challenge of challengeData) {
    await db.insert(challenges).values(challenge).onConflictDoNothing();
  }
  console.log('  ✓ Challenges created');

  // Create test users (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating test users...');

    const testUsers = [
      { phone: '+639000000000', displayName: 'Test User 1', role: 'user' as const },
      { phone: '+639000000001', displayName: 'Test Admin', role: 'admin' as const },
      { phone: '+639000000002', displayName: 'Test Moderator', role: 'moderator' as const },
    ];

    for (const testUser of testUsers) {
      const userId = nanoid();

      try {
        await db.insert(users).values({
          id: userId,
          phone: testUser.phone,
          status: 'active',
          phoneVerified: true,
        }).onConflictDoNothing();

        await db.insert(userProfiles).values({
          userId,
          displayName: testUser.displayName,
        }).onConflictDoNothing();

        await db.insert(userProgression).values({
          userId,
          level: 5,
          totalXp: 500,
          currentStreak: 3,
          longestStreak: 7,
          title: 'Explorer',
        }).onConflictDoNothing();

        await db.insert(wallets).values({
          userId,
          cashBalance: 10000, // ₱100 in centavos
          creditBalance: 5000,
          pendingCash: 0,
          totalCashEarned: 50000,
          totalCreditsEarned: 25000,
        }).onConflictDoNothing();
      } catch (error) {
        console.log(`  User ${testUser.displayName} may already exist`);
      }
    }

    console.log(`  ✓ ${testUsers.length} test users created`);
  }

  // Create sample WiFi networks
  console.log('Creating sample WiFi networks...');
  const wifiSamples = [
    { ssid: 'Starbucks_WiFi', lat: 14.5547, lng: 121.0244, venue: 'Starbucks BGC' },
    { ssid: 'McDo_Free_WiFi', lat: 14.5565, lng: 121.0234, venue: "McDonald's" },
    { ssid: 'SM_Guest', lat: 14.5894, lng: 121.0561, venue: 'SM Megamall' },
    { ssid: 'Ayala_Mall_WiFi', lat: 14.5572, lng: 121.0196, venue: 'Ayala Triangle' },
    { ssid: 'Grab_Kitchen_WiFi', lat: 14.5533, lng: 121.0489, venue: 'GrabFood Kitchen' },
    { ssid: 'Jollibee_Guest', lat: 14.5612, lng: 121.0287, venue: 'Jollibee' },
  ];

  for (const wifi of wifiSamples) {
    await db.insert(wifiNetworks).values({
      id: nanoid(),
      ssid: wifi.ssid,
      latitude: wifi.lat,
      longitude: wifi.lng,
      h3Index: `h3_${wifi.lat.toFixed(2)}_${wifi.lng.toFixed(2)}`,
      hasPassword: true,
      encryptedPassword: 'encrypted_sample_password',
      venueType: 'cafe',
      venueName: wifi.venue,
      unlockCost: 50,
      freshnessScore: 85,
      verificationScore: 70,
      isVerified: true,
      isActive: true,
    }).onConflictDoNothing();
  }

  console.log(`  ✓ ${wifiSamples.length} WiFi networks created`);

  console.log('✅ Seeding complete!');
}

// Run seed
seed()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
