import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { getOrCreateWallet, getWalletBalance } from "@/lib/wallet";
import {
    successResponse,
    serverErrorResponse,
    unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

/**
 * GET /api/v1/wallet/balance
 * Get current wallet balance for authenticated user
 */
export async function GET() {
    try {
        const session = await requireAuth();

        const wallet = await getOrCreateWallet(session.user.id);

        return successResponse({
            balance: wallet.balance,
            formattedBalance: `Rp ${wallet.balance.toLocaleString("id-ID")}`,
        });
    } catch (error) {
        if (error instanceof AppError) {
            return unauthorizedResponse(error.message);
        }
        return serverErrorResponse();
    }
}
