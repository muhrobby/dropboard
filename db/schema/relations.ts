import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { workspaceMembers } from "./workspace-members";
import { items } from "./items";
import { fileAssets } from "./file-assets";
import { invites } from "./invites";
import { activityLogs } from "./activity-logs";
import { users, sessions, accounts, verifications } from "./auth";
import { webhooks, webhookLogs } from "./webhooks";
import { wallets, walletTransactions } from "./wallets";
import { subscriptions, paymentGatewayConfig } from "./subscriptions";
import { topupOrders } from "./topup-orders";
import { pricingTiers } from "./pricing-tiers";

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  workspaceMembers: many(workspaceMembers),
  createdItems: many(items, { relationName: "creator" }),
  uploadedFileAssets: many(fileAssets, { relationName: "uploader" }),
  sentInvites: many(invites, { relationName: "inviter" }),
  activities: many(activityLogs, { relationName: "actor" }),
  webhooks: many(webhooks, { relationName: "webhookCreator" }),
  wallet: one(wallets),
  subscription: one(subscriptions),
  topupOrders: many(topupOrders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  items: many(items),
  fileAssets: many(fileAssets),
  invites: many(invites),
  activityLogs: many(activityLogs),
  webhooks: many(webhooks),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export const itemsRelations = relations(items, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [items.workspaceId],
    references: [workspaces.id],
  }),
  fileAsset: one(fileAssets, {
    fields: [items.fileAssetId],
    references: [fileAssets.id],
  }),
  creator: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
}));

export const fileAssetsRelations = relations(fileAssets, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [fileAssets.workspaceId],
    references: [workspaces.id],
  }),
  uploader: one(users, {
    fields: [fileAssets.uploadedBy],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [invites.workspaceId],
    references: [workspaces.id],
  }),
  inviter: one(users, {
    fields: [invites.invitedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [activityLogs.workspaceId],
    references: [workspaces.id],
  }),
  actor: one(users, {
    fields: [activityLogs.actorId],
    references: [users.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [webhooks.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [webhooks.createdBy],
    references: [users.id],
    relationName: "webhookCreator",
  }),
  logs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookLogs.webhookId],
    references: [webhooks.id],
  }),
}));

// Wallet relations
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  })
);

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  tier: one(pricingTiers, {
    fields: [subscriptions.tierId],
    references: [pricingTiers.id],
  }),
}));

export const pricingTiersRelations = relations(pricingTiers, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

// Top-up order relations
export const topupOrdersRelations = relations(topupOrders, ({ one }) => ({
  user: one(users, {
    fields: [topupOrders.userId],
    references: [users.id],
  }),
}));
