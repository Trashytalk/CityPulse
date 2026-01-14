/**
 * @file types/user.ts
 * @description User-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  primaryCity?: string | null;
  preferredLanguage: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgression {
  id: string;
  userId: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: Date | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfile extends User {
  profile: UserProfile | null;
  progression: UserProgression | null;
  wallet: Wallet | null;
}

export interface Wallet {
  id: string;
  userId: string;
  cashBalance: number; // in cents
  creditBalance: number;
  pendingCash: number;
  totalCashEarned: number;
  totalCreditsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  collection: {
    totalSessions: number;
    totalDistanceKm: number;
    totalDurationSeconds: number;
    totalFrames: number;
    averageQualityScore: number;
  };
  progression: {
    level: number;
    totalXp: number;
    title: string;
    achievementsUnlocked: number;
    totalAchievements: number;
    currentStreak: number;
  };
  earnings: {
    totalCashEarned: number;
    totalCreditsEarned: number;
    totalWithdrawn: number;
    thisWeek: number;
    thisMonth: number;
  };
  coverage: {
    cellsCollected: number;
    uniqueAreas: number;
  };
}
