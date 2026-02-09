import {
    pgTable,
    text,
    timestamp,
    bigint,
    index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const wallets = pgTable(
    "wallet",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: "cascade" }),
        balance: bigint("balance", { mode: "number" }).notNull().default(0), // dalam rupiah
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_wallet_user_id").on(table.userId),
    ]
);

export const walletTransactions = pgTable(
    "wallet_transaction",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        walletId: text("wallet_id")
            .notNull()
            .references(() => wallets.id, { onDelete: "cascade" }),
        type: text("type").notNull(), // 'topup', 'subscription', 'refund'
        amount: bigint("amount", { mode: "number" }).notNull(), // positif = masuk, negatif = keluar
        balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
        balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
        description: text("description").notNull(),
        referenceId: text("reference_id"), // subscription id, order id, etc
        gatewayPaymentId: text("gateway_payment_id"), // ID dari Xendit/DOKU
        gatewayProvider: text("gateway_provider"), // 'xendit' atau 'doku'
        status: text("status").notNull().default("completed"), // pending, completed, failed
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_wallet_tx_wallet_id").on(table.walletId),
        index("idx_wallet_tx_type").on(table.type),
        index("idx_wallet_tx_status").on(table.status),
        index("idx_wallet_tx_created_at").on(table.createdAt),
    ]
);
