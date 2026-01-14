// apps/api/src/lib/otp.ts
import { authenticator } from 'otplib';
import { createHash } from 'crypto';
import { env } from './env';
import { redis } from './redis';

// Configure TOTP
authenticator.options = {
  digits: 6,
  step: env.OTP_EXPIRY_MINUTES * 60, // Convert to seconds
  window: 1, // Allow 1 step before/after for clock drift
};

// Generate a unique secret for each phone number
function getSecretForPhone(phone: string): string {
  const hash = createHash('sha256')
    .update(`${env.OTP_SECRET}:${phone}`)
    .digest('hex');
  return hash.slice(0, 32);
}

// Redis key for OTP attempt tracking
function getAttemptKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

function getOtpKey(phone: string): string {
  return `otp:code:${phone}`;
}

/**
 * Generate OTP for a phone number
 */
export async function generateOTP(phone: string): Promise<string> {
  // Check rate limit (max 3 OTPs per 10 minutes)
  const attemptKey = getAttemptKey(phone);
  const attempts = await redis.incr(attemptKey);
  
  if (attempts === 1) {
    await redis.expire(attemptKey, 600); // 10 minutes
  }
  
  if (attempts > 3) {
    throw new Error('Too many OTP requests. Please wait 10 minutes.');
  }

  // Generate OTP
  const secret = getSecretForPhone(phone);
  const otp = authenticator.generate(secret);
  
  // Store OTP with expiry (for verification)
  const otpKey = getOtpKey(phone);
  await redis.setex(otpKey, env.OTP_EXPIRY_MINUTES * 60, otp);
  
  return otp;
}

/**
 * Verify OTP for a phone number
 */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  // Get stored OTP
  const otpKey = getOtpKey(phone);
  const storedOtp = await redis.get(otpKey);
  
  if (!storedOtp) {
    return false; // OTP expired or not found
  }
  
  // Verify
  const isValid = storedOtp === code;
  
  if (isValid) {
    // Delete OTP after successful verification
    await redis.del(otpKey);
    // Clear attempt counter
    await redis.del(getAttemptKey(phone));
  }
  
  return isValid;
}

/**
 * Generate OTP for development/testing (always returns same code)
 */
export function generateDevOTP(): string {
  return '123456';
}

/**
 * Check if phone is using dev mode
 */
export function isDevPhone(phone: string): boolean {
  const devPhones = ['+639000000000', '+639000000001', '+639000000002'];
  return env.NODE_ENV === 'development' && devPhones.includes(phone);
}
