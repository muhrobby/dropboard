import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { systemLogs } from "@/db/schema";
import { desc, like, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        await requireAuth();
        // TODO: Add Admin role check here

        const logs = await db.query.systemLogs.findMany({
            orderBy: [desc(systemLogs.createdAt)],
            limit: 50
        });

        return NextResponse.json({
            data: logs
        });

    } catch (error) {
        console.error("Error fetching admin logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        );
    }
}
