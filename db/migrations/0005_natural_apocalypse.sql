ALTER TABLE "topup_order" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE INDEX "idx_topup_order_external_id" ON "topup_order" USING btree ("external_id");