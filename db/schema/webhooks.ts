import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspaces } from "./workspaces";
import { users } from "./auth";

// Webhook event types
export const WEBHOOK_EVENTS = [
  "item.created",
  "item.deleted",
  "item.pinned",
  "item.unpinned",
  "item.shared",
  "member.joined",
  "member.removed",
  "workspace.updated",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 64 }).notNull(),
    events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    failureCount: text("failure_count").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_webhooks_workspace").on(table.workspaceId),
    index("idx_webhooks_active").on(table.isActive),
  ]
);

// Type inference for Webhook
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export const webhookLogs = pgTable(
  "webhook_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 50 }).notNull(),
    payload: jsonb("payload"),
    responseStatus: text("response_status"),
    responseBody: text("response_body"),
    success: boolean("success").notNull(),
    duration: text("duration"), // ms
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_webhook_logs_webhook").on(table.webhookId),
    index("idx_webhook_logs_created").on(table.createdAt),
  ]
);
