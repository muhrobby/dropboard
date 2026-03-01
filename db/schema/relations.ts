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
import { todoColumns, todoTasks, todoTaskComments } from "./todos";
import { collections } from "./collections";
import { itemVersions } from "./item-versions";
import { itemComments } from "./item-comments";
import { shares } from "./shares";
import { shareAnalytics } from "./share-analytics";

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
  todoColumns: many(todoColumns),
  todoTasks: many(todoTasks),
  collections: many(collections),
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

export const itemsRelations = relations(items, ({ one, many }) => ({
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
  collection: one(collections, {
    fields: [items.collectionId],
    references: [collections.id],
  }),
  versions: many(itemVersions),
  comments: many(itemComments),
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

// Todo relations
export const todoColumnsRelations = relations(todoColumns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [todoColumns.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(todoTasks),
}));

export const todoTasksRelations = relations(todoTasks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [todoTasks.workspaceId],
    references: [workspaces.id],
  }),
  column: one(todoColumns, {
    fields: [todoTasks.columnId],
    references: [todoColumns.id],
  }),
  creator: one(users, {
    fields: [todoTasks.createdBy],
    references: [users.id],
    relationName: "taskCreator",
  }),
  assignee: one(users, {
    fields: [todoTasks.assignedTo],
    references: [users.id],
    relationName: "taskAssignee",
  }),
  comments: many(todoTaskComments),
}));

export const todoTaskCommentsRelations = relations(todoTaskComments, ({ one }) => ({
  task: one(todoTasks, {
    fields: [todoTaskComments.taskId],
    references: [todoTasks.id],
  }),
  workspace: one(workspaces, {
    fields: [todoTaskComments.workspaceId],
    references: [workspaces.id],
  }),
  author: one(users, {
    fields: [todoTaskComments.authorId],
    references: [users.id],
    relationName: "commentAuthor",
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [collections.createdBy],
    references: [users.id],
    relationName: "collectionCreator",
  }),
  parent: one(collections, {
    fields: [collections.parentId],
    references: [collections.id],
    relationName: "collectionParent",
  }),
  children: many(collections, { relationName: "collectionParent" }),
  items: many(items),
}));

export const itemVersionsRelations = relations(itemVersions, ({ one }) => ({
  item: one(items, {
    fields: [itemVersions.itemId],
    references: [items.id],
  }),
  workspace: one(workspaces, {
    fields: [itemVersions.workspaceId],
    references: [workspaces.id],
  }),
  fileAsset: one(fileAssets, {
    fields: [itemVersions.fileAssetId],
    references: [fileAssets.id],
  }),
  creator: one(users, {
    fields: [itemVersions.createdBy],
    references: [users.id],
    relationName: "itemVersionCreator",
  }),
}));

export const itemCommentsRelations = relations(itemComments, ({ one }) => ({
  item: one(items, {
    fields: [itemComments.itemId],
    references: [items.id],
  }),
  workspace: one(workspaces, {
    fields: [itemComments.workspaceId],
    references: [workspaces.id],
  }),
  author: one(users, {
    fields: [itemComments.authorId],
    references: [users.id],
    relationName: "itemCommentAuthor",
  }),
}));

export const sharesRelations = relations(shares, ({ one, many }) => ({
  item: one(items, {
    fields: [shares.itemId],
    references: [items.id],
  }),
  creator: one(users, {
    fields: [shares.createdBy],
    references: [users.id],
    relationName: "shareCreator",
  }),
  analytics: many(shareAnalytics),
}));

export const shareAnalyticsRelations = relations(shareAnalytics, ({ one }) => ({
  share: one(shares, {
    fields: [shareAnalytics.shareId],
    references: [shares.id],
  }),
}));

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
  createdTasks: many(todoTasks, { relationName: "taskCreator" }),
  assignedTasks: many(todoTasks, { relationName: "taskAssignee" }),
  todoComments: many(todoTaskComments, { relationName: "commentAuthor" }),
  createdCollections: many(collections, { relationName: "collectionCreator" }),
  createdItemVersions: many(itemVersions, { relationName: "itemVersionCreator" }),
  itemComments: many(itemComments, { relationName: "itemCommentAuthor" }),
  createdShares: many(shares, { relationName: "shareCreator" }),
}));
