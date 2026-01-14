/**
 * @file utils/format.ts
 * @description Formatting utilities
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

/**
 * Format amount in cents to currency string
 */
export function formatCurrency(cents: number, currency = 'PHP'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format credits with suffix
 */
export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} PC`;
}

/**
 * Format distance in meters to km
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format phone number for display (mask middle digits)
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  const last4 = phone.slice(-4);
  const countryCode = phone.slice(0, 3);
  return `${countryCode}*****${last4}`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Generate display name for payout method
 */
export function formatPayoutMethodDisplay(provider: string, identifier: string): string {
  const last4 = identifier.slice(-4);
  const providerNames: Record<string, string> = {
    gcash: 'GCash',
    grabpay: 'GrabPay',
    bank_transfer: 'Bank',
    paypal: 'PayPal',
  };
  return `${providerNames[provider] || provider} ***${last4}`;
}
