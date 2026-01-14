// apps/api/src/modules/auth/validators.ts
import { z } from 'zod';

// Phone number validation (E.164 format)
const phoneRegex = /^\+[1-9]\d{1,14}$/;

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format. Use E.164 format (e.g., +639171234567)'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format'),
  code: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

// Types
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
