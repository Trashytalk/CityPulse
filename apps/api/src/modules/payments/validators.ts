// apps/api/src/modules/payments/validators.ts
import { z } from 'zod';

export const transactionsQuerySchema = z.object({
  currency: z.enum(['cash', 'credits', 'all']).default('all'),
  type: z.string().optional(), // Filter by transaction type
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const earningsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
});

export const addPayoutMethodSchema = z.object({
  provider: z.enum(['gcash', 'grabpay', 'bank_transfer', 'paypal']),
  accountIdentifier: z.string().min(1).max(100),
  accountName: z.string().max(100).optional(),
  // Bank-specific fields
  bankCode: z.string().optional(),
  bankName: z.string().optional(),
});

export const withdrawSchema = z.object({
  amount: z.number().int().positive().min(5000), // Min ₱50 (in cents)
  payoutMethodId: z.string().uuid(),
});

export const withdrawalsQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;
export type EarningsQuery = z.infer<typeof earningsQuerySchema>;
export type AddPayoutMethodInput = z.infer<typeof addPayoutMethodSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type WithdrawalsQuery = z.infer<typeof withdrawalsQuerySchema>;
