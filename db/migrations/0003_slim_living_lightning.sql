CREATE TABLE "pricing_tier" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"price_monthly" integer DEFAULT 0,
	"price_yearly" integer DEFAULT 0,
	"max_workspaces" integer DEFAULT 1,
	"max_team_workspaces" integer DEFAULT 0,
	"max_team_members" integer DEFAULT 0,
	"storage_limit_bytes" bigint DEFAULT 2147483648,
	"max_file_size_bytes" bigint DEFAULT 10485760,
	"retention_days" integer DEFAULT 7,
	"max_webhooks" integer DEFAULT 0,
	"has_priority_support" boolean DEFAULT false,
	"has_custom_branding" boolean DEFAULT false,
	"has_sso" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pricing_tier_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wallet_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"balance_before" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"description" text NOT NULL,
	"reference_id" text,
	"gateway_payment_id" text,
	"gateway_provider" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "wallet_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "topup_order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"gateway_provider" text NOT NULL,
	"gateway_invoice_id" text,
	"gateway_invoice_url" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_config" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"config" jsonb,
	"supported_methods" text[],
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_gateway_config_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"auto_renewal" boolean DEFAULT true,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subscription_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "system_log" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"user_id" text,
	"ip_address" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topup_order" ADD CONSTRAINT "topup_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tier_id_pricing_tier_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."pricing_tier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pricing_tier_name" ON "pricing_tier" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_pricing_tier_is_active" ON "pricing_tier" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_wallet_tx_wallet_id" ON "wallet_transaction" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_tx_type" ON "wallet_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_wallet_tx_status" ON "wallet_transaction" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wallet_tx_created_at" ON "wallet_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_user_id" ON "wallet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topup_order_user_id" ON "topup_order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topup_order_status" ON "topup_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_topup_order_gateway_invoice_id" ON "topup_order" USING btree ("gateway_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_topup_order_created_at" ON "topup_order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_pg_config_provider" ON "payment_gateway_config" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_pg_config_is_active" ON "payment_gateway_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_pg_config_is_primary" ON "payment_gateway_config" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "idx_subscription_user_id" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_tier_id" ON "subscription" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_status" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscription_period_end" ON "subscription" USING btree ("current_period_end");--> statement-breakpoint
CREATE INDEX "idx_system_log_level" ON "system_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_system_log_category" ON "system_log" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_system_log_user_id" ON "system_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_system_log_created_at" ON "system_log" USING btree ("created_at");