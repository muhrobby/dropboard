import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { topupOrders } from "@/db/schema";
import { getActiveGateway } from "@/lib/payment-gateway";
import { getOrCreateWallet } from "@/lib/wallet";
import { logInfo, logError } from "@/lib/system-logger";
import {
    createdResponse,
    serverErrorResponse,
    unauthorizedResponse,
    validationErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const topupSchema = z.object({
    amount: z.number().min(10000, "Minimum top-up adalah Rp 10.000").max(10000000, "Maximum top-up adalah Rp 10.000.000"),
    paymentMethod: z.string().optional(),
});

/**
 * POST /api/v1/wallet/topup
 * Create a new top-up order
 */
export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const result = topupSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((i) => i.message).join(", ");
            return validationErrorResponse(message);
        }

        const { amount, paymentMethod } = result.data;
        const wallet = await getOrCreateWallet(session.user.id);

        // Get active payment gateway
        const gateway = await getActiveGateway();

        // Generate unique order ID
        const orderId = `TOPUP-${Date.now()}-${session.user.id.slice(0, 8)}`;

        // Create order in database first
        const [order] = await db
            .insert(topupOrders)
            .values({
                userId: session.user.id,
                amount,
                status: "pending",
                paymentMethod,
                gatewayProvider: gateway.provider,
            })
            .returning();

        // Create invoice with payment gateway
        const invoice = await gateway.createInvoice({
            amount,
            description: `Top-up Saldo Dropboard - Rp ${amount.toLocaleString("id-ID")}`,
            externalId: order.id,
            customerEmail: session.user.email,
            customerName: session.user.name,
            paymentMethod,
            expiresInHours: 24,
        });

        // Update order with gateway info
        await db
            .update(topupOrders)
            .set({
                gatewayInvoiceId: invoice.id,
                gatewayInvoiceUrl: invoice.invoiceUrl,
                expiresAt: invoice.expiresAt,
                updatedAt: new Date(),
            })
            .where(eq(topupOrders.id, order.id));

        // Log the event
        await logInfo("wallet", `Top-up order created: ${order.id}`, {
            orderId: order.id,
            amount,
            gateway: gateway.provider,
        }, session.user.id);

        return createdResponse({
            orderId: order.id,
            amount,
            formattedAmount: `Rp ${amount.toLocaleString("id-ID")}`,
            paymentUrl: invoice.invoiceUrl,
            expiresAt: invoice.expiresAt,
            gateway: gateway.provider,
        });
    } catch (error) {
        console.error("Top-up error:", error);

        if (error instanceof AppError) {
            return unauthorizedResponse(error.message);
        }

        await logError("wallet", `Top-up order creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);

        return serverErrorResponse("Gagal membuat order top-up. Silakan coba lagi.");
    }
}

// Need eq for update query
import { eq } from "drizzle-orm";
