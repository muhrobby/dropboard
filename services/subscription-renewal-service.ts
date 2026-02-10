import { db } from "@/db";
import { subscriptions, pricingTiers, wallets, users } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { getOrCreateWallet, addWalletTransaction } from "@/lib/wallet";
import { logInfo, logWarning, logError, logCritical } from "@/lib/system-logger";

/**
 * Result types for subscription renewal
 */
export interface RenewalResult {
    totalProcessed: number;
    renewed: number;
    remindersSent: number;
    downgraded: number;
    failed: number;
    details: RenewalDetail[];
}

export interface RenewalDetail {
    subscriptionId: string;
    userId: string;
    tierName: string;
    action: "renewed" | "reminder" | "downgraded" | "failed";
    message: string;
    metadata?: Record<string, unknown>;
}

/**
 * Get the free tier from database
 */
async function getFreeTierId(): Promise<string | null> {
    const freeTier = await db.query.pricingTiers.findFirst({
        where: eq(pricingTiers.name, "free"),
    });
    return freeTier?.id || null;
}

/**
 * Calculate next period end date based on tier's billing cycle
 * For now, we'll use a simple monthly renewal (30 days)
 */
function calculateNextPeriodEnd(currentPeriodEnd: Date): Date {
    const nextDate = new Date(currentPeriodEnd);
    nextDate.setDate(nextDate.getDate() + 30); // Add 30 days for monthly billing
    return nextDate;
}

/**
 * Send reminder email about insufficient balance
 * TODO: Implement actual email sending
 */
async function sendInsufficientBalanceReminder(
    userEmail: string,
    tierName: string,
    tierPrice: number,
    expiresAt: Date
): Promise<void> {
    // TODO: Integrate with email service
    logInfo("subscription", `Reminder email queued for ${userEmail}`, {
        email: userEmail,
        tier: tierName,
        price: tierPrice,
        expiresAt: expiresAt.toISOString(),
    });
}

/**
 * Send renewal success email
 * TODO: Implement actual email sending
 */
async function sendRenewalSuccessEmail(
    userEmail: string,
    tierName: string,
    newExpiresAt: Date,
    amountPaid: number
): Promise<void> {
    // TODO: Integrate with email service
    logInfo("subscription", `Renewal success email queued for ${userEmail}`, {
        email: userEmail,
        tier: tierName,
        newExpiresAt: newExpiresAt.toISOString(),
        amountPaid,
    });
}

/**
 * Send downgrade notification email
 * TODO: Implement actual email sending
 */
async function sendDowngradeEmail(
    userEmail: string,
    oldTierName: string
): Promise<void> {
    // TODO: Integrate with email service
    logInfo("subscription", `Downgrade email queued for ${userEmail}`, {
        email: userEmail,
        oldTier: oldTierName,
    });
}

/**
 * Main subscription renewal job
 * Should be run daily (e.g., via cron at 00:00 WIB)
 */
