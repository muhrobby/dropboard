import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { subscriptions, pricingTiers, walletTransactions } from "@/db/schema";
import { getOrCreateWallet, addWalletTransaction, hasEnoughBalance } from "@/lib/wallet";
import { logInfo, logError } from "@/lib/system-logger";
import {
    successResponse,
    serverErrorResponse,
    unauthorizedResponse,
    validationErrorResponse,
    createdResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const purchaseSchema = z.object({
    plan: z.enum(["pro", "business"]),
    billingCycle: z.enum(["monthly", "yearly"]),
});

/**
 * POST /api/v1/subscription/purchase
 * Purchase or upgrade subscription
 */
export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const result = purchaseSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((i) => i.message).join(", ");
            return validationErrorResponse(message);
        }

        const { plan, billingCycle } = result.data;

        // Get pricing tier
        const tier = await db.query.pricingTiers.findFirst({
            where: and(
                eq(pricingTiers.name, plan),
                eq(pricingTiers.isActive, true)
            ),
        });

        if (!tier) {
            return serverErrorResponse("Pricing tier not found");
        }

        // Calculate price (tier is guaranteed to exist after the check above)
        const price = billingCycle === "monthly"
            ? (tier.priceMonthly ?? 0)
            : (tier.priceYearly ?? 0);

        // Get user's wallet
        const wallet = await getOrCreateWallet(session.user.id);

        // Check balance
        if (wallet.balance < price) {
            return serverErrorResponse(
                `Saldo tidak cukup. Anda memerlukan ${new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(price)}, saldo Anda ${new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(wallet.balance)}`
            );
        }

        // Calculate subscription period
        const now = new Date();
        const periodEnd = new Date(now);
        if (billingCycle === "monthly") {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Check if user has existing subscription
        const existingSubscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, session.user.id),
        });

        // Deduct wallet balance and add transaction
        await addWalletTransaction({
            walletId: wallet.id,
            type: "subscription",
            amount: -price, // Negative for deduction
            description: `Langganan ${tier.displayName} (${billingCycle === "monthly" ? "Bulanan" : "Tahunan"})`,
            referenceId: existingSubscription?.id,
            gatewayProvider: "wallet",
        });

        // Create or update subscription
        if (existingSubscription) {
            await db
                .update(subscriptions)
                .set({
                    tierId: tier.id,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    autoRenewal: true,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existingSubscription.id));

            await logInfo("subscription", `Subscription upgraded: ${session.user.id}`, {
                userId: session.user.id,
                oldTierId: existingSubscription.tierId,
                newTierId: tier.id,
                billingCycle,
                price,
            }, session.user.id);
        } else {
            const [subscription] = await db
                .insert(subscriptions)
                .values({
                    userId: session.user.id,
                    tierId: tier.id,
                    status: "active",
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    autoRenewal: true,
                })
                .returning();

            await logInfo("subscription", `Subscription created: ${session.user.id}`, {
                userId: session.user.id,
                subscriptionId: subscription.id,
                tierId: tier.id,
                billingCycle,
                price,
            }, session.user.id);
        }

        return successResponse({
            success: true,
            message: "Langganan berhasil diaktifkan",
            data: {
                plan: tier.displayName,
                periodEnd,
                billingCycle,
                price,
            },
        });
    } catch (error) {
        console.error("Subscription purchase error:", error);

        if (error instanceof AppError) {
            return unauthorizedResponse(error.message);
        }

        await logError("subscription", `Subscription purchase failed: ${error instanceof Error ? error.message : "Unknown error"}`);

        return serverErrorResponse("Gagal mengaktifkan langganan. Silakan coba lagi.");
    }
}
