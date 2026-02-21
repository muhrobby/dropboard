import { NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { topupOrders, users, workspaces, subscriptions } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET() {
    try {
        await requireAdmin();

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

        // Daily revenue for the last 7 days
        const dailyRevenue = await db
            .select({
                date: sql<string>`DATE_TRUNC('day', ${topupOrders.createdAt})::date::text`,
                amount: sql<number>`COALESCE(SUM(${topupOrders.amount}), 0)::int`
            })
            .from(topupOrders)
            .where(sql`${topupOrders.status} = 'PAID' AND ${topupOrders.createdAt} >= NOW() - INTERVAL '7 days'`)
            .groupBy(sql`DATE_TRUNC('day', ${topupOrders.createdAt})::date`)
            .orderBy(sql`DATE_TRUNC('day', ${topupOrders.createdAt})::date ASC`);

        // Daily new users for the last 7 days
        const dailyUsers = await db
            .select({
                date: sql<string>`DATE_TRUNC('day', ${users.createdAt})::date::text`,
                count: sql<number>`COUNT(*)::int`
            })
            .from(users)
            .where(sql`${users.createdAt} >= NOW() - INTERVAL '7 days'`)
            .groupBy(sql`DATE_TRUNC('day', ${users.createdAt})::date`)
            .orderBy(sql`DATE_TRUNC('day', ${users.createdAt})::date ASC`);

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
                recentOrders,
                dailyRevenue,
                dailyUsers
            }
        });

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        
        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to fetch admin stats" },
            { status: 500 }
        );
    }
}
