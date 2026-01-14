// apps/api/src/modules/payments/service.ts
import { paymentsRepository } from './repository';
import { AppError, ERROR_CODES } from '../../lib/errors';
import type {
  TransactionsQuery,
  EarningsQuery,
  AddPayoutMethodInput,
  WithdrawInput,
  WithdrawalsQuery,
} from './validators';

const MINIMUM_WITHDRAWAL = 5000; // ₱50 in cents
const WITHDRAWAL_FEE_PERCENT = 0; // No fees for now
const DAILY_WITHDRAWAL_LIMIT = 500000; // ₱5,000 per day

function formatCurrency(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function maskAccountIdentifier(provider: string, identifier: string): string {
  if (provider === 'gcash' || provider === 'grabpay') {
    return `***${identifier.slice(-4)}`;
  }
  return `****${identifier.slice(-4)}`;
}

function generateDisplayName(input: AddPayoutMethodInput): string {
  const providerNames: Record<string, string> = {
    gcash: 'GCash',
    grabpay: 'GrabPay',
    bank_transfer: input.bankName || 'Bank',
    paypal: 'PayPal',
  };

  return `${providerNames[input.provider]} ${maskAccountIdentifier(input.provider, input.accountIdentifier)}`;
}

function getTransactionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    session_earning: 'Earnings from collection session',
    achievement_reward: 'Achievement reward',
    challenge_reward: 'Challenge completion reward',
    referral_bonus: 'Referral bonus',
    level_up_bonus: 'Level up bonus',
    wifi_unlock: 'WiFi password unlock',
    wifi_contribution: 'WiFi contribution reward',
    wifi_refund: 'WiFi password refund',
    streak_bonus: 'Streak bonus',
    withdrawal: 'Withdrawal',
  };

  return descriptions[type] || type;
}

