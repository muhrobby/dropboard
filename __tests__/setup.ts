import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.local.test" });

// Mock environment variables as fallback
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dev_user:Dev_User123@localhost:5432/dropboard";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "test-secret-key-at-least-32-characters-long";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads-test";
process.env.MAX_UPLOAD_SIZE_MB = process.env.MAX_UPLOAD_SIZE_MB || "20";
