import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { users, wallets, subscriptions } from "@/db/schema";
import { desc, like, or, sql } from "drizzle-orm";

/**
 * GET /api/v1/admin/users
 * Get all users with their wallet and subscription info
 */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "all";
        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions = [];
        
        if (role !== "all") {
            conditions.push(sql`${users.role} = ${role}`);
        }
        
        if (search) {
            conditions.push(
                or(
                    like(users.name, `%${search}%`),
                    like(users.email, `%${search}%`)
                )
            );
        }

        const finalWhere = conditions.length > 0 ? sql.join(conditions, sql.raw(' AND ')) : undefined;

        // Get users with relations
        const usersList = await db.query.users.findMany({
            limit,
            offset,
            orderBy: [desc(users.createdAt)],
            with: {
                wallet: true,
                subscription: {
                    with: {
                        tier: true,
                    },
                },
            },
        });

        // Filter in memory if needed (more efficient way would be proper join query)
        let filteredUsers = usersList;
        if (search) {
            filteredUsers = usersList.filter(
                (u) =>
                    u.name.toLowerCase().includes(search.toLowerCase()) ||
                    u.email.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (role !== "all") {
            filteredUsers = filteredUsers.filter((u) => u.role === role);
        }

        // Get total count
        const [countResult] = await db
            .select({ value: sql<number>`count(*)` })
            .from(users);

        return NextResponse.json({
            success: true,
            data: filteredUsers,
            meta: {
                page,
                limit,
                total: countResult?.value || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching admin users:", error);

        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