export const paymentsService = {
  // ==========================================================================
  // WALLET
  // ==========================================================================
  async createWallet(userId: string) {
    return paymentsRepository.createWallet(userId);
  },

  async getWallet(userId: string) {
    const wallet = await paymentsRepository.getWallet(userId);

    if (!wallet) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);
    }

    return {
      cashBalance: wallet.cashBalance,
      creditBalance: wallet.creditBalance,
      pendingCash: wallet.pendingCash,
      pendingCredits: wallet.pendingCredits,

      formatted: {
        cash: formatCurrency(wallet.cashBalance),
        credits: formatNumber(wallet.creditBalance),
        pending: formatCurrency(wallet.pendingCash),
      },

      withdrawable: wallet.cashBalance - wallet.pendingCash,
      canWithdraw: (wallet.cashBalance - wallet.pendingCash) >= MINIMUM_WITHDRAWAL,
      minimumWithdrawal: MINIMUM_WITHDRAWAL,
    };
  },

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================
  async getTransactions(userId: string, query: TransactionsQuery) {
    const { transactions, total } = await paymentsRepository.getTransactions(userId, query);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        currency: t.currency,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        reference: t.referenceType ? {
          type: t.referenceType,
          id: t.referenceId,
        } : null,
        createdAt: t.createdAt,

        formatted: {
          amount: t.amount >= 0
            ? `+${t.currency === 'cash' ? formatCurrency(t.amount) : formatNumber(t.amount)}`
            : `${t.currency === 'cash' ? formatCurrency(t.amount) : formatNumber(t.amount)}`,
        },
      })),

      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + transactions.length < total,
      },
    };
  },

  // ==========================================================================
  // EARNINGS
  // ==========================================================================
  async getEarningsSummary(userId: string, query: EarningsQuery) {
    const earnings = await paymentsRepository.getEarningsSummary(userId, query.period);
    const wallet = await paymentsRepository.getWallet(userId);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      period: query.period,

      cash: {
        earned: earnings.cashEarned,
        withdrawn: earnings.cashWithdrawn,
        pending: wallet?.pendingCash || 0,
      },

      credits: {
        earned: earnings.creditsEarned,
        spent: earnings.creditsSpent,
      },

      breakdown: {
        sessions: earnings.fromSessions,
        achievements: earnings.fromAchievements,
        challenges: earnings.fromChallenges,
        referrals: earnings.fromReferrals,
        other: earnings.fromOther,
      },

      comparison: {
        previousPeriod: earnings.previousPeriod,
        change: calculateChange(earnings.cashEarned, earnings.previousPeriod),
      },
    };
  },

  // ==========================================================================
  // CREDIT/DEBIT OPERATIONS
  // ==========================================================================
  async creditEarnings(
    userId: string,
    earnings: { cash: number; credits: number; sessionId: string; breakdown: unknown }
  ) {
    const wallet = await paymentsRepository.getWallet(userId);
    if (!wallet) throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);

    // Credit cash
    if (earnings.cash > 0) {
      await paymentsRepository.creditCash(userId, wallet.id, earnings.cash, {
        type: 'session_earning',
        referenceType: 'session',
        referenceId: earnings.sessionId,
        description: 'Earnings from collection session',
        metadata: earnings.breakdown,
      });
    }

    // Credit credits
    if (earnings.credits > 0) {
      await paymentsRepository.creditCredits(userId, wallet.id, earnings.credits, {
        type: 'session_earning',
        referenceType: 'session',
        referenceId: earnings.sessionId,
        description: 'Credits from collection session',
      });
    }
  },

  async creditCash(userId: string, amount: number, type: string, metadata?: unknown) {
    const wallet = await paymentsRepository.getWallet(userId);
    if (!wallet) throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);

    await paymentsRepository.creditCash(userId, wallet.id, amount, {
      type,
      metadata,
      description: getTransactionDescription(type),
    });
  },

  async creditCredits(userId: string, amount: number, type: string, metadata?: unknown) {
    const wallet = await paymentsRepository.getWallet(userId);
    if (!wallet) throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);

    await paymentsRepository.creditCredits(userId, wallet.id, amount, {
      type,
      metadata,
      description: getTransactionDescription(type),
    });
  },

  async deductCredits(userId: string, amount: number, type: string, metadata?: unknown) {
    const wallet = await paymentsRepository.getWallet(userId);
    if (!wallet) throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);

    if (wallet.creditBalance < amount) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Insufficient credit balance', 400);
    }

    await paymentsRepository.deductCredits(userId, wallet.id, amount, {
      type,
      metadata,
      description: getTransactionDescription(type),
    });
  },

  async creditReferralBonus(userId: string, amount: number, type: string) {
    await this.creditCredits(userId, amount, type);
  },

  // ==========================================================================
  // PAYOUT METHODS
  // ==========================================================================
  async getPayoutMethods(userId: string) {
    const methods = await paymentsRepository.getPayoutMethods(userId);

    return {
      methods: methods.map(m => ({
        id: m.id,
        provider: m.provider,
        displayName: m.displayName,
        accountIdentifier: maskAccountIdentifier(m.provider, m.accountIdentifier),
        isDefault: m.isDefault,
        isVerified: m.isVerified,
        createdAt: m.createdAt,
      })),
      availableProviders: [
        { id: 'gcash', name: 'GCash', icon: 'gcash', minAmount: 5000 },
        { id: 'grabpay', name: 'GrabPay', icon: 'grabpay', minAmount: 5000 },
        { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bank', minAmount: 10000 },
      ],
    };
  },

  async addPayoutMethod(userId: string, input: AddPayoutMethodInput) {
    // Validate based on provider
    if (input.provider === 'gcash' || input.provider === 'grabpay') {
      if (!/^\+?639\d{9}$/.test(input.accountIdentifier.replace(/\s/g, ''))) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid Philippine phone number', 400);
      }
    }

    if (input.provider === 'bank_transfer' && !input.bankCode) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Bank code is required for bank transfers', 400);
    }

    // Check for duplicates
    const existing = await paymentsRepository.findPayoutMethod(userId, input.provider, input.accountIdentifier);
    if (existing) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'This payout method already exists', 400);
    }

    // Create method
    const method = await paymentsRepository.createPayoutMethod(userId, {
      provider: input.provider,
      accountIdentifier: input.accountIdentifier,
      displayName: generateDisplayName(input),
      metadata: {
        bankCode: input.bankCode,
        bankName: input.bankName,
        accountName: input.accountName,
      },
    });

    // Set as default if first method
    const count = await paymentsRepository.countPayoutMethods(userId);
    if (count === 1) {
      await paymentsRepository.setDefaultMethod(userId, method.id);
    }

    return {
      id: method.id,
      provider: method.provider,
      displayName: method.displayName,
      isDefault: count === 1,
    };
  },

  async removePayoutMethod(userId: string, methodId: string) {
    const method = await paymentsRepository.getPayoutMethod(userId, methodId);

    if (!method) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Payout method not found', 404);
    }

    // Check for pending withdrawals
    const pendingCount = await paymentsRepository.countPendingWithdrawals(userId, methodId);
    if (pendingCount > 0) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot remove method with pending withdrawals', 400);
    }

    await paymentsRepository.deletePayoutMethod(methodId);
  },

  async setDefaultPayoutMethod(userId: string, methodId: string) {
    const method = await paymentsRepository.getPayoutMethod(userId, methodId);

    if (!method) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Payout method not found', 404);
    }

    await paymentsRepository.setDefaultMethod(userId, methodId);
  },

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================
  async requestWithdrawal(userId: string, input: WithdrawInput) {
    const wallet = await paymentsRepository.getWallet(userId);
    if (!wallet) throw new AppError(ERROR_CODES.NOT_FOUND, 'Wallet not found', 404);

    // Validate amount
    if (input.amount < MINIMUM_WITHDRAWAL) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Minimum withdrawal is ${formatCurrency(MINIMUM_WITHDRAWAL)}`,
        400
      );
    }

    const available = wallet.cashBalance - wallet.pendingCash;
    if (input.amount > available) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Available balance is ${formatCurrency(available)}`,
        400
      );
    }

    // Check daily limit
    const todayTotal = await paymentsRepository.getTodayWithdrawalTotal(userId);
    if (todayTotal + input.amount > DAILY_WITHDRAWAL_LIMIT) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Daily withdrawal limit is ${formatCurrency(DAILY_WITHDRAWAL_LIMIT)}`,
        400
      );
    }

    // Validate payout method
    const method = await paymentsRepository.getPayoutMethod(userId, input.payoutMethodId);
    if (!method) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Payout method not found', 404);
    }

    // Calculate fee
    const fee = Math.floor(input.amount * WITHDRAWAL_FEE_PERCENT / 100);
    const netAmount = input.amount - fee;

    // Create withdrawal
    const withdrawal = await paymentsRepository.createWithdrawal({
      userId,
      walletId: wallet.id,
      payoutMethodId: method.id,
      amount: input.amount,
      fee,
      netAmount,
      status: 'pending',
    });

    // Update pending balance
    await paymentsRepository.updatePendingCash(userId, wallet.pendingCash + input.amount);

    return {
      id: withdrawal.id,
      amount: input.amount,
      fee,
      netAmount,
      status: 'pending',
      estimatedArrival: '1-3 business days',
      method: {
        provider: method.provider,
        displayName: method.displayName,
      },
    };
  },

  async getWithdrawals(userId: string, query: WithdrawalsQuery) {
    const { withdrawals, total } = await paymentsRepository.getWithdrawals(userId, query);

    return {
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: w.amount,
        fee: w.fee,
        netAmount: w.netAmount,
        status: w.status,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        completedAt: w.completedAt,
        failureReason: w.failureReason,

        formatted: {
          amount: formatCurrency(w.amount),
          netAmount: formatCurrency(w.netAmount),
        },
      })),

      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + withdrawals.length < total,
      },
    };
  },

  async getWithdrawalDetail(userId: string, withdrawalId: string) {
    const withdrawal = await paymentsRepository.getWithdrawal(userId, withdrawalId);

    if (!withdrawal) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Withdrawal not found', 404);
    }

    return {
      id: withdrawal.id,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      netAmount: withdrawal.netAmount,
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt,
      completedAt: withdrawal.completedAt,
      failureReason: withdrawal.failureReason,
      retryCount: withdrawal.retryCount,

      formatted: {
        amount: formatCurrency(withdrawal.amount),
        fee: formatCurrency(withdrawal.fee),
        netAmount: formatCurrency(withdrawal.netAmount),
      },
    };
  },
};
