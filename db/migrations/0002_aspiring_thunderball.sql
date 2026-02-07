CREATE TABLE "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"token" varchar(64) NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"event" varchar(50) NOT NULL,
	"payload" jsonb,
	"response_status" text,
	"response_body" text,
	"success" boolean NOT NULL,
	"duration" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(64) NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"failure_count" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "ocr_text" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "ocr_status" varchar(20);--> statement-breakpoint
ALTER TABLE "file_assets" ADD COLUMN "scan_status" varchar(20);--> statement-breakpoint
ALTER TABLE "file_assets" ADD COLUMN "scan_result" text;--> statement-breakpoint
ALTER TABLE "file_assets" ADD COLUMN "scanned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shares_item" ON "shares" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_shares_token" ON "shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_shares_expires" ON "shares" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_webhook" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_created" ON "webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_webhooks_workspace" ON "webhooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_active" ON "webhooks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_items_ocr_text" ON "items" USING btree ("ocr_text");