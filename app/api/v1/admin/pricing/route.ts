/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { pricingTiers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod/v4";

const createTierSchema = z.object({
    name: z.string().min(1).max(50),
    displayName: z.string().min(1).max(50),
    priceMonthly: z.number().min(0),
    priceYearly: z.number().min(0),
    maxWorkspaces: z.number().min(1),
    maxTeamWorkspaces: z.number().min(0),
    maxTeamMembers: z.number().min(0),
    storageLimitBytes: z.number().min(0),
    maxFileSizeBytes: z.number().min(0),
    retentionDays: z.number().min(0),
    maxWebhooks: z.number().min(0),
    hasPrioritySupport: z.boolean().default(false),
    hasCustomBranding: z.boolean().default(false),
    hasSso: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.number().default(0),
});

export async function GET() {
    try {
        await requireAdmin();
        const tiers = await db.query.pricingTiers.findMany({
            orderBy: [desc(pricingTiers.sortOrder), desc(pricingTiers.createdAt)]
        });
        return NextResponse.json({ success: true, data: tiers });
    } catch (error) {
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: "Failed to fetch pricing tiers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await requireAdmin();
        const body = await req.json();
        
        const result = createTierSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
        }

        const [newTier] = await db.insert(pricingTiers).values(result.data).returning();
        
        return NextResponse.json({ success: true, data: newTier }, { status: 201 });
    } catch (error: any) {
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }
        if (error.code === '23505') { // Unique violation in Postgres
             return NextResponse.json({ success: false, error: "Tier with this name already exists" }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: "Failed to create pricing tier" }, { status: 500 });
    }
}
