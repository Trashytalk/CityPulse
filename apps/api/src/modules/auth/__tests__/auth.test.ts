// apps/api/src/modules/auth/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { authRoutes } from '../routes';
import { cleanDatabase } from '@citypulse/db/test';
import * as smsLib from '../../../lib/sms';

// Mock SMS sending
vi.mock('../../../lib/sms', () => ({
  sendOTPSMS: vi.fn().mockResolvedValue(undefined),
}));

const app = new Hono().route('/auth', authRoutes);

describe('Auth Module', () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe('POST /auth/otp/send', () => {
    it('should send OTP to valid phone number', async () => {
      const res = await app.request('/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+639171234567' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(smsLib.sendOTPSMS).toHaveBeenCalledWith(
        '+639171234567',
        expect.any(String)
      );
    });

    it('should reject invalid phone number', async () => {
      const res = await app.request('/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '12345' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('should reject invalid OTP', async () => {
      const res = await app.request('/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+639171234567', code: '000000' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });
});
