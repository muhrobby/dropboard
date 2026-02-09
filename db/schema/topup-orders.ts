import {
    pgTable,
    text,
    timestamp,
    bigint,
    index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const topupOrders = pgTable(
    "topup_order",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        amount: bigint("amount", { mode: "number" }).notNull(), // dalam rupiah
        status: text("status").notNull().default("pending"), // pending, paid, expired, failed
        paymentMethod: text("payment_method"), // va_bca, ewallet_ovo, qris, etc
        gatewayProvider: text("gateway_provider").notNull(), // 'xendit' atau 'doku'
        gatewayInvoiceId: text("gateway_invoice_id"),
        gatewayInvoiceUrl: text("gateway_invoice_url"),
        expiresAt: timestamp("expires_at", { withTimezone: true }),
        paidAt: timestamp("paid_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        index("idx_topup_order_user_id").on(table.userId),
        index("idx_topup_order_status").on(table.status),
        index("idx_topup_order_gateway_invoice_id").on(table.gatewayInvoiceId),
        index("idx_topup_order_created_at").on(table.createdAt),
    ]
);
