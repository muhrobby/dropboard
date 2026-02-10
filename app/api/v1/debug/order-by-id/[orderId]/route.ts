import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupOrders, walletTransactions, systemLogs, wallets } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/v1/debug/order-by-id/:orderId
 * Debug order by UUID order ID (not invoice number)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    try {
        // Find order by ID (UUID)
        const order = await db.query.topupOrders.findFirst({
            where: eq(topupOrders.id, orderId),
        });

        if (!order) {
            return NextResponse.json({
                success: false,
                error: "Order not found",
                orderId,
                message: "No order found with this UUID ID",
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
            limit: 30,
        });

        // Check user wallet
        const wallet = await db.query.wallets.findFirst({
            where: eq(wallets.userId, order.userId),
        });

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                userId: order.userId,
                amount: order.amount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                gatewayProvider: order.gatewayProvider,
                externalId: order.externalId, // Our invoice number (TOPUP20260210...)
                gatewayInvoiceId: order.gatewayInvoiceId, // Xendit's internal ID
                gatewayInvoiceUrl: order.gatewayInvoiceUrl,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
                updatedAt: order.updatedAt,
            },
            wallet: wallet ? {
                id: wallet.id,
                balance: wallet.balance,
                formattedBalance: new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                }).format(wallet.balance),
            } : null,
            walletTransactions: {
                count: transactions.length,
                items: transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    status: tx.status,
                    balanceBefore: tx.balanceBefore,
                    balanceAfter: tx.balanceAfter,
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
            diagnosis: {
                orderStatus: order.status,
                externalId: order.externalId,
                gatewayInvoiceId: order.gatewayInvoiceId,
                walletTransactionExists: transactions.length > 0,
                webhookProcessed: transactions.length > 0 && order.status === "paid",
                issue: order.status === "pending" && transactions.length === 0
                    ? "Webhook was not called or failed"
                    : order.status === "paid" && transactions.length === 0
                    ? "Order marked paid but no wallet transaction (data inconsistency)"
                    : null,
                expectedBalance: wallet
                    ? wallet.balance + (order.status === "pending" ? order.amount : 0)
                    : null,
                webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/api/webhooks/xendit/invoice`,
                invoiceNumberForWebhook: order.externalId, // Should be TOPUP20260210...
                hasExternalId: !!order.externalId,
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
