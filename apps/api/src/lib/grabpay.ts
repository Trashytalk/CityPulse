// apps/api/src/lib/grabpay.ts
import { logger } from '../middleware/logger';
import { env } from './env';

const GRABPAY_API_URL = process.env.GRABPAY_API_URL || 'https://api.grab.com/grabpay/v1';

interface GrabPayPayoutResponse {
  success: boolean;
  txnRef: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  amount: number;
  currency: string;
  createdAt: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Initiate a GrabPay payout
 */
export async function initiateGrabPayPayout(
  amount: number,
  mobileNumber: string,
  referenceId: string
): Promise<GrabPayPayoutResponse> {
  const log = logger.child({ provider: 'grabpay', referenceId });
  
  if (env.NODE_ENV !== 'production') {
    log.warn('Using mock GrabPay payout in non-production');
    return {
      success: true,
      txnRef: `MOCK_GRABPAY_${Date.now()}`,
      status: 'success',
      amount: amount / 100,
      currency: 'PHP',
      createdAt: new Date().toISOString(),
    };
  }
  
  if (!process.env.GRABPAY_API_KEY || !process.env.GRABPAY_MERCHANT_ID) {
    throw new Error('GrabPay credentials not configured');
  }
  
  log.info({ amount, mobileNumber: mobileNumber.slice(-4) }, 'Initiating GrabPay payout');
  
  try {
    const response = await fetch(`${GRABPAY_API_URL}/disbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GRABPAY_API_KEY}`,
        'X-Merchant-ID': process.env.GRABPAY_MERCHANT_ID,
      },
      body: JSON.stringify({
        amount: amount / 100,
        currency: 'PHP',
        recipientPhone: mobileNumber,
        merchantTxnRef: referenceId,
        description: 'CityPulse withdrawal',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      log.error({ status: response.status, data }, 'GrabPay payout failed');
      throw new Error(data.error?.message || 'GrabPay payout failed');
    }
    
    log.info({ txnRef: data.txnRef }, 'GrabPay payout initiated');
    
    return data;
  } catch (error) {
    log.error({ error }, 'GrabPay payout error');
    throw error;
  }
}

/**
 * Check GrabPay payout status
 */
export async function getGrabPayPayoutStatus(txnRef: string): Promise<GrabPayPayoutResponse> {
  if (env.NODE_ENV !== 'production') {
    return {
      success: true,
      txnRef,
      status: 'success',
      amount: 0,
      currency: 'PHP',
      createdAt: new Date().toISOString(),
    };
  }
  
  const response = await fetch(`${GRABPAY_API_URL}/disbursements/${txnRef}`, {
    headers: {
      'Authorization': `Bearer ${process.env.GRABPAY_API_KEY}`,
      'X-Merchant-ID': process.env.GRABPAY_MERCHANT_ID!,
    },
  });
  
  return response.json();
}
