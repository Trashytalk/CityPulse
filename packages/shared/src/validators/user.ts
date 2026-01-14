/**
 * @file validators/user.ts
 * @description User validation schemas
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

import { z } from 'zod';

export const phoneSchema = z
  .string()
  .regex(/^\+639\d{9}$/, 'Invalid Philippine mobile number');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .nullable();

export const displayNameSchema = z
  .string()
  .min(2, 'Display name must be at least 2 characters')
  .max(50, 'Display name must be at most 50 characters')
  .regex(
    /^[a-zA-Z0-9_\- ]+$/,
    'Display name can only contain letters, numbers, spaces, underscores, and hyphens'
  )
  .optional()
  .nullable();

export const updateProfileSchema = z.object({
  displayName: displayNameSchema,
  bio: z.string().max(500).optional().nullable(),
  primaryCity: z.string().max(100).optional().nullable(),
  preferredLanguage: z.enum(['en', 'fil', 'ceb']).optional(),
  notificationsEnabled: z.boolean().optional(),
});

export const applyReferralCodeSchema = z.object({
  code: z
    .string()
    .length(8, 'Referral code must be 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Invalid referral code format'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ApplyReferralCodeInput = z.infer<typeof applyReferralCodeSchema>;
