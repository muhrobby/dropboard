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
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";

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

        // Generate invoice number: alphanumeric only, max 30 chars, no symbols
        // Format: TOPUP + YYYYMMDD + random hex (12 chars)
        // Example: TOPUP20260210FB03F3AE538B (24 chars total)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const randomHex = randomBytes(6).toString('hex').toUpperCase(); // 12 hex chars
        const invoiceNumber = `TOPUP${dateStr}${randomHex}`; // TOPUP20260210FB03F3AE538B = 24 chars

        console.log("📝 Generated invoice number:", invoiceNumber, `(length: ${invoiceNumber.length})`);

        // Create order in database with externalId (our invoice number for webhook lookup)
        const [order] = await db
            .insert(topupOrders)
            .values({
                userId: session.user.id,
                amount,
                status: "pending",
                paymentMethod,
                gatewayProvider: gateway.provider,
                externalId: invoiceNumber, // Our invoice number - used for webhook lookup
            })
            .returning();

        // Create invoice with payment gateway
        const invoice = await gateway.createInvoice({
            amount,
            description: `Top-up Saldo Dropboard - Rp ${amount.toLocaleString("id-ID")}`,
            externalId: invoiceNumber, // Send our invoice number to Xendit
            customerEmail: session.user.email,
            customerName: session.user.name,
            paymentMethod,
            expiresInHours: 24,
        });

        // Update order with gateway info (Xendit's invoice ID and payment URL)
        await db
            .update(topupOrders)
            .set({
                gatewayInvoiceId: invoice.id, // Xendit's internal invoice ID
                gatewayInvoiceUrl: invoice.invoiceUrl,
                expiresAt: invoice.expiresAt,
                updatedAt: new Date(),
            })
            .where(eq(topupOrders.id, order.id));

        // Log the event
        await logInfo("wallet", `Top-up order created: ${order.id}`, {
            orderId: order.id,
            amount,
            externalId: invoiceNumber,
            gatewayInvoiceId: invoice.id,
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
