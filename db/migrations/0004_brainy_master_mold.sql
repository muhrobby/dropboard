ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_user_role" ON "user" USING btree ("role");