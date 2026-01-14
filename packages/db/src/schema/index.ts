/**
 * @file schema/index.ts
 * @description Schema index - exports all schemas and relations
 * @playbook-ref 02-database/README.md
 * @deviations None
 */

// Re-export all schemas
export * from './core';
export * from './collection';
export * from './gamification';
export * from './financial';
export * from './wifi';

// Import for relations
import { relations } from 'drizzle-orm';

import { collectionSessions, entities, frames, networkScans } from './collection';
import { users, userProfiles } from './core';
import { transactions, wallets } from './financial';
import { userAchievements, userChallenges, userProgression } from './gamification';

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  progression: one(userProgression, {
    fields: [users.id],
    references: [userProgression.userId],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  sessions: many(collectionSessions),
  achievements: many(userAchievements),
  challenges: many(userChallenges),
  transactions: many(transactions),
}));

export const collectionSessionsRelations = relations(collectionSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [collectionSessions.userId],
    references: [users.id],
  }),
  frames: many(frames),
  networkScans: many(networkScans),
  entities: many(entities),
}));

export const framesRelations = relations(frames, ({ one, many }) => ({
  session: one(collectionSessions, {
    fields: [frames.sessionId],
    references: [collectionSessions.id],
  }),
  entities: many(entities),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userProgressionRelations = relations(userProgression, ({ one }) => ({
  user: one(users, {
    fields: [userProgression.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));
