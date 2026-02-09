import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { desc, like, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";

        // For search we need to join users, but Drizzle query builder handles relations.
        // However, filtering by relation field in `findMany` is tricky.
        // For now, we will just fetch wallets with users.

        const walletList = await db.query.wallets.findMany({
            limit,
            orderBy: [desc(wallets.updatedAt)],
            with: {
                user: true,
            },
        });

        // Simple in-memory filter if search is present (not efficient for large data but works for verification)
        const filteredWallets = search
            ? walletList.filter(w =>
                w.user.name?.toLowerCase().includes(search.toLowerCase()) ||
                w.user.email.toLowerCase().includes(search.toLowerCase())
            )
            : walletList;

        return NextResponse.json({
            data: filteredWallets
        });

    } catch (error) {
        console.error("Error fetching admin wallets:", error);
        
        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to fetch wallets" },
            { status: 500 }
        );
    }
}
