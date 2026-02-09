import { db } from "@/db";
import { pricingTiers, paymentGatewayConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Seed default pricing tiers
 */
export async function seedPricingTiers() {
    const tiers = [
        {
            name: "free",
            displayName: "Free",
            priceMonthly: 0,
            priceYearly: 0,
            maxWorkspaces: 1,
            maxTeamWorkspaces: 0,
            maxTeamMembers: 0,
            storageLimitBytes: 2 * 1024 * 1024 * 1024, // 2GB
            maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
            retentionDays: 7,
            maxWebhooks: 0,
            hasPrioritySupport: false,
            hasCustomBranding: false,
            hasSso: false,
            isActive: true,
            sortOrder: 0,
        },
        {
            name: "pro",
            displayName: "Pro",
            priceMonthly: 99000, // Rp 99.000
            priceYearly: 990000, // Rp 990.000 (10 bulan)
            maxWorkspaces: 3, // 1 personal + 2 team
            maxTeamWorkspaces: 2,
            maxTeamMembers: 5,
            storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10GB
            maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
            retentionDays: 30,
            maxWebhooks: 3,
            hasPrioritySupport: false,
            hasCustomBranding: false,
            hasSso: false,
            isActive: true,
            sortOrder: 1,
        },
        {
            name: "business",
            displayName: "Business",
            priceMonthly: 299000, // Rp 299.000
            priceYearly: 2990000, // Rp 2.990.000 (10 bulan)
            maxWorkspaces: -1, // Unlimited
            maxTeamWorkspaces: -1, // Unlimited
            maxTeamMembers: 20,
            storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50GB
            maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
            retentionDays: -1, // Unlimited
            maxWebhooks: -1, // Unlimited
            hasPrioritySupport: true,
            hasCustomBranding: true,
            hasSso: true,
            isActive: true,
            sortOrder: 2,
        },
    ];

    for (const tier of tiers) {
        const existing = await db.query.pricingTiers.findFirst({
            where: eq(pricingTiers.name, tier.name),
        });

        if (!existing) {
            await db.insert(pricingTiers).values(tier);
            console.log(`✅ Created tier: ${tier.displayName}`);
        } else {
            console.log(`⏭️ Tier already exists: ${tier.displayName}`);
        }
    }
}

/**
 * Seed default payment gateway configurations
 */
export async function seedPaymentGateways() {
    const gateways = [
        {
            provider: "xendit",
            displayName: "Xendit",
            isActive: false, // Admin needs to configure and activate
            isPrimary: false,
            config: {
                // These will be set by admin
                secretKey: "",
                publicKey: "",
                callbackToken: "",
            },
            supportedMethods: ["va", "ewallet", "qris"],
        },
        {
            provider: "doku",
            displayName: "DOKU",
            isActive: false, // Admin needs to configure and activate
            isPrimary: false,
            config: {
                // These will be set by admin
                clientId: "",
                secretKey: "",
            },
            supportedMethods: ["va", "ewallet", "qris", "retail"],
        },
    ];

    for (const gateway of gateways) {
        const existing = await db.query.paymentGatewayConfig.findFirst({
            where: eq(paymentGatewayConfig.provider, gateway.provider),
        });

        if (!existing) {
            await db.insert(paymentGatewayConfig).values(gateway);
            console.log(`✅ Created gateway config: ${gateway.displayName}`);
        } else {
            console.log(`⏭️ Gateway config already exists: ${gateway.displayName}`);
        }
    }
}

/**
 * Run all seeds
 */
export async function runSeeds() {
    console.log("🌱 Starting database seeds...\n");

    console.log("📦 Seeding pricing tiers...");
    await seedPricingTiers();

    console.log("\n💳 Seeding payment gateways...");
    await seedPaymentGateways();

    console.log("\n✅ All seeds completed!");
}

// Run if executed directly
if (require.main === module) {
    runSeeds()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Seed failed:", error);
            process.exit(1);
        });
}
