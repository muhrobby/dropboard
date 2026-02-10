import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, ForbiddenError } from "@/middleware/admin-guard";
import { db } from "@/db";
import { paymentGatewayConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/admin/gateways
 * Get all payment gateway configurations
 */
export async function GET() {
    try {
        await requireSuperAdmin();

        const gateways = await db.query.paymentGatewayConfig.findMany({
            orderBy: (gateways, { asc }) => [asc(gateways.provider)],
        });

        // Mask sensitive config data
        const maskedGateways = gateways.map((gw) => ({
            ...gw,
            config: gw.config
                ? Object.keys(gw.config as Record<string, unknown>).reduce((acc, key) => {
                    acc[key] = "***MASKED***";
                    return acc;
                }, {} as Record<string, string>)
                : null,
        }));

        return NextResponse.json({
            success: true,
            data: maskedGateways,
        });
    } catch (error) {
        console.error("Error fetching gateways:", error);

        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Super admin access required" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch gateways" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/v1/admin/gateways/:id
 * Update gateway configuration
 */
export async function PUT(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const body = await request.json();
        const { id, isActive, isPrimary, config } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Gateway ID is required" },
                { status: 400 }
            );
        }

        // Check if gateway exists
        const existingGateway = await db.query.paymentGatewayConfig.findFirst({
            where: eq(paymentGatewayConfig.id, id),
        });

        if (!existingGateway) {
            return NextResponse.json(
                { error: "Gateway not found" },
                { status: 404 }
            );
        }

        // If setting as primary, unset other primaries
        if (isPrimary) {
            await db
                .update(paymentGatewayConfig)
                .set({ isPrimary: false, updatedAt: new Date() })
                .where(eq(paymentGatewayConfig.isPrimary, true));
        }

        // Merge config carefully
        let newConfig = existingGateway.config;
        if (config) {
            const currentConfig = (existingGateway.config as Record<string, unknown>) || {};
            const incomingConfig = config as Record<string, unknown>;

            newConfig = { ...currentConfig };

            for (const [key, value] of Object.entries(incomingConfig)) {
                // If value is masked, keep existing value
                if (value === "***MASKED***") {
                    continue;
                }
                // Update with new value
                (newConfig as Record<string, unknown>)[key] = value;
            }
        }

        // Update gateway
        const [updated] = await db
            .update(paymentGatewayConfig)
            .set({
                isActive: isActive !== undefined ? isActive : undefined,
                isPrimary: isPrimary !== undefined ? isPrimary : undefined,
                config: newConfig,
                updatedAt: new Date(),
            })
            .where(eq(paymentGatewayConfig.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: "Gateway not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error("Error updating gateway:", error);

        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: "Super admin access required" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Failed to update gateway" },
            { status: 500 }
        );
    }
}
