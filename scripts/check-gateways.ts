import { db } from "@/db";
import { paymentGatewayConfig } from "@/db/schema";

async function checkGateways() {
    const gateways = await db.select().from(paymentGatewayConfig);
    console.log("Payment Gateways in Database:");
    console.table(gateways.map((g) => ({
        provider: g.provider,
        isActive: g.isActive ? "Yes" : "No",
        isPrimary: g.isPrimary ? "Yes" : "No",
        hasConfig: g.config ? "Yes" : "No",
        configKeys: g.config ? Object.keys(g.config).join(", ") : "",
    })));
}

checkGateways().catch(console.error);