export async function processSubscriptionRenewals(): Promise<RenewalResult> {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const result: RenewalResult = {
        totalProcessed: 0,
        renewed: 0,
        remindersSent: 0,
        downgraded: 0,
        failed: 0,
        details: [],
    };

    try {
        // Get all active subscriptions with auto_renewal enabled
        // that will expire within the next 3 days (or already expired)
        const expiringSubscriptions = await db
            .select({
                subscription: subscriptions,
                tier: pricingTiers,
                user: {
                    id: users.id,
                    email: users.email,
                    name: users.name,
                },
            })
            .from(subscriptions)
            .innerJoin(pricingTiers, eq(subscriptions.tierId, pricingTiers.id))
            .innerJoin(users, eq(subscriptions.userId, users.id))
            .where(
                and(
                    eq(subscriptions.status, "active"),
                    eq(subscriptions.autoRenewal, true),
                    lte(subscriptions.currentPeriodEnd, threeDaysFromNow)
                )
            );

        result.totalProcessed = expiringSubscriptions.length;

        if (expiringSubscriptions.length === 0) {
            logInfo("subscription", "No subscriptions due for renewal");
            return result;
        }

        const freeTierId = await getFreeTierId();

        for (const { subscription, tier, user } of expiringSubscriptions) {
            try {
                // Skip if currentPeriodEnd is null (shouldn't happen, but safety check)
                if (!subscription.currentPeriodEnd) {
                    logError("subscription", `Subscription ${subscription.id} has null currentPeriodEnd`, {
                        userId: user.id,
                    });
                    result.failed++;
                    result.details.push({
                        subscriptionId: subscription.id,
                        userId: user.id,
                        tierName: tier.name,
                        action: "failed",
                        message: "Subscription has null currentPeriodEnd",
                    });
                    continue;
                }

                const wallet = await getOrCreateWallet(user.id);
                const tierPrice = tier.priceMonthly || 0;
                const periodEnd = subscription.currentPeriodEnd; // Non-null after check
                const isAlreadyExpired = periodEnd <= now;

                // Scenario 1: Already expired and insufficient balance -> Downgrade to Free
                if (isAlreadyExpired && wallet.balance < tierPrice) {
                    if (freeTierId) {
                        await db
                            .update(subscriptions)
                            .set({
                                tierId: freeTierId,
                                status: "active",
                                autoRenewal: false, // Disable auto-renewal after downgrade
                                updatedAt: now,
                            })
                            .where(eq(subscriptions.id, subscription.id));

                        await sendDowngradeEmail(user.email, tier.displayName);
                    }

                    result.downgraded++;
                    result.details.push({
                        subscriptionId: subscription.id,
                        userId: user.id,
                        tierName: tier.name,
                        action: "downgraded",
                        message: `Downgraded to Free tier - subscription expired and insufficient balance`,
                        metadata: {
                            balance: wallet.balance,
                            required: tierPrice,
                            expiredAt: periodEnd,
                        },
                    });

                    logWarning("subscription", `User ${user.email} downgraded to Free tier`, {
                        userId: user.id,
                        oldTier: tier.name,
                        balance: wallet.balance,
                    });
                    continue;
                }

                // Scenario 2: Sufficient balance -> Renew subscription
                if (wallet.balance >= tierPrice) {
                    // Deduct balance
                    await addWalletTransaction({
                        walletId: wallet.id,
                        type: "subscription",
                        amount: -tierPrice,
                        description: `Auto-renewal: ${tier.displayName} subscription`,
                        referenceId: subscription.id,
                    });

                    // Extend subscription period
                    const newPeriodEnd = calculateNextPeriodEnd(periodEnd);

                    // If the subscription was already expired, use current date as start
                    const newPeriodStart = isAlreadyExpired ? now : periodEnd;

                    await db
                        .update(subscriptions)
                        .set({
                            currentPeriodStart: newPeriodStart,
                            currentPeriodEnd: newPeriodEnd,
                            status: "active",
                            updatedAt: now,
                        })
                        .where(eq(subscriptions.id, subscription.id));

                    await sendRenewalSuccessEmail(user.email, tier.displayName, newPeriodEnd, tierPrice);

                    result.renewed++;
                    result.details.push({
                        subscriptionId: subscription.id,
                        userId: user.id,
                        tierName: tier.name,
                        action: "renewed",
                        message: `Successfully renewed until ${newPeriodEnd.toISOString()}`,
                        metadata: {
                            amountPaid: tierPrice,
                            previousBalance: wallet.balance,
                            newExpiresAt: newPeriodEnd.toISOString(),
                        },
                    });

                    logInfo("subscription", `User ${user.email} subscription renewed`, {
                        userId: user.id,
                        tier: tier.name,
                        amount: tierPrice,
                        newExpiresAt: newPeriodEnd.toISOString(),
                    });
                    continue;
                }

                // Scenario 3: Insufficient balance but not yet expired -> Send reminder
                const daysUntilExpiry = Math.floor(
                    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                await sendInsufficientBalanceReminder(
                    user.email,
                    tier.displayName,
                    tierPrice,
                    periodEnd
                );

                result.remindersSent++;
                result.details.push({
                    subscriptionId: subscription.id,
                    userId: user.id,
                    tierName: tier.name,
                    action: "reminder",
                    message: `Insufficient balance reminder sent - ${daysUntilExpiry} days until expiry`,
                    metadata: {
                        balance: wallet.balance,
                        required: tierPrice,
                        daysUntilExpiry,
                        expiresAt: periodEnd.toISOString(),
                    },
                });

                logWarning("subscription", `Insufficient balance for renewal - reminder sent`, {
                    userId: user.id,
                    email: user.email,
                    tier: tier.name,
                    balance: wallet.balance,
                    required: tierPrice,
                    daysUntilExpiry,
                });

            } catch (error) {
                result.failed++;
                result.details.push({
                    subscriptionId: subscription.id,
                    userId: user.id,
                    tierName: tier.name,
                    action: "failed",
                    message: error instanceof Error ? error.message : "Unknown error",
                    metadata: {
                        error: error instanceof Error ? error.stack : String(error),
                    },
                });

                logError("subscription", `Failed to process renewal for ${user.email}`, {
                    userId: user.id,
                    subscriptionId: subscription.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        logInfo("subscription", "Subscription renewal job completed", {
            totalProcessed: result.totalProcessed,
            renewed: result.renewed,
            remindersSent: result.remindersSent,
            downgraded: result.downgraded,
            failed: result.failed,
        });

        return result;

    } catch (error) {
        logCritical("subscription", "Subscription renewal job failed", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}

/**
 * Process subscriptions that expired today and should be downgraded
 * This is a safety net for any subscriptions that may have been missed
 */
export async function processExpiredDowngrades(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let downgraded = 0;

    try {
        // Get subscriptions that expired today with auto_renewal=true
        const expiredToday = await db
            .select({
                subscription: subscriptions,
                tier: pricingTiers,
                user: {
                    id: users.id,
                    email: users.email,
                },
            })
            .from(subscriptions)
            .innerJoin(pricingTiers, eq(subscriptions.tierId, pricingTiers.id))
            .innerJoin(users, eq(subscriptions.userId, users.id))
            .where(
                and(
                    eq(subscriptions.status, "active"),
                    eq(subscriptions.autoRenewal, true),
                    gte(subscriptions.currentPeriodEnd, startOfDay),
                    lte(subscriptions.currentPeriodEnd, endOfDay)
                )
            );

        const freeTierId = await getFreeTierId();

        for (const { subscription, tier, user } of expiredToday) {
            // Skip if currentPeriodEnd is null (safety check)
            if (!subscription.currentPeriodEnd) {
                continue;
            }

            const wallet = await getOrCreateWallet(user.id);
            const tierPrice = tier.priceMonthly || 0;

            // Only downgrade if insufficient balance
            if (wallet.balance < tierPrice && freeTierId) {
                await db
                    .update(subscriptions)
                    .set({
                        tierId: freeTierId,
                        status: "active",
                        autoRenewal: false,
                        updatedAt: now,
                    })
                    .where(eq(subscriptions.id, subscription.id));

                await sendDowngradeEmail(user.email, tier.displayName);

                downgraded++;

                logWarning("subscription", `User ${user.email} downgraded to Free tier (expired today)`, {
                    userId: user.id,
                    oldTier: tier.name,
                    balance: wallet.balance,
                });
            }
        }

        return downgraded;

    } catch (error) {
        logError("subscription", "Expired downgrade job failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
