import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupOrders, paymentGatewayConfig } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateWallet, addWalletTransaction } from "@/lib/wallet";
import { logInfo, logError, logWarning } from "@/lib/system-logger";

/**
 * POST /api/webhooks/xendit/invoice
 * Handle Xendit invoice payment callback
 */
export async function POST(request: NextRequest) {
    let walletId: string | undefined;
    let orderId: string | undefined;

    try {
        // Get Xendit config from database to verify callback token
        const xenditConfig = await db.query.paymentGatewayConfig.findFirst({
            where: and(
                eq(paymentGatewayConfig.provider, "xendit"),
                eq(paymentGatewayConfig.isActive, true)
            ),
        });

        if (!xenditConfig || !xenditConfig.config) {
            await logWarning("payment", "Xendit gateway not configured or not active");
            return NextResponse.json(
                { error: "Gateway not configured" },
                { status: 503 }
            );
        }

        const expectedToken = (xenditConfig.config as { callbackToken?: string }).callbackToken;

        // Verify Xendit callback token
        const callbackToken = request.headers.get("x-callback-token");

        if (!expectedToken || callbackToken !== expectedToken) {
            await logWarning("payment", "Invalid Xendit callback token received", {
                receivedToken: callbackToken?.substring(0, 10) + "...",
                hasExpectedToken: !!expectedToken,
            });
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
            xenditInvoiceId,
        });

        // Find the order by externalId (our generated invoice number like TOPUP20260210...)
        const order = await db.query.topupOrders.findFirst({
            where: eq(topupOrders.externalId, external_id),
        });

        if (!order) {
            await logWarning("payment", `Order not found for Xendit webhook: ${external_id}`, {
                externalId: external_id,
                searchedField: "externalId",
            });
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        orderId = order.id;

        await logInfo("payment", `Order found for ${external_id}`, {
            orderId: order.id,
            externalId: order.externalId,
            currentStatus: order.status,
            amount: order.amount,
            userId: order.userId,
        });

        // Only process if order is still pending
        if (order.status !== "pending") {
            await logInfo("payment", `Order ${external_id} already processed, skipping`, {
                orderId: order.id,
                currentStatus: order.status,
            });
            return NextResponse.json({ success: true, message: "Already processed" });
        }

        if (status === "PAID" || status === "SETTLED") {
            await logInfo("payment", `Processing PAID status for order ${order.id}`);

            // Get user's wallet
            const wallet = await getOrCreateWallet(order.userId);
            walletId = wallet.id;

            await logInfo("payment", `Wallet retrieved for user`, {
                userId: order.userId,
                walletId: wallet.id,
                currentBalance: wallet.balance,
                topupAmount: order.amount,
                expectedBalance: wallet.balance + order.amount,
            });

            // Add transaction to wallet
            await logInfo("payment", `Calling addWalletTransaction...`);
            const transactionResult = await addWalletTransaction({
                walletId: wallet.id,
                type: "topup",
                amount: order.amount,
                description: `Top-up via ${payment_method || "Xendit"}`,
                referenceId: order.id,
                gatewayPaymentId: xenditInvoiceId,
                gatewayProvider: "xendit",
            });

            await logInfo("payment", `Transaction added successfully`, {
                transactionId: transactionResult.transaction.id,
                newBalance: transactionResult.wallet.balance,
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
                walletId: wallet.id,
                newBalance: transactionResult.wallet.balance,
                transactionId: transactionResult.transaction.id,
            }, order.userId);

            return NextResponse.json({
                success: true,
                message: "Payment processed",
                newBalance: transactionResult.wallet.balance,
            });
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        await logError("payment", `Xendit webhook processing failed: ${errorMessage}`, {
            orderId,
            walletId,
            error: errorMessage,
            stack: errorStack,
        });

        return NextResponse.json(
            {
                error: "Webhook processing failed",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
