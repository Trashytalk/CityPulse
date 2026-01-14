// apps/api/src/modules/payments/routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../../middleware/auth';
import { paymentsService } from './service';
import * as v from './validators';

export const paymentsRoutes = new Hono();

// ============================================================================
// GET /payments/wallet
// Get wallet balances
// ============================================================================
paymentsRoutes.get('/wallet', requireAuth, async (c) => {
  const userId = c.get('userId');
  const wallet = await paymentsService.getWallet(userId);
  return c.json(wallet);
});

// ============================================================================
// GET /payments/transactions
// Get transaction history
// ============================================================================
paymentsRoutes.get('/transactions',
  requireAuth,
  zValidator('query', v.transactionsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const result = await paymentsService.getTransactions(userId, query);
    return c.json(result);
  }
);

// ============================================================================
// GET /payments/earnings
// Get earnings summary
// ============================================================================
paymentsRoutes.get('/earnings',
  requireAuth,
  zValidator('query', v.earningsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const earnings = await paymentsService.getEarningsSummary(userId, query);
    return c.json(earnings);
  }
);

// ============================================================================
// GET /payments/methods
// Get user's payout methods
// ============================================================================
paymentsRoutes.get('/methods', requireAuth, async (c) => {
  const userId = c.get('userId');
  const methods = await paymentsService.getPayoutMethods(userId);
  return c.json(methods);
});

// ============================================================================
// POST /payments/methods
// Add a new payout method
// ============================================================================
paymentsRoutes.post('/methods',
  requireAuth,
  zValidator('json', v.addPayoutMethodSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');
    const method = await paymentsService.addPayoutMethod(userId, input);
    return c.json(method, 201);
  }
);

// ============================================================================
// DELETE /payments/methods/:id
// Remove a payout method
// ============================================================================
paymentsRoutes.delete('/methods/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const methodId = c.req.param('id');
  await paymentsService.removePayoutMethod(userId, methodId);
  return c.json({ success: true });
});

// ============================================================================
// POST /payments/methods/:id/default
// Set as default payout method
// ============================================================================
paymentsRoutes.post('/methods/:id/default', requireAuth, async (c) => {
  const userId = c.get('userId');
  const methodId = c.req.param('id');
  await paymentsService.setDefaultPayoutMethod(userId, methodId);
  return c.json({ success: true });
});

// ============================================================================
// POST /payments/withdraw
// Request a withdrawal
// ============================================================================
paymentsRoutes.post('/withdraw',
  requireAuth,
  zValidator('json', v.withdrawSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');
    const withdrawal = await paymentsService.requestWithdrawal(userId, input);
    return c.json(withdrawal, 201);
  }
);

// ============================================================================
// GET /payments/withdrawals
// Get withdrawal history
// ============================================================================
paymentsRoutes.get('/withdrawals',
  requireAuth,
  zValidator('query', v.withdrawalsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const withdrawals = await paymentsService.getWithdrawals(userId, query);
    return c.json(withdrawals);
  }
);

// ============================================================================
// GET /payments/withdrawals/:id
// Get withdrawal detail
// ============================================================================
paymentsRoutes.get('/withdrawals/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const withdrawalId = c.req.param('id');
  const withdrawal = await paymentsService.getWithdrawalDetail(userId, withdrawalId);
  return c.json(withdrawal);
});
