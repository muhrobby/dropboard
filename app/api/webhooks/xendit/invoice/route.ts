import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupOrders, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateWallet, addWalletTransaction } from "@/lib/wallet";
import { logInfo, logError, logWarning } from "@/lib/system-logger";

/**
 * POST /api/webhooks/xendit/invoice
 * Handle Xendit invoice payment callback
 */
export async function POST(request: NextRequest) {
    try {
        // Verify Xendit callback token
        const callbackToken = request.headers.get("x-callback-token");
        const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;

        if (!expectedToken || callbackToken !== expectedToken) {
            await logWarning("payment", "Invalid Xendit callback token received");
            return NextResponse.json(
                { error: "Invalid callback token" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { external_id, status, paid_amount, payment_method, id: xenditInvoiceId } = body;

        await logInfo("payment", `Xendit webhook received: ${status}`, {
            externalId: external_id,
            status,
            paidAmount: paid_amount,
            paymentMethod: payment_method,
        });

        // Find the order by external_id (our order ID)
        const order = await db.query.topupOrders.findFirst({
            where: eq(topupOrders.id, external_id),
        });

        if (!order) {
            await logWarning("payment", `Order not found for Xendit webhook: ${external_id}`);
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        // Only process if order is still pending
        if (order.status !== "pending") {
            await logInfo("payment", `Order ${external_id} already processed, skipping`);
            return NextResponse.json({ success: true, message: "Already processed" });
        }

        if (status === "PAID" || status === "SETTLED") {
            // Get user's wallet
            const wallet = await getOrCreateWallet(order.userId);

            // Add transaction to wallet
            await addWalletTransaction({
                walletId: wallet.id,
                type: "topup",
                amount: order.amount,
                description: `Top-up via ${payment_method || "Xendit"}`,
                referenceId: order.id,
                gatewayPaymentId: xenditInvoiceId,
                gatewayProvider: "xendit",
            });

            // Update order status
            await db
                .update(topupOrders)
                .set({
                    status: "paid",
                    paidAt: new Date(),
                    paymentMethod: payment_method,
                    updatedAt: new Date(),
                })
                .where(eq(topupOrders.id, order.id));

            await logInfo("payment", `Top-up successful: ${order.id}`, {
                orderId: order.id,
                amount: order.amount,
                userId: order.userId,
            }, order.userId);

            return NextResponse.json({ success: true, message: "Payment processed" });
        }

        if (status === "EXPIRED") {
            await db
                .update(topupOrders)
                .set({
                    status: "expired",
                    updatedAt: new Date(),
                })
                .where(eq(topupOrders.id, order.id));

            await logInfo("payment", `Order expired: ${order.id}`, {
                orderId: order.id,
            }, order.userId);

            return NextResponse.json({ success: true, message: "Order marked as expired" });
        }

        // Log other statuses
        await logInfo("payment", `Xendit status update: ${status}`, {
            orderId: order.id,
            status,
        }, order.userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Xendit webhook error:", error);
        await logError("payment", `Xendit webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);

        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
