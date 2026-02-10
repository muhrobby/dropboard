import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupOrders, walletTransactions, systemLogs, paymentGatewayConfig } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/v1/debug/order/:invoiceId
 * Debug order status - useful for troubleshooting payment issues
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    const { invoiceId } = await params;

    try {
        // Find order
        const order = await db.query.topupOrders.findFirst({
            where: eq(topupOrders.gatewayInvoiceId, invoiceId),
        });

        if (!order) {
            return NextResponse.json({
                success: false,
                error: "Order not found",
                invoiceId,
                suggestions: [
                    "Check if invoice number is correct",
                    "Check if order was created in the system",
                ],
            });
        }

        // Check for related wallet transactions
        const transactions = await db.query.walletTransactions.findMany({
            where: eq(walletTransactions.referenceId, order.id),
        });

        // Check system logs for payment events related to this order
        const logs = await db.query.systemLogs.findMany({
            where: and(
                eq(systemLogs.category, "payment"),
                eq(systemLogs.userId, order.userId)
            ),
            orderBy: [desc(systemLogs.createdAt)],
            limit: 20,
        });

        // Check Xendit config
        const xenditConfig = await db.query.paymentGatewayConfig.findFirst({
            where: and(
                eq(paymentGatewayConfig.provider, "xendit"),
                eq(paymentGatewayConfig.isActive, true)
            ),
        });

        const config = xenditConfig?.config as Record<string, unknown> | undefined;
        const hasCallbackToken = !!config?.callbackToken;

        return NextResponse.json({
            success: true,
            invoiceId,
            order: {
                id: order.id,
                userId: order.userId,
                amount: order.amount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                gatewayProvider: order.gatewayProvider,
                gatewayInvoiceId: order.gatewayInvoiceId,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
                updatedAt: order.updatedAt,
            },
            walletTransactions: {
                count: transactions.length,
                items: transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    status: tx.status,
                    createdAt: tx.createdAt,
                })),
            },
            systemLogs: logs.map(log => ({
                id: log.id,
                level: log.level,
                message: log.message,
                metadata: log.metadata,
                createdAt: log.createdAt,
            })),
            xenditConfig: {
                isActive: !!xenditConfig?.isActive,
                hasCallbackToken,
                callbackTokenPrefix: hasCallbackToken
                    ? (config?.callbackToken as string).substring(0, 10) + "..."
                    : null,
            },
            webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/api/webhooks/xendit/invoice`,
            diagnosis: {
                orderStatus: order.status,
                walletTransactionExists: transactions.length > 0,
                webhookProcessed: transactions.length > 0 && order.status === "paid",
                issue: order.status === "pending" && transactions.length === 0
                    ? "Webhook was not called or failed"
                    : order.status === "paid" && transactions.length === 0
                    ? "Order marked paid but no wallet transaction (data inconsistency)"
                    : null,
            },
        });
    } catch (error) {
        console.error("Debug order error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
