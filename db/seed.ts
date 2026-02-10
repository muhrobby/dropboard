import { db } from "@/db";
import { pricingTiers, paymentGatewayConfig, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Seed default admin user
 */
export async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@dropboard.com";
  const adminName = process.env.ADMIN_NAME || "Admin User";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      name: adminName,
      emailVerified: true,
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
    console.log(
      `⚠️  IMPORTANT: Set up authentication for this user via your auth provider`,
    );
  } else {
    console.log(`⏭️ Admin user already exists: ${adminEmail}`);

    // Ensure existing user has admin role
    if (
      existingAdmin.role !== "super_admin" &&
      existingAdmin.role !== "admin"
    ) {
      await db
        .update(users)
        .set({ role: "super_admin", updatedAt: new Date() })
        .where(eq(users.id, existingAdmin.id));
      console.log(`✅ Updated user role to super_admin: ${adminEmail}`);
    }
  }
}

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
      isActive: true, // Default to active if keys exist
      isPrimary: true,
      config: {
        secretKey: process.env.XENDIT_SECRET_KEY || "",
        publicKey: process.env.XENDIT_PUBLIC_KEY || "",
        callbackToken: process.env.XENDIT_CALLBACK_TOKEN || "",
      },
      supportedMethods: ["va", "ewallet", "qris"],
    },
    {
      provider: "doku",
      displayName: "DOKU",
      isActive: false,
      isPrimary: false,
      config: {
        clientId: process.env.DOKU_CLIENT_ID || "",
        secretKey: process.env.DOKU_SECRET_KEY || "",
        isProduction: process.env.NODE_ENV === "production",
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
      // Update existing config with new env vars if available
      await db
        .update(paymentGatewayConfig)
        .set({
          config: gateway.config,
          updatedAt: new Date(),
        })
        .where(eq(paymentGatewayConfig.id, existing.id));
      console.log(`🔄 Updated gateway config from env: ${gateway.displayName}`);
    }
  }
}

/**
 * Run all seeds
 */
export async function runSeeds() {
  console.log("🌱 Starting database seeds...\n");

  console.log("👤 Seeding admin user...");
  await seedAdminUser();

  console.log("\n📦 Seeding pricing tiers...");
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
