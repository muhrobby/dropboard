/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { pricingTiers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const updateTierSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    displayName: z.string().min(1).max(50).optional(),
    priceMonthly: z.number().min(0).optional(),
    priceYearly: z.number().min(0).optional(),
    maxWorkspaces: z.number().min(1).optional(),
    maxTeamWorkspaces: z.number().min(0).optional(),
    maxTeamMembers: z.number().min(0).optional(),
    storageLimitBytes: z.number().min(0).optional(),
    maxFileSizeBytes: z.number().min(0).optional(),
    retentionDays: z.number().min(0).optional(),
    maxWebhooks: z.number().min(0).optional(),
    hasPrioritySupport: z.boolean().optional(),
    hasCustomBranding: z.boolean().optional(),
    hasSso: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
});

export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const { id } = await props.params;
        const body = await req.json();
        
        const result = updateTierSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
        }

        const [updatedTier] = await db.update(pricingTiers)
            .set({ ...result.data, updatedAt: new Date() })
            .where(eq(pricingTiers.id, id))
            .returning();
            
        if (!updatedTier) {
             return NextResponse.json({ success: false, error: "Tier not found" }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, data: updatedTier }, { status: 200 });
    } catch (error: any) {
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }
        if (error.code === '23505') {
             return NextResponse.json({ success: false, error: "Tier with this name already exists" }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: "Failed to update pricing tier" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
     try {
        await requireAdmin();
        const { id } = await props.params;
        
        const [deleted] = await db.delete(pricingTiers).where(eq(pricingTiers.id, id)).returning();
        
        if (!deleted) {
             return NextResponse.json({ success: false, error: "Tier not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Pricing tier deleted" });
     } catch (error) {
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: "Failed to delete pricing tier" }, { status: 500 });
     }
}
