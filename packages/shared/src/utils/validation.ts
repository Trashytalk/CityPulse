/**
 * @file utils/validation.ts
 * @description Validation utilities
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

/**
 * Validate Philippine mobile number
 */
export function isValidPhilippinePhone(phone: string): boolean {
  return /^\+639\d{9}$/.test(phone);
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+63${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return `+63${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('639')) {
    return `+${cleaned}`;
  }

  return phone; // Return as-is if can't normalize
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Validate bounding box
 */
export function isValidBoundingBox(
  north: number,
  south: number,
  east: number,
  west: number
): boolean {
  return (
    north > south &&
    isValidCoordinate(north, east) &&
    isValidCoordinate(south, west) &&
    Math.abs(north - south) <= 1 &&
    Math.abs(east - west) <= 1
  );
}

/**
 * Generate random alphanumeric code
 */
export function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
