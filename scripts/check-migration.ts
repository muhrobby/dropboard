import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function checkMigration() {
    try {
        console.log("Checking if external_id column exists...\n");

        // Check if column exists
        const result = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'topup_order'
            AND column_name IN ('external_id', 'gateway_invoice_id')
            ORDER BY ordinal_position;
        `;

        console.log("Columns in topup_order table:");
        console.table(result);

        // Check if external_id exists and has data
        const externalIdCheck = await sql`
            SELECT COUNT(*) as count, COUNT(external_id) as with_external_id
            FROM topup_order;
        `;

        console.log("\nRecords with external_id:");
        console.table(externalIdCheck);

        // Get sample records
        const sampleOrders = await sql`
            SELECT id, external_id, gateway_invoice_id, status, amount
            FROM topup_order
            ORDER BY created_at DESC
            LIMIT 3;
        `;

        console.log("\nSample orders:");
        console.table(sampleOrders);

        await sql.end();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkMigration();
