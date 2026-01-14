/**
 * @file constants/gamification.ts
 * @description Gamification constants
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

// XP required for each level (level -> XP needed)
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 2));
}

// Get level from total XP
export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

// Level titles
export const LEVEL_TITLES: Record<string, [number, number]> = {
  Newcomer: [1, 4],
  Explorer: [5, 9],
  Mapper: [10, 14],
  Pathfinder: [15, 19],
  Trailblazer: [20, 29],
  Wayfinder: [30, 39],
  Pioneer: [40, 49],
  Legend: [50, Infinity],
};

export function getTitleForLevel(level: number): string {
  for (const [title, [min, max]] of Object.entries(LEVEL_TITLES)) {
    if (level >= min && level <= max) {
      return title;
    }
  }
  return 'Legend';
}

// XP rewards
export const XP_REWARDS = {
  SESSION_BASE: 10,
  SESSION_PER_KM: 5,
  SESSION_QUALITY_BONUS: 0.5, // multiplier for quality score
  SESSION_NOVELTY_BONUS: 10, // per new cell
  ACHIEVEMENT_SMALL: 25,
  ACHIEVEMENT_MEDIUM: 50,
  ACHIEVEMENT_LARGE: 100,
  ACHIEVEMENT_EPIC: 250,
  CHALLENGE_DAILY: 50,
  CHALLENGE_WEEKLY: 150,
  CHALLENGE_MONTHLY: 500,
  STREAK_DAILY: 10,
  STREAK_BONUS_MAX: 100, // cap for streak bonus
  REFERRAL: 50,
  WIFI_CONTRIBUTION: 25,
  WIFI_UNLOCK: 2,
} as const;

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = {
  // Distance achievements
  first_km: { name: 'First Steps', category: 'distance', requirement: 1, xp: 25, credits: 25 },
  marathon: { name: 'Marathon', category: 'distance', requirement: 42, xp: 100, credits: 100 },
  century: { name: 'Century', category: 'distance', requirement: 100, xp: 250, credits: 250 },
  explorer_500: {
    name: 'Explorer 500',
    category: 'distance',
    requirement: 500,
    xp: 500,
    credits: 500,
  },

  // Session achievements
  first_session: {
    name: 'Getting Started',
    category: 'sessions',
    requirement: 1,
    xp: 25,
    credits: 25,
  },
  ten_sessions: { name: 'Regular', category: 'sessions', requirement: 10, xp: 50, credits: 50 },
  fifty_sessions: {
    name: 'Dedicated',
    category: 'sessions',
    requirement: 50,
    xp: 150,
    credits: 150,
  },
  hundred_sessions: {
    name: 'Veteran',
    category: 'sessions',
    requirement: 100,
    xp: 300,
    credits: 300,
  },

  // Streak achievements
  week_streak: {
    name: 'Week Warrior',
    category: 'quality',
    requirement: 7,
    xp: 100,
    credits: 150,
  },
  month_streak: {
    name: 'Monthly Master',
    category: 'quality',
    requirement: 30,
    xp: 300,
    credits: 500,
  },
  hundred_streak: {
    name: 'Unstoppable',
    category: 'quality',
    requirement: 100,
    xp: 1000,
    credits: 1500,
  },

  // Quality achievements
  perfect_score: {
    name: 'Perfectionist',
    category: 'quality',
    requirement: 100,
    xp: 50,
    credits: 50,
  },
  quality_master: {
    name: 'Quality Master',
    category: 'quality',
    requirement: 10,
    xp: 200,
    credits: 200,
  },

  // Social achievements
  first_referral: {
    name: 'Social Starter',
    category: 'social',
    requirement: 1,
    xp: 50,
    credits: 100,
  },
  five_referrals: {
    name: 'Influencer',
    category: 'social',
    requirement: 5,
    xp: 200,
    credits: 500,
  },

  // WiFi achievements
  wifi_hunter: { name: 'WiFi Hunter', category: 'special', requirement: 10, xp: 100, credits: 100 },
  wifi_contributor: {
    name: 'Network Hero',
    category: 'special',
    requirement: 5,
    xp: 150,
    credits: 200,
  },
} as const;
