import { db } from "@/db";
import { wallets, walletTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TransactionType = "topup" | "subscription" | "refund";

export interface CreateTransactionParams {
    walletId: string;
    type: TransactionType;
    amount: number; // positif untuk masuk, negatif untuk keluar
    description: string;
    referenceId?: string;
    gatewayPaymentId?: string;
    gatewayProvider?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Get or create wallet for a user
 */
export async function getOrCreateWallet(userId: string) {
    // Try to find existing wallet
    const existing = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
    });

    if (existing) return existing;

    // Create new wallet
    const [wallet] = await db
        .insert(wallets)
        .values({
            userId,
            balance: 0,
        })
        .returning();

    return wallet;
}

/**
 * Get wallet balance for a user
 */
export async function getWalletBalance(userId: string): Promise<number> {
    const wallet = await getOrCreateWallet(userId);
    return wallet.balance;
}

/**
 * Add a transaction to wallet (with row locking for safety)
 * Returns the updated wallet and transaction record
 */
export async function addWalletTransaction(params: CreateTransactionParams) {
    return await db.transaction(async (tx) => {
        // Get current wallet with row lock (SELECT FOR UPDATE equivalent)
        const [wallet] = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.id, params.walletId))
            .for("update");

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + params.amount;

        // Prevent negative balance for deductions
        if (balanceAfter < 0) {
            throw new Error("Insufficient balance");
        }

        // Create transaction record
        const [transaction] = await tx
            .insert(walletTransactions)
            .values({
                walletId: params.walletId,
                type: params.type,
                amount: params.amount,
                balanceBefore,
                balanceAfter,
                description: params.description,
                referenceId: params.referenceId,
                gatewayPaymentId: params.gatewayPaymentId,
                gatewayProvider: params.gatewayProvider,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                status: "completed",
            })
            .returning();

        // Update wallet balance
        const [updatedWallet] = await tx
            .update(wallets)
            .set({
                balance: balanceAfter,
                updatedAt: new Date(),
            })
            .where(eq(wallets.id, params.walletId))
            .returning();

        return { wallet: updatedWallet, transaction };
    });
}

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(
    walletId: string,
    limit = 20,
    offset = 0
) {
    return await db.query.walletTransactions.findMany({
        where: eq(walletTransactions.walletId, walletId),
        orderBy: (tx, { desc }) => [desc(tx.createdAt)],
        limit,
        offset,
    });
}

/**
 * Check if user has enough balance
 */
export async function hasEnoughBalance(
    userId: string,
    amount: number
): Promise<boolean> {
    const balance = await getWalletBalance(userId);
    return balance >= amount;
}
