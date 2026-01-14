// apps/api/src/test/setup.ts
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/citypulse_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.OTP_SECRET = 'test-otp-secret-key-12345';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

// Mock external services
vi.mock('../lib/sms', () => ({
  sendSMS: vi.fn().mockResolvedValue(undefined),
  sendOTPSMS: vi.fn().mockResolvedValue(undefined),
  sendWithdrawalSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/redis', async () => {
  const actual = await vi.importActual('../lib/redis');
  return {
    ...actual,
    redis: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    },
    getCached: vi.fn().mockResolvedValue(null),
    setCached: vi.fn().mockResolvedValue(undefined),
    deleteCached: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100 }),
  };
});

// Global test setup
beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Cleanup
});
