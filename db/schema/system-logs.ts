import {
    pgTable,
    text,
    timestamp,
    index,
    jsonb,
} from "drizzle-orm/pg-core";

export const systemLogs = pgTable(
    "system_log",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        level: text("level").notNull(), // 'info', 'warning', 'error', 'critical'
        category: text("category").notNull(), // 'payment', 'subscription', 'auth', 'system'
        message: text("message").notNull(),
        metadata: jsonb("metadata"),
        userId: text("user_id"),
        ipAddress: text("ip_address"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_system_log_level").on(table.level),
        index("idx_system_log_category").on(table.category),
        index("idx_system_log_user_id").on(table.userId),
        index("idx_system_log_created_at").on(table.createdAt),
    ]
);
