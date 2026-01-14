/**
 * @file constants/payment.ts
 * @description Payment constants
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

// Withdrawal limits
export const WITHDRAWAL = {
  MIN_AMOUNT: 5000, // ₱50 in cents
  MAX_AMOUNT: 500000, // ₱5,000 in cents
  DAILY_LIMIT: 500000, // ₱5,000 per day
  FEE_PERCENT: 0, // Currently no fees
  PROCESSING_DELAY_MS: 60000, // 1 minute delay before processing
} as const;

// Earning rates (in cents per unit)
export const EARNING_RATES = {
  // Per kilometer rates by mode
  PASSIVE_PER_KM: 1, // ₱0.01
  DASHCAM_PER_KM: 10, // ₱0.10
  EXPLORE_PER_KM: 25, // ₱0.25

  // Quality multipliers
  QUALITY_EXCELLENT: 1.5, // 90-100%
  QUALITY_GOOD: 1.2, // 70-89%
  QUALITY_AVERAGE: 1.0, // 50-69%
  QUALITY_POOR: 0.7, // 30-49%

  // Bonuses
  NOVELTY_BONUS: 0.5, // +50% for new coverage
  ENTITY_BONUS_MAX: 0.3, // up to +30% for entity discoveries

  // Credit conversion
  CREDITS_PER_PESO: 10, // 10 credits per ₱1 earned
} as const;

// WiFi costs
export const WIFI = {
  DEFAULT_UNLOCK_COST: 50, // 50 credits
  CONTRIBUTION_REWARD_CREDITS: 100,
  CONTRIBUTION_REWARD_XP: 25,
  FEEDBACK_REFUND_THRESHOLD: 0.3, // Refund if freshnessScore < 30%
  FEEDBACK_REFUND_PERCENT: 0.5, // 50% refund
} as const;

// Transaction descriptions
export const TRANSACTION_DESCRIPTIONS = {
  SESSION_EARNING: 'Collection session earnings',
  ACHIEVEMENT_REWARD: 'Achievement reward',
  CHALLENGE_REWARD: 'Challenge completion reward',
  REFERRAL_BONUS: 'Referral bonus',
  WIFI_UNLOCK: 'WiFi password unlock',
  WIFI_CONTRIBUTION: 'WiFi password contribution reward',
  WITHDRAWAL: 'Withdrawal to {method}',
  REFUND: 'Refund for {reason}',
} as const;
