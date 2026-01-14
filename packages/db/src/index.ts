/**
 * @file index.ts
 * @description Database client and exports
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// For serverless environments (Neon)
export function createNeonClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzleNeon(sql, { schema });
}

// For traditional environments (local dev, Railway)
export function createPostgresClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// Default export - auto-detect environment
const connectionString = process.env.DATABASE_URL!;

export const db = connectionString?.includes('neon')
  ? createNeonClient(connectionString)
  : createPostgresClient(connectionString);

// Re-export schema for convenience
export * from './schema';
export { sql } from 'drizzle-orm';
