import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { systemLogs } from "@/db/schema";
import { desc, like, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const logs = await db.query.systemLogs.findMany({
            orderBy: [desc(systemLogs.createdAt)],
            limit: 50
        });

        return NextResponse.json({
            data: logs
        });

    } catch (error) {
        console.error("Error fetching admin logs:", error);
        
        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        );
    }
}
