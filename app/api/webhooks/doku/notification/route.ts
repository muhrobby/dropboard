import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateWallet, addWalletTransaction } from "@/lib/wallet";
import { logInfo, logError, logWarning } from "@/lib/system-logger";
import crypto from "crypto";

/**
 * Verify DOKU webhook signature
 */
function verifyDOKUSignature(
    body: string,
    signature: string | null,
    timestamp: string | null,
    clientId: string | null
): boolean {
    const expectedClientId = process.env.DOKU_CLIENT_ID;
    const secretKey = process.env.DOKU_SECRET_KEY;

    if (!expectedClientId || !secretKey || !signature || !timestamp || !clientId) {
        return false;
    }

    if (clientId !== expectedClientId) {
        return false;
    }

    // DOKU signature verification
    const digest = crypto.createHash("sha256").update(body).digest("base64");
    const signatureData = `Client-Id:${clientId}\nRequest-Timestamp:${timestamp}\nDigest:${digest}`;
    const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(signatureData)
        .digest("base64");

    return signature === `HMACSHA256=${expectedSignature}`;
}

/**
 * POST /api/webhooks/doku/notification
 * Handle DOKU payment notification callback
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("signature");
        const timestamp = request.headers.get("request-timestamp");
        const clientId = request.headers.get("client-id");

        // Verify signature
        if (!verifyDOKUSignature(rawBody, signature, timestamp, clientId)) {
            await logWarning("payment", "Invalid DOKU signature received");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        const body = JSON.parse(rawBody);
        const { order, transaction } = body;
        const orderId = order?.invoice_number;
        const status = transaction?.status;
        const paymentMethod = body?.channel?.id;

        await logInfo("payment", `DOKU webhook received: ${status}`, {
            orderId,
            status,
            paymentMethod,
        });

        if (!orderId) {
            await logWarning("payment", "DOKU webhook missing order ID");
            return NextResponse.json(
                { error: "Missing order ID" },
                { status: 400 }
            );
        }

        // Find the order
        const existingOrder = await db.query.topupOrders.findFirst({
            where: eq(topupOrders.id, orderId),
        });

        if (!existingOrder) {
            await logWarning("payment", `Order not found for DOKU webhook: ${orderId}`);
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        // Only process if order is still pending
        if (existingOrder.status !== "pending") {
            await logInfo("payment", `Order ${orderId} already processed, skipping`);
            return NextResponse.json({ success: true, message: "Already processed" });
        }

        if (status === "SUCCESS") {
            // Get user's wallet
            const wallet = await getOrCreateWallet(existingOrder.userId);

            // Add transaction to wallet
            await addWalletTransaction({
                walletId: wallet.id,
                type: "topup",
                amount: existingOrder.amount,
                description: `Top-up via ${paymentMethod || "DOKU"}`,
                referenceId: existingOrder.id,
                gatewayPaymentId: transaction?.id,
                gatewayProvider: "doku",
            });

            // Update order status
            await db
                .update(topupOrders)
                .set({
                    status: "paid",
                    paidAt: new Date(),
                    paymentMethod,
                    updatedAt: new Date(),
                })
                .where(eq(topupOrders.id, existingOrder.id));

            await logInfo("payment", `Top-up successful: ${existingOrder.id}`, {
                orderId: existingOrder.id,
                amount: existingOrder.amount,
                userId: existingOrder.userId,
            }, existingOrder.userId);

            return NextResponse.json({ success: true, message: "Payment processed" });
        }

        if (status === "EXPIRED" || status === "FAILED") {
            await db
                .update(topupOrders)
                .set({
                    status: status === "EXPIRED" ? "expired" : "failed",
                    updatedAt: new Date(),
                })
                .where(eq(topupOrders.id, existingOrder.id));

            await logInfo("payment", `Order ${status.toLowerCase()}: ${existingOrder.id}`, {
                orderId: existingOrder.id,
            }, existingOrder.userId);

            return NextResponse.json({ success: true, message: `Order marked as ${status.toLowerCase()}` });
        }

        // Log other statuses
        await logInfo("payment", `DOKU status update: ${status}`, {
            orderId: existingOrder.id,
            status,
        }, existingOrder.userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DOKU webhook error:", error);
        await logError("payment", `DOKU webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);

        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
