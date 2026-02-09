import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { topupOrders, users, workspaces, subscriptions } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET() {
    try {
        await requireAuth();
        // TODO: Add Admin role check here

        const [revenueResult] = await db
            .select({ value: sql<number>`sum(${topupOrders.amount})` })
            .from(topupOrders)
            .where(eq(topupOrders.status, "PAID"));

        const [userCountResult] = await db
            .select({ value: sql<number>`count(*)` })
            .from(users);

        const [storageResult] = await db
            .select({ value: sql<number>`sum(${workspaces.storageUsedBytes})` })
            .from(workspaces);

        const [subCountResult] = await db
            .select({ value: sql<number>`count(*)` })
            .from(subscriptions)
            .where(eq(subscriptions.status, "active"));

        // Mock recent activity data for chart (DB doesn't have daily aggregation yet)
        // In a real app, we would query daily revenue here

        // Get recent orders for list
        const recentOrders = await db.query.topupOrders.findMany({
            orderBy: (orders, { desc }) => [desc(orders.createdAt)],
            limit: 5,
            with: {
                user: true
            }
        });

        return NextResponse.json({
            data: {
                revenue: revenueResult?.value || 0,
                users: userCountResult?.value || 0,
                storage: storageResult?.value || 0,
                activeSubscriptions: subCountResult?.value || 0,
                recentOrders
            }
        });

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch admin stats" },
            { status: 500 }
        );
    }
}
