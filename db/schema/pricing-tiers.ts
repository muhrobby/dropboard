import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    bigint,
    index,
} from "drizzle-orm/pg-core";

export const pricingTiers = pgTable(
    "pricing_tier",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        name: text("name").notNull().unique(), // 'free', 'pro', 'business'
        displayName: text("display_name").notNull(),
        priceMonthly: integer("price_monthly").default(0), // dalam rupiah
        priceYearly: integer("price_yearly").default(0),
        maxWorkspaces: integer("max_workspaces").default(1),
        maxTeamWorkspaces: integer("max_team_workspaces").default(0),
        maxTeamMembers: integer("max_team_members").default(0),
        storageLimitBytes: bigint("storage_limit_bytes", { mode: "number" }).default(2147483648), // 2GB default
        maxFileSizeBytes: bigint("max_file_size_bytes", { mode: "number" }).default(10485760), // 10MB default
        retentionDays: integer("retention_days").default(7),
        maxWebhooks: integer("max_webhooks").default(0),
        hasPrioritySupport: boolean("has_priority_support").default(false),
        hasCustomBranding: boolean("has_custom_branding").default(false),
        hasSso: boolean("has_sso").default(false),
        isActive: boolean("is_active").default(true),
        sortOrder: integer("sort_order").default(0),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_pricing_tier_name").on(table.name),
        index("idx_pricing_tier_is_active").on(table.isActive),
    ]
);
