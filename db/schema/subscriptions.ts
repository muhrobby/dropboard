import {
    pgTable,
    text,
    timestamp,
    boolean,
    index,
    jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { pricingTiers } from "./pricing-tiers";

export const subscriptions = pgTable(
    "subscription",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: "cascade" }),
        tierId: text("tier_id")
            .notNull()
            .references(() => pricingTiers.id),
        status: text("status").notNull().default("active"), // active, cancelled, expired, trial
        autoRenewal: boolean("auto_renewal").default(true),
        trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
        currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
        currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
        cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_subscription_user_id").on(table.userId),
        index("idx_subscription_tier_id").on(table.tierId),
        index("idx_subscription_status").on(table.status),
        index("idx_subscription_period_end").on(table.currentPeriodEnd),
    ]
);

export const paymentGatewayConfig = pgTable(
    "payment_gateway_config",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        provider: text("provider").notNull().unique(), // 'xendit', 'doku'
        displayName: text("display_name").notNull(),
        isActive: boolean("is_active").default(false),
        isPrimary: boolean("is_primary").default(false),
        config: jsonb("config"), // encrypted API keys dan config
        supportedMethods: text("supported_methods").array(), // ['va', 'ewallet', 'qris', 'cc']
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_pg_config_provider").on(table.provider),
        index("idx_pg_config_is_active").on(table.isActive),
        index("idx_pg_config_is_primary").on(table.isPrimary),
    ]
);
