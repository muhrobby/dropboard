import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { items } from "./items";
import { users } from "./auth";

export const shares = pgTable(
  "shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    accessCount: integer("access_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_shares_item").on(table.itemId),
    index("idx_shares_token").on(table.token),
    index("idx_shares_expires").on(table.expiresAt),
  ],
);
