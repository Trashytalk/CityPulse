/**
 * @file validators/payment.ts
 * @description Payment validation schemas
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

import { z } from 'zod';

export const payoutProviderSchema = z.enum(['gcash', 'grabpay', 'bank_transfer', 'paypal']);

export const addPayoutMethodSchema = z
  .object({
    provider: payoutProviderSchema,
    accountIdentifier: z.string().min(1),
    accountName: z.string().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Validate phone number for e-wallets
      if (data.provider === 'gcash' || data.provider === 'grabpay') {
        return /^\+639\d{9}$/.test(data.accountIdentifier);
      }
      return true;
    },
    { message: 'Invalid phone number for e-wallet' }
  );

export const withdrawSchema = z.object({
  amount: z
    .number()
    .int('Amount must be in cents')
    .min(5000, 'Minimum withdrawal is ₱50')
    .max(500000, 'Maximum withdrawal is ₱5,000'),
  payoutMethodId: z.string().uuid(),
});

export const transactionQuerySchema = z.object({
  currency: z.enum(['cash', 'credits', 'all']).optional().default('all'),
  type: z
    .enum(['earning', 'withdrawal', 'refund', 'bonus', 'purchase', 'transfer'])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AddPayoutMethodInput = z.infer<typeof addPayoutMethodSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
