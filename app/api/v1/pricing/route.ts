import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingTiers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/pricing
 * Get all active pricing tiers
 */
export async function GET(request: NextRequest) {
    try {
        const tiers = await db.query.pricingTiers.findMany({
            where: eq(pricingTiers.isActive, true),
            orderBy: (pricingTiers, { asc }) => [asc(pricingTiers.sortOrder)],
        });

        return NextResponse.json({
            success: true,
            data: tiers,
        });
    } catch (error) {
        console.error("Pricing fetch error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch pricing tiers",
            },
            { status: 500 }
        );
    }
}
