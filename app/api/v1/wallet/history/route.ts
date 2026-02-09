import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { getOrCreateWallet, getWalletTransactions } from "@/lib/wallet";
import {
    successResponse,
    serverErrorResponse,
    unauthorizedResponse,
    validationErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const querySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
    type: z.enum(["topup", "subscription", "refund"]).optional(),
});

/**
 * GET /api/v1/wallet/history
 * Get wallet transaction history for authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);

        const queryResult = querySchema.safeParse({
            page: searchParams.get("page") ?? 1,
            limit: searchParams.get("limit") ?? 20,
            type: searchParams.get("type") ?? undefined,
        });

        if (!queryResult.success) {
            const message = queryResult.error.issues.map((i) => i.message).join(", ");
            return validationErrorResponse(message);
        }

        const { page, limit } = queryResult.data;
        const offset = (page - 1) * limit;

        const wallet = await getOrCreateWallet(session.user.id);
        const transactions = await getWalletTransactions(wallet.id, limit, offset);

        // Format transactions for response
        const formattedTransactions = transactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            formattedAmount: `${tx.amount >= 0 ? "+" : ""}Rp ${Math.abs(tx.amount).toLocaleString("id-ID")}`,
            balanceAfter: tx.balanceAfter,
            description: tx.description,
            status: tx.status,
            gatewayProvider: tx.gatewayProvider,
            createdAt: tx.createdAt,
        }));

        return NextResponse.json(
            {
                success: true,
                data: formattedTransactions,
                meta: {
                    page,
                    limit,
                    hasMore: transactions.length === limit,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof AppError) {
            return unauthorizedResponse(error.message);
        }
        return serverErrorResponse();
    }
}
