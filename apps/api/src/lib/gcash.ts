// apps/api/src/lib/gcash.ts
import { logger } from '../middleware/logger';

import { env } from './env';

const GCASH_API_URL = process.env.GCASH_API_URL || 'https://api.gcash.com/v1';

interface GCashPayoutResponse {
  success: boolean;
  referenceNumber: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: {
    currency: string;
    value: number;
  };
  createdAt: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Initiate a GCash payout
 */
export async function initiateGCashPayout(
  amount: number,
  mobileNumber: string,
  referenceId: string
): Promise<GCashPayoutResponse> {
  const log = logger.child({ provider: 'gcash', referenceId });
  
  if (env.NODE_ENV !== 'production') {
    log.warn('Using mock GCash payout in non-production');
    return {
      success: true,
      referenceNumber: `MOCK_GCASH_${Date.now()}`,
      status: 'completed',
      amount: { currency: 'PHP', value: amount / 100 },
      createdAt: new Date().toISOString(),
    };
  }
  
  if (!process.env.GCASH_API_KEY) {
    throw new Error('GCash API key not configured');
  }
  
  log.info({ amount, mobileNumber: mobileNumber.slice(-4) }, 'Initiating GCash payout');
  
  try {
    const response = await fetch(`${GCASH_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GCASH_API_KEY}`,
      },
      body: JSON.stringify({
        amount: { currency: 'PHP', value: amount / 100 },
        recipient: { type: 'MOBILE', value: mobileNumber },
        reference: referenceId,
        description: 'CityPulse withdrawal',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      log.error({ status: response.status, data }, 'GCash payout failed');
      throw new Error(data.error?.message || 'GCash payout failed');
    }
    
    log.info({ referenceNumber: data.referenceNumber }, 'GCash payout initiated');
    
    return data;
  } catch (error) {
    log.error({ error }, 'GCash payout error');
    throw error;
  }
}

/**
 * Check GCash payout status
 */
export async function getGCashPayoutStatus(referenceNumber: string): Promise<GCashPayoutResponse> {
  if (env.NODE_ENV !== 'production') {
    return {
      success: true,
      referenceNumber,
      status: 'completed',
      amount: { currency: 'PHP', value: 0 },
      createdAt: new Date().toISOString(),
    };
  }
  
  const response = await fetch(`${GCASH_API_URL}/transfers/${referenceNumber}`, {
    headers: {
      'Authorization': `Bearer ${process.env.GCASH_API_KEY}`,
    },
  });
  
  return response.json();
}
