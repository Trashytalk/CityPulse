// apps/api/src/modules/collection/__tests__/collection.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { collectionRoutes } from '../routes';
import { cleanDatabase, createTestUser } from '@citypulse/db/test';

const app = new Hono().route('/collection', collectionRoutes);

describe('Collection Module', () => {
  let authHeader: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { user, token } = await createTestUser();
    userId = user.id;
    authHeader = `Bearer ${token}`;
  });

  describe('POST /collection/sessions', () => {
    it('should create a new collection session', async () => {
      const res = await app.request('/collection/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ mode: 'dashcam' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.session.id).toBeDefined();
      expect(data.session.mode).toBe('dashcam');
      expect(data.session.status).toBe('active');
    });

    it('should reject if user already has active session', async () => {
      // Create first session
      await app.request('/collection/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ mode: 'passive' }),
      });

      // Try to create second
      const res = await app.request('/collection/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ mode: 'dashcam' }),
      });

      expect(res.status).toBe(409);
    });
  });
});
