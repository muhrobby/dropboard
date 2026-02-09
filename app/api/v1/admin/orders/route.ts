import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { topupOrders } from "@/db/schema";
import { desc, like, eq, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "all";
        const offset = (page - 1) * limit;

        const whereClause = [];

        if (status !== "all") {
            whereClause.push(eq(topupOrders.status, status.toUpperCase()));
        }

        // Note: detailed search might require joining with users table, utilizing only order ID for now if search matches ID format
        if (search) {
            whereClause.push(like(topupOrders.id, `%${search}%`));
        }

        // Combine conditions
        const finalWhere = whereClause.length > 0 ? (
            whereClause.length > 1 ? and(...whereClause) : whereClause[0]
        ) : undefined;

        // Helper for 'and' since I didn't import it in valid scope above, let's just fix imports
        // Actually I need to import 'and' from drizzle-orm

        const orders = await db.query.topupOrders.findMany({
            where: finalWhere,
            limit,
            offset,
            orderBy: [desc(topupOrders.createdAt)],
            with: {
                user: true,
            },
        });

        // Get total count for pagination
        // This is a bit complex with dynamic where, simplified for now to just return list
        // In production we'd run a count query with same where clause

        return NextResponse.json({
            data: orders,
            meta: {
                page,
                limit,
                // total: countResult.value 
            }
        });

    } catch (error) {
        console.error("Error fetching admin orders:", error);
        
        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}

import { and } from "drizzle-orm";
