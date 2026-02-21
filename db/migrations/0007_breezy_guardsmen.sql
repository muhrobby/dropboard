ALTER TABLE "items" ADD COLUMN "max_downloads" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "download_count" integer DEFAULT 0 NOT NULL;