// packages/db/src/test/setup.ts
import { sql } from 'drizzle-orm';

import { db } from '../index';

beforeAll(async () => {
  // Ensure PostGIS extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
});

afterAll(async () => {
  // Cleanup - close connection pool
  // Note: Drizzle with postgres.js handles this automatically
});

// Clean tables between tests
export async function cleanDatabase() {
  await db.execute(sql`TRUNCATE TABLE 
    transactions, withdrawals, wallets,
    user_achievements, user_challenges, user_progression,
    wifi_unlocks, wifi_contributions, wifi_networks,
    frames, sensor_readings, collection_sessions,
    auth_sessions, otp_codes, user_profiles, users
    CASCADE`);
}
