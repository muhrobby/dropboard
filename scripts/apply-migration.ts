import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function applyMigration() {
    try {
        console.log("Applying migration...");
        await sql`ALTER TABLE topup_order ADD COLUMN IF NOT EXISTS external_id text`;
        console.log("✅ Column external_id added");

        await sql`CREATE INDEX IF NOT EXISTS idx_topup_order_external_id ON topup_order USING btree (external_id)`;
        console.log("✅ Index created");

        await sql.end();
        console.log("\n✅ Migration applied successfully!");
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

applyMigration();
