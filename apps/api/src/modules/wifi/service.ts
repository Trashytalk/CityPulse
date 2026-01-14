// apps/api/src/modules/wifi/service.ts
import { wifiRepository } from './repository';
import { AppError, ERROR_CODES } from '../../lib/errors';
import { encrypt, decrypt } from '../../lib/encryption';
import { calculateH3Index } from '../../lib/geo';
import type { NearbyQuery, ContributeInput, ContributionsQuery } from './validators';

const DEFAULT_UNLOCK_COST = 50; // Credits

function calculateSuccessRate(network: { successCount: number; failCount: number }): number {
  const total = network.successCount + network.failCount;
  return total > 0 ? Math.round((network.successCount / total) * 100) : 0;
}

function generateBssidHash(ssid: string, lat: number, lng: number): string {
  // Generate a pseudo-BSSID based on location and SSID
  const hash = `${ssid}_${lat.toFixed(6)}_${lng.toFixed(6)}`;
  return Buffer.from(hash).toString('base64').slice(0, 17);
}

export const wifiService = {
  // ==========================================================================
  // FIND NEARBY
  // ==========================================================================
  async findNearby(userId: string, query: NearbyQuery) {
    const networks = await wifiRepository.findNearby(
      query.lat,
      query.lng,
      query.radius,
      query
    );

    // Get user's unlocked networks
    const userUnlocks = await wifiRepository.getUserUnlockedNetworkIds(userId);
    const unlockedSet = new Set(userUnlocks);

    return {
      networks: networks.map(network => ({
        id: network.id,
        ssid: network.ssid,

        location: {
          latitude: network.latitude,
          longitude: network.longitude,
          distance: network.distance,
        },

        venue: {
          name: network.venueName,
          type: network.venueType,
          address: network.address,
        },

        hasPassword: network.hasPassword,
        isUnlocked: unlockedSet.has(network.id),
        unlockCost: network.unlockCost,

        quality: {
          freshnessScore: network.freshnessScore,
          verificationScore: network.verificationScore,
          successRate: calculateSuccessRate(network),
          lastVerified: network.lastVerifiedAt,
        },

        security: network.security,
      })),

      searchArea: {
        center: { lat: query.lat, lng: query.lng },
        radius: query.radius,
      },

      totalFound: networks.length,
    };
  },

  // ==========================================================================
  // GET NETWORK DETAIL
  // ==========================================================================
  async getNetworkDetail(userId: string, networkId: string) {
    const network = await wifiRepository.getNetwork(networkId);

    if (!network) {
      throw new AppError(ERROR_CODES.NETWORK_NOT_FOUND, 'Network not found', 404);
    }

    const isUnlocked = await wifiRepository.hasUserUnlocked(userId, networkId);

    return {
      id: network.id,
      ssid: network.ssid,

      location: {
        latitude: network.latitude,
        longitude: network.longitude,
      },

      venue: {
        name: network.venueName,
        type: network.venueType,
        address: network.address,
      },

      hasPassword: network.hasPassword,
      isUnlocked,
      password: isUnlocked && network.encryptedPassword
        ? await decrypt(network.encryptedPassword)
        : null,
      unlockCost: network.unlockCost,

      quality: {
        freshnessScore: network.freshnessScore,
        verificationScore: network.verificationScore,
        successRate: calculateSuccessRate(network),
        reportCount: network.reportCount,
        successCount: network.successCount,
        failCount: network.failCount,
        lastVerified: network.lastVerifiedAt,
      },

      security: network.security,

      // Show contribution info if user contributed
      contribution: network.contributedBy === userId ? {
        contributedAt: network.createdAt,
        status: 'approved',
      } : null,
    };
  },

  // ==========================================================================
  // UNLOCK PASSWORD
  // ==========================================================================
  async unlockPassword(userId: string, networkId: string) {
    const network = await wifiRepository.getNetwork(networkId);

    if (!network) {
      throw new AppError(ERROR_CODES.NETWORK_NOT_FOUND, 'Network not found', 404);
    }

    if (!network.hasPassword || !network.encryptedPassword) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This network has no stored password', 400);
    }

    // Check if already unlocked
    const alreadyUnlocked = await wifiRepository.hasUserUnlocked(userId, networkId);
    if (alreadyUnlocked) {
      // Return password without charging
      const password = await decrypt(network.encryptedPassword);
      return {
        success: true,
        password,
        alreadyUnlocked: true,
        cost: 0,
      };
    }

    // Check credit balance
    const { paymentsService } = await import('../payments/service');
    const wallet = await paymentsService.getWallet(userId);
    const cost = network.unlockCost || DEFAULT_UNLOCK_COST;

    if (wallet.creditBalance < cost) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Need ${cost} credits, you have ${wallet.creditBalance}`,
        400
      );
    }

    // Deduct credits
    await paymentsService.deductCredits(userId, cost, 'wifi_unlock', {
      networkId,
      ssid: network.ssid,
    });

    // Record unlock
    await wifiRepository.recordUnlock(userId, networkId, cost);

    // Decrypt password
    const password = await decrypt(network.encryptedPassword);

    // Award XP for exploring
    const { gamificationService } = await import('../gamification/service');
    await gamificationService.awardXp(userId, 2, 'wifi_unlock');

    return {
      success: true,
      password,
      alreadyUnlocked: false,
      cost,
      message: `Unlocked for ${cost} credits`,
    };
  },

  // ==========================================================================
  // SUBMIT FEEDBACK
  // ==========================================================================
  async submitFeedback(
    userId: string,
    networkId: string,
    success: boolean,
    comment?: string
  ) {
    // Check user has unlocked this network
    const unlock = await wifiRepository.getUnlock(userId, networkId);

    if (!unlock) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'You have not unlocked this network', 400);
    }

    if (unlock.feedbackGiven) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Feedback already submitted', 400);
    }

    // Record feedback
    await wifiRepository.recordFeedback(userId, networkId, success, comment);

    // Update network stats
    await wifiRepository.updateNetworkStats(networkId, success);

    // If password failed, update freshness score
    if (!success) {
      await wifiRepository.decreaseFreshnessScore(networkId);
    }

    // Award XP for feedback
    const { gamificationService } = await import('../gamification/service');
    await gamificationService.awardXp(userId, 3, 'wifi_feedback');

    // If password failed and freshness too low, potentially refund credits
    const network = await wifiRepository.getNetwork(networkId);
    if (!success && network && network.freshnessScore < 0.3) {
      // Refund half the credits
      const refund = Math.floor(unlock.creditsCost / 2);
      if (refund > 0) {
        const { paymentsService } = await import('../payments/service');
        await paymentsService.creditCredits(userId, refund, 'wifi_refund', {
          networkId,
          reason: 'outdated_password',
        });
      }

      return {
        success: true,
        message: 'Thanks for the feedback! We refunded some credits since the password was outdated.',
        refunded: refund,
      };
    }

    return {
      success: true,
      message: 'Thanks for the feedback!',
    };
  },

  // ==========================================================================
  // CONTRIBUTE
  // ==========================================================================
  async contribute(userId: string, input: ContributeInput) {
    // Check for duplicate (same SSID within 50m)
    const existing = await wifiRepository.findDuplicate(
      input.ssid,
      input.latitude,
      input.longitude,
      50 // meters
    );

    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'A network with this name already exists at this location',
        400
      );
    }

    // Calculate H3 index
    const h3Index = calculateH3Index(input.latitude, input.longitude);

    // Encrypt password
    const encryptedPassword = await encrypt(input.password);

    // Create contribution
    const contribution = await wifiRepository.createContribution({
      userId,
      ssid: input.ssid,
      password: encryptedPassword,
      latitude: input.latitude,
      longitude: input.longitude,
      h3Index,
      venueName: input.venueName,
      venueType: input.venueType,
      notes: input.notes,
      status: 'pending',
    });

    // Auto-approve for now (could add verification queue later)
    await this.approveContribution(contribution.id);

    return {
      success: true,
      contributionId: contribution.id,
      status: 'approved',
      reward: {
        credits: 100,
        message: 'Thanks for contributing! You earned 100 credits.',
      },
    };
  },

  async approveContribution(contributionId: string) {
    const contribution = await wifiRepository.getContribution(contributionId);
    if (!contribution) return;

    // Create network entry
    await wifiRepository.createNetwork({
      ssid: contribution.ssid,
      bssid: generateBssidHash(contribution.ssid, contribution.latitude, contribution.longitude),
      encryptedPassword: contribution.password,
      hasPassword: true,
      latitude: contribution.latitude,
      longitude: contribution.longitude,
      h3Index: calculateH3Index(contribution.latitude, contribution.longitude),
      venueName: contribution.venueName || undefined,
      venueType: contribution.venueType || undefined,
      contributedBy: contribution.userId,
      freshnessScore: 1.0,
      verificationScore: 0.5,
      unlockCost: DEFAULT_UNLOCK_COST,
    });

    // Update contribution status
    await wifiRepository.updateContribution(contributionId, {
      status: 'approved',
      reviewedAt: new Date(),
    });

    // Award credits
    const { paymentsService } = await import('../payments/service');
    await paymentsService.creditCredits(
      contribution.userId,
      100,
      'wifi_contribution',
      { contributionId }
    );

    // Award XP
    const { gamificationService } = await import('../gamification/service');
    await gamificationService.awardXp(
      contribution.userId,
      25,
      'wifi_contribution_approved'
    );

    // Check for WiFi contributor achievement
    await gamificationService.checkAchievement(contribution.userId, 'wifi_contributor');
  },

  // ==========================================================================
  // USER HISTORY
  // ==========================================================================
  async getUserContributions(userId: string, query: ContributionsQuery) {
    const contributions = await wifiRepository.getUserContributions(userId, query);

    return {
      contributions: contributions.map(c => ({
        id: c.id,
        ssid: c.ssid,
        venueName: c.venueName,
        status: c.status,
        rewardCredits: c.status === 'approved' ? 100 : 0,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt,
      })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    };
  },

  async getUserUnlocks(userId: string) {
    const unlocks = await wifiRepository.getUserUnlocks(userId);

    return {
      unlocks: unlocks.map(u => ({
        id: u.id,
        networkId: u.networkId,
        ssid: u.network?.ssid,
        creditsCost: u.creditsCost,
        feedbackGiven: u.feedbackGiven,
        feedbackSuccess: u.feedbackSuccess,
        unlockedAt: u.unlockedAt,
      })),
    };
  },
};
