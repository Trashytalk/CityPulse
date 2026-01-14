/**
 * @file types/gamification.ts
 * @description Gamification-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

export type AchievementCategory =
  | 'distance'
  | 'sessions'
  | 'coverage'
  | 'quality'
  | 'social'
  | 'special';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon?: string | null;
  xpReward: number;
  creditReward: number;
  requirement: number;
  requirementType: string;
  isHidden: boolean;
  createdAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  unlockedAt?: Date | null;
  claimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';
export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  code: string;
  name: string;
  description: string;
  type: ChallengeType;
  targetMetric: string;
  targetValue: number;
  xpReward: number;
  creditReward: number;
  cashReward: number;
  startsAt: Date;
  endsAt: Date;
  maxParticipants?: number | null;
  createdAt: Date;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  status: ChallengeStatus;
  joinedAt: Date;
  completedAt?: Date | null;
  claimedAt?: Date | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  value: number;
  level: number;
}

export interface Leaderboard {
  scope: 'global' | 'country' | 'city' | 'friends';
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
  metric: 'xp' | 'distance' | 'sessions' | 'entities';
  entries: LeaderboardEntry[];
  userRank?: number | null;
  userPercentile?: number | null;
}

export interface XpEvent {
  source: 'session' | 'achievement' | 'challenge' | 'streak' | 'referral' | 'bonus';
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}
