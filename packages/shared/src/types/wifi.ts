/**
 * @file types/wifi.ts
 * @description WiFi-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

export type VenueType =
  | 'cafe'
  | 'restaurant'
  | 'hotel'
  | 'mall'
  | 'coworking'
  | 'library'
  | 'airport'
  | 'public'
  | 'other';

export interface WifiNetwork {
  id: string;
  ssid: string;
  bssid?: string | null;
  latitude: number;
  longitude: number;
  h3Index: string;
  hasPassword: boolean;
  encryptedPassword?: string | null;
  venueType?: VenueType | null;
  venueName?: string | null;
  unlockCost: number;
  freshnessScore: number;
  verificationScore: number;
  successCount: number;
  failCount: number;
  contributorId?: string | null;
  isVerified: boolean;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WifiNetworkWithDistance extends WifiNetwork {
  distance: number; // in meters
  isUnlocked: boolean;
}

export interface WifiUnlock {
  id: string;
  userId: string;
  networkId: string;
  unlockedAt: Date;
  creditsCost: number;
}

export interface WifiContribution {
  id: string;
  userId: string;
  networkId: string;
  contributedAt: Date;
  creditsEarned: number;
  xpEarned: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface WifiFeedback {
  id: string;
  userId: string;
  networkId: string;
  unlockId: string;
  success: boolean;
  comment?: string | null;
  createdAt: Date;
}
