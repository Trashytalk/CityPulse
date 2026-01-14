// apps/api/src/modules/payments/repository.ts
import { db } from '@citypulse/db';
import { wallets, transactions, payoutMethods, withdrawals } from '@citypulse/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

import type { TransactionsQuery, WithdrawalsQuery } from './validators';

export const paymentsRepository = {
  // ==========================================================================
  // WALLET OPERATIONS
  // ==========================================================================
  async createWallet(userId: string) {
    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        cashBalance: 0,
        creditBalance: 0,
        totalCashEarned: 0,
        totalCreditsEarned: 0,
        totalCashWithdrawn: 0,
        totalCreditsSpent: 0,
        pendingCash: 0,
        pendingCredits: 0,
      })
      .returning();

    return wallet;
  },

  async getWallet(userId: string) {
    return db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });
  },

  async updatePendingCash(userId: string, pendingCash: number) {
    await db
      .update(wallets)
      .set({ pendingCash, updatedAt: new Date() })
      .where(eq(wallets.userId, userId));
  },

  // ==========================================================================
  // CREDIT/DEBIT OPERATIONS
  // ==========================================================================
  async creditCash(userId: string, walletId: string, amount: number, data: {
    type: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: unknown;
  }) {
    // Update wallet balance
    const [updated] = await db
      .update(wallets)
      .set({
        cashBalance: sql`${wallets.cashBalance} + ${amount}`,
        totalCashEarned: sql`${wallets.totalCashEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();

    // Create transaction
    await db
      .insert(transactions)
      .values({
        userId,
        walletId,
        type: data.type,
        currency: 'cash',
        amount,
        balanceAfter: updated.cashBalance,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        metadata: data.metadata,
      });

    return updated;
  },

  async creditCredits(userId: string, walletId: string, amount: number, data: {
    type: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: unknown;
  }) {
    // Update wallet balance
    const [updated] = await db
      .update(wallets)
      .set({
        creditBalance: sql`${wallets.creditBalance} + ${amount}`,
        totalCreditsEarned: sql`${wallets.totalCreditsEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();

    // Create transaction
    await db
      .insert(transactions)
      .values({
        userId,
        walletId,
        type: data.type,
        currency: 'credits',
        amount,
        balanceAfter: updated.creditBalance,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        metadata: data.metadata,
      });

    return updated;
  },

  async deductCredits(userId: string, walletId: string, amount: number, data: {
    type: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: unknown;
  }) {
    // Update wallet balance
    const [updated] = await db
      .update(wallets)
      .set({
        creditBalance: sql`${wallets.creditBalance} - ${amount}`,
        totalCreditsSpent: sql`${wallets.totalCreditsSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();

    // Create transaction (negative amount)
    await db
      .insert(transactions)
      .values({
        userId,
        walletId,
        type: data.type,
        currency: 'credits',
        amount: -amount,
        balanceAfter: updated.creditBalance,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        metadata: data.metadata,
      });

    return updated;
  },

  // ==========================================================================
  // TRANSACTION OPERATIONS
  // ==========================================================================
  async getTransactions(userId: string, query: TransactionsQuery) {
    const conditions = [eq(transactions.userId, userId)];

    if (query.currency && query.currency !== 'all') {
      conditions.push(eq(transactions.currency, query.currency));
    }

    if (query.type) {
      conditions.push(eq(transactions.type, query.type));
    }

    if (query.startDate) {
      conditions.push(gte(transactions.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(transactions.createdAt, new Date(query.endDate)));
    }

    const result = await db.query.transactions.findMany({
      where: and(...conditions),
      orderBy: desc(transactions.createdAt),
      limit: query.limit,
      offset: query.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));

    return { transactions: result, total: Number(count) };
  },

  // ==========================================================================
  // EARNINGS OPERATIONS
  // ==========================================================================
  async getEarningsSummary(userId: string, period: string) {
    const periodStart = getPeriodStart(period);

    const conditions = [eq(transactions.userId, userId)];
    if (periodStart) {
      conditions.push(gte(transactions.createdAt, periodStart));
    }

    const [cashEarnings] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(transactions)
      .where(and(
        ...conditions,
        eq(transactions.currency, 'cash'),
        sql`amount > 0`
      ));

    const [creditEarnings] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(transactions)
      .where(and(
        ...conditions,
        eq(transactions.currency, 'credits'),
        sql`amount > 0`
      ));

    const [creditSpent] = await db
      .select({ total: sql<number>`coalesce(sum(abs(amount)), 0)` })
      .from(transactions)
      .where(and(
        ...conditions,
        eq(transactions.currency, 'credits'),
        sql`amount < 0`
      ));

    return {
      cashEarned: Number(cashEarnings?.total) || 0,
      cashWithdrawn: 0, // TODO: calculate from withdrawals
      creditsEarned: Number(creditEarnings?.total) || 0,
      creditsSpent: Number(creditSpent?.total) || 0,
      fromSessions: 0,
      fromAchievements: 0,
      fromChallenges: 0,
      fromReferrals: 0,
      fromOther: 0,
      previousPeriod: 0,
    };
  },

  async getUserEarningsStats(userId: string) {
    const wallet = await this.getWallet(userId);

    return {
      totalCashEarned: wallet?.totalCashEarned || 0,
      totalCreditsEarned: wallet?.totalCreditsEarned || 0,
      totalCashWithdrawn: wallet?.totalCashWithdrawn || 0,
      totalCreditsSpent: wallet?.totalCreditsSpent || 0,
    };
  },

  // ==========================================================================
  // PAYOUT METHODS
  // ==========================================================================
  async getPayoutMethods(userId: string) {
    return db.query.payoutMethods.findMany({
      where: eq(payoutMethods.userId, userId),
      orderBy: desc(payoutMethods.createdAt),
    });
  },

  async getPayoutMethod(userId: string, methodId: string) {
    return db.query.payoutMethods.findFirst({
      where: and(
        eq(payoutMethods.id, methodId),
        eq(payoutMethods.userId, userId)
      ),
    });
  },

  async findPayoutMethod(userId: string, provider: string, accountIdentifier: string) {
    return db.query.payoutMethods.findFirst({
      where: and(
        eq(payoutMethods.userId, userId),
        eq(payoutMethods.provider, provider),
        eq(payoutMethods.accountIdentifier, accountIdentifier)
      ),
    });
  },

  async createPayoutMethod(userId: string, data: {
    provider: string;
    accountIdentifier: string;
    displayName?: string;
    metadata?: unknown;
  }) {
    const [method] = await db
      .insert(payoutMethods)
      .values({
        userId,
        ...data,
      })
      .returning();

    return method;
  },

  async setDefaultMethod(userId: string, methodId: string) {
    // Reset all to non-default
    await db
      .update(payoutMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(payoutMethods.userId, userId));

    // Set the one as default
    await db
      .update(payoutMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(payoutMethods.id, methodId));
  },

  async deletePayoutMethod(methodId: string) {
    await db
      .delete(payoutMethods)
      .where(eq(payoutMethods.id, methodId));
  },

  async countPayoutMethods(userId: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payoutMethods)
      .where(eq(payoutMethods.userId, userId));

    return Number(result?.count) || 0;
  },

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================
  async createWithdrawal(data: {
    userId: string;
    walletId: string;
    payoutMethodId: string;
    amount: number;
    fee: number;
    netAmount: number;
    status: string;
  }) {
    const [withdrawal] = await db
      .insert(withdrawals)
      .values(data)
      .returning();

    return withdrawal;
  },

  async getWithdrawals(userId: string, query: WithdrawalsQuery) {
    const conditions = [eq(withdrawals.userId, userId)];

    if (query.status && query.status !== 'all') {
      conditions.push(eq(withdrawals.status, query.status));
    }

    const result = await db.query.withdrawals.findMany({
      where: and(...conditions),
      orderBy: desc(withdrawals.requestedAt),
      limit: query.limit,
      offset: query.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawals)
      .where(and(...conditions));

    return { withdrawals: result, total: Number(count) };
  },

  async getWithdrawal(userId: string, withdrawalId: string) {
    return db.query.withdrawals.findFirst({
      where: and(
        eq(withdrawals.id, withdrawalId),
        eq(withdrawals.userId, userId)
      ),
    });
  },

  async getTodayWithdrawalTotal(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.userId, userId),
        gte(withdrawals.requestedAt, today)
      ));

    return Number(result?.total) || 0;
  },

  async countPendingWithdrawals(userId: string, methodId: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.userId, userId),
        eq(withdrawals.payoutMethodId, methodId),
        eq(withdrawals.status, 'pending')
      ));

    return Number(result?.count) || 0;
  },
};

function getPeriodStart(period: string): Date | null {
  const now = new Date();

  switch (period) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return null;
  }
}
