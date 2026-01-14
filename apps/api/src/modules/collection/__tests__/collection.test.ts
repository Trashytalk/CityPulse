// apps/api/src/modules/collection/__tests__/collection.test.ts
import { cleanDatabase, createTestUser } from '@citypulse/db/test';
import { Hono } from 'hono';
import { describe, it, expect, beforeEach } from 'vitest';

import { collectionRoutes } from '../routes';


const app = new Hono().route('/collection', collectionRoutes);

describe('Collection Module', () => {
  let authHeader: string;
  let _userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const { user, token } = await createTestUser();
    _userId = user.id;
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
