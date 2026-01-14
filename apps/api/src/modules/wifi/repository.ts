// apps/api/src/modules/wifi/repository.ts
import { db } from '@citypulse/db';
import { wifiNetworks, wifiUnlocks, wifiContributions } from '@citypulse/db/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import type { NearbyQuery, ContributionsQuery } from './validators';

export const wifiRepository = {
  // ==========================================================================
  // NETWORK OPERATIONS
  // ==========================================================================
  async findNearby(
    lat: number,
    lng: number,
    radius: number,
    options: NearbyQuery
  ) {
    // Calculate distance using Haversine formula approximation
    const distanceQuery = sql<number>`
      (6371000 * acos(
        cos(radians(${lat})) * cos(radians(${wifiNetworks.latitude})) *
        cos(radians(${wifiNetworks.longitude}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${wifiNetworks.latitude}))
      ))
    `;

    const conditions = [
      sql`${distanceQuery} < ${radius}`,
    ];

    if (options.hasPassword !== undefined) {
      conditions.push(eq(wifiNetworks.hasPassword, options.hasPassword));
    }

    if (options.venueType && options.venueType !== 'all') {
      conditions.push(eq(wifiNetworks.venueType, options.venueType));
    }

    const orderBy = {
      distance: distanceQuery,
      freshness: wifiNetworks.freshnessScore,
      rating: wifiNetworks.verificationScore,
    }[options.sortBy] || distanceQuery;

    const networks = await db
      .select({
        id: wifiNetworks.id,
        ssid: wifiNetworks.ssid,
        latitude: wifiNetworks.latitude,
        longitude: wifiNetworks.longitude,
        venueName: wifiNetworks.venueName,
        venueType: wifiNetworks.venueType,
        address: wifiNetworks.address,
        hasPassword: wifiNetworks.hasPassword,
        unlockCost: wifiNetworks.unlockCost,
        freshnessScore: wifiNetworks.freshnessScore,
        verificationScore: wifiNetworks.verificationScore,
        security: wifiNetworks.security,
        reportCount: wifiNetworks.reportCount,
        successCount: wifiNetworks.successCount,
        failCount: wifiNetworks.failCount,
        lastVerifiedAt: wifiNetworks.lastVerifiedAt,
        distance: distanceQuery,
      })
      .from(wifiNetworks)
      .where(and(...conditions))
      .orderBy(options.sortBy === 'distance' ? orderBy : desc(orderBy))
      .limit(options.limit);

    return networks;
  },

  async getNetwork(networkId: string) {
    return db.query.wifiNetworks.findFirst({
      where: eq(wifiNetworks.id, networkId),
    });
  },

  async createNetwork(data: {
    ssid: string;
    bssid: string;
    encryptedPassword?: string;
    hasPassword: boolean;
    latitude: number;
    longitude: number;
    h3Index: string;
    venueName?: string;
    venueType?: string;
    contributedBy?: string;
    freshnessScore: number;
    verificationScore: number;
    unlockCost: number;
  }) {
    const [network] = await db
      .insert(wifiNetworks)
      .values(data)
      .returning();

    return network;
  },

  async updateNetworkStats(networkId: string, success: boolean) {
    const update = success
      ? { successCount: sql`${wifiNetworks.successCount} + 1` }
      : { failCount: sql`${wifiNetworks.failCount} + 1` };

    await db
      .update(wifiNetworks)
      .set({
        ...update,
        reportCount: sql`${wifiNetworks.reportCount} + 1`,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wifiNetworks.id, networkId));
  },

  async decreaseFreshnessScore(networkId: string) {
    await db
      .update(wifiNetworks)
      .set({
        freshnessScore: sql`GREATEST(0, ${wifiNetworks.freshnessScore} - 0.1)`,
        updatedAt: new Date(),
      })
      .where(eq(wifiNetworks.id, networkId));
  },

  async findDuplicate(ssid: string, lat: number, lng: number, radiusMeters: number) {
    // Simple distance check
    const distanceQuery = sql<number>`
      (6371000 * acos(
        cos(radians(${lat})) * cos(radians(${wifiNetworks.latitude})) *
        cos(radians(${wifiNetworks.longitude}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${wifiNetworks.latitude}))
      ))
    `;

    return db.query.wifiNetworks.findFirst({
      where: and(
        eq(wifiNetworks.ssid, ssid),
        sql`${distanceQuery} < ${radiusMeters}`
      ),
    });
  },

  // ==========================================================================
  // UNLOCK OPERATIONS
  // ==========================================================================
  async getUserUnlockedNetworkIds(userId: string) {
    const unlocks = await db
      .select({ networkId: wifiUnlocks.networkId })
      .from(wifiUnlocks)
      .where(eq(wifiUnlocks.userId, userId));

    return unlocks.map(u => u.networkId);
  },

  async hasUserUnlocked(userId: string, networkId: string) {
    const unlock = await db.query.wifiUnlocks.findFirst({
      where: and(
        eq(wifiUnlocks.userId, userId),
        eq(wifiUnlocks.networkId, networkId)
      ),
    });

    return !!unlock;
  },

  async getUnlock(userId: string, networkId: string) {
    return db.query.wifiUnlocks.findFirst({
      where: and(
        eq(wifiUnlocks.userId, userId),
        eq(wifiUnlocks.networkId, networkId)
      ),
    });
  },

  async recordUnlock(userId: string, networkId: string, creditsCost: number) {
    const [unlock] = await db
      .insert(wifiUnlocks)
      .values({
        userId,
        networkId,
        creditsCost,
        unlockedAt: new Date(),
      })
      .returning();

    return unlock;
  },

  async recordFeedback(userId: string, networkId: string, success: boolean, comment?: string) {
    await db
      .update(wifiUnlocks)
      .set({
        feedbackGiven: true,
        feedbackSuccess: success,
        feedbackAt: new Date(),
      })
      .where(and(
        eq(wifiUnlocks.userId, userId),
        eq(wifiUnlocks.networkId, networkId)
      ));
  },

  async getUserUnlocks(userId: string) {
    return db.query.wifiUnlocks.findMany({
      where: eq(wifiUnlocks.userId, userId),
      orderBy: desc(wifiUnlocks.unlockedAt),
      with: {
        network: true,
      },
    });
  },

  // ==========================================================================
  // CONTRIBUTION OPERATIONS
  // ==========================================================================
  async createContribution(data: {
    userId: string;
    ssid: string;
    password: string;
    latitude: number;
    longitude: number;
    h3Index: string;
    venueName?: string;
    venueType?: string;
    notes?: string;
    status: string;
  }) {
    const [contribution] = await db
      .insert(wifiContributions)
      .values(data)
      .returning();

    return contribution;
  },

  async getContribution(contributionId: string) {
    return db.query.wifiContributions.findFirst({
      where: eq(wifiContributions.id, contributionId),
    });
  },

  async updateContribution(contributionId: string, data: {
    status?: string;
    networkId?: string;
    reviewedAt?: Date;
  }) {
    await db
      .update(wifiContributions)
      .set(data)
      .where(eq(wifiContributions.id, contributionId));
  },

  async getUserContributions(userId: string, query: ContributionsQuery) {
    const conditions = [eq(wifiContributions.userId, userId)];

    if (query.status && query.status !== 'all') {
      conditions.push(eq(wifiContributions.status, query.status));
    }

    return db.query.wifiContributions.findMany({
      where: and(...conditions),
      orderBy: desc(wifiContributions.createdAt),
      limit: query.limit,
      offset: query.offset,
    });
  },
};
