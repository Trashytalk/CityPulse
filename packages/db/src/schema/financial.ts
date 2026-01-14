/**
 * @file schema/financial.ts
 * @description Financial schema: Wallets, Transactions, Withdrawals
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { users } from './core';

// ============================================================================
// WALLETS
// ============================================================================

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Balances (stored in smallest unit: cents for cash, whole number for credits)
    cashBalance: integer('cash_balance').notNull().default(0),
    creditBalance: integer('credit_balance').notNull().default(0),

    // Lifetime totals
    totalCashEarned: integer('total_cash_earned').notNull().default(0),
    totalCreditsEarned: integer('total_credits_earned').notNull().default(0),
    totalCashWithdrawn: integer('total_cash_withdrawn').notNull().default(0),
    totalCreditsSpent: integer('total_credits_spent').notNull().default(0),

    // Pending amounts (in processing)
    pendingCash: integer('pending_cash').notNull().default(0),
    pendingCredits: integer('pending_credits').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('wallets_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// TRANSACTIONS
// ============================================================================

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),

    // Transaction type
    type: varchar('type', { length: 50 }).notNull(),
    // 'session_earning' | 'bounty_completion' | 'achievement_reward' |
    // 'challenge_reward' | 'referral_bonus' | 'wifi_unlock' | 'withdrawal' |
    // 'adjustment' | 'streak_bonus'

    // Currency and amount
    currency: varchar('currency', { length: 10 }).notNull(),
    // 'cash' | 'credits'
    amount: integer('amount').notNull(), // Positive for credit, negative for debit

    // Balance after transaction
    balanceAfter: integer('balance_after').notNull(),

    // Reference to source
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),
    // e.g., referenceType: 'session', referenceId: session.id

    // Description
    description: text('description'),

    // Metadata
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('transactions_user_id_idx').on(table.userId),
    typeIdx: index('transactions_type_idx').on(table.type),
    createdAtIdx: index('transactions_created_at_idx').on(table.createdAt),
    referenceIdx: index('transactions_reference_idx').on(table.referenceType, table.referenceId),
  })
);

// ============================================================================
// PAYOUT METHODS
// ============================================================================

export const payoutMethods = pgTable(
  'payout_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Provider
    provider: varchar('provider', { length: 50 }).notNull(),
    // 'gcash' | 'grabpay' | 'bank_transfer' | 'paypal'

    // Identifier (encrypted in production)
    accountIdentifier: text('account_identifier').notNull(),
    // Phone number for GCash/GrabPay, account number for bank

    // Display
    displayName: varchar('display_name', { length: 100 }),
    // "GCash ***1234" or "BDO ****5678"

    // Status
    isDefault: boolean('is_default').notNull().default(false),
    isVerified: boolean('is_verified').notNull().default(false),

    // Metadata
    metadata: jsonb('metadata'),
    // Bank: { bankCode, bankName, accountName }

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('payout_methods_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// WITHDRAWALS
// ============================================================================

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    payoutMethodId: uuid('payout_method_id')
      .notNull()
      .references(() => payoutMethods.id),

    // Amount
    amount: integer('amount').notNull(), // In cents
    fee: integer('fee').notNull().default(0),
    netAmount: integer('net_amount').notNull(),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

    // Provider tracking
    providerReference: varchar('provider_reference', { length: 100 }),
    providerResponse: jsonb('provider_response'),

    // Error handling
    failureReason: text('failure_reason'),
    retryCount: integer('retry_count').notNull().default(0),

    // Timestamps
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('withdrawals_user_id_idx').on(table.userId),
    statusIdx: index('withdrawals_status_idx').on(table.status),
    requestedAtIdx: index('withdrawals_requested_at_idx').on(table.requestedAt),
  })
);
