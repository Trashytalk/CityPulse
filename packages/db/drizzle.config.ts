/**
 * @file drizzle.config.ts
 * @description Drizzle Kit configuration
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env.local' });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
