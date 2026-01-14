/**
 * @file types/payment.ts
 * @description Payment-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

export type Currency = 'cash' | 'credits';
export type TransactionType =
  | 'earning'
  | 'withdrawal'
  | 'refund'
  | 'bonus'
  | 'purchase'
  | 'transfer';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  currency: Currency;
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export type PayoutProvider = 'gcash' | 'grabpay' | 'bank_transfer' | 'paypal';
export type PayoutMethodStatus = 'active' | 'inactive' | 'verification_required';

export interface PayoutMethod {
  id: string;
  userId: string;
  provider: PayoutProvider;
  accountIdentifier: string; // encrypted
  displayName: string; // masked, e.g., "GCash ***1234"
  isDefault: boolean;
  status: PayoutMethodStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Withdrawal {
  id: string;
  userId: string;
  walletId: string;
  payoutMethodId: string;
  amount: number; // in cents
  fee: number;
  netAmount: number;
  status: WithdrawalStatus;
  providerReference?: string | null;
  failureReason?: string | null;
  requestedAt: Date;
  processedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface EarningsSummary {
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  totalCash: number;
  totalCredits: number;
  breakdown: {
    sessions: number;
    achievements: number;
    challenges: number;
    referrals: number;
    bonuses: number;
  };
  comparison?: {
    previousPeriod: number;
    percentChange: number;
  };
}
