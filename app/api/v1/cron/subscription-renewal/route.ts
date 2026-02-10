import { NextRequest, NextResponse } from "next/server";
import { processSubscriptionRenewals } from "@/services/subscription-renewal-service";

/**
 * Cron job endpoint for subscription auto-renewal
 *
 * Run this daily at 00:00 WIB (or your preferred timezone)
 *
 * Example cron configuration:
 * - Vercel: 0 17 * * * (for 00:00 WIB = 17:00 UTC)
 * - node-cron: 0 0 * * *
 *
 * Environment variable required:
 * - CRON_SECRET: Shared secret for authenticating cron requests
 *
 * Example API call:
 * curl -X POST https://yourdomain.com/api/v1/cron/subscription-renewal \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
    try {
        // Verify CRON_SECRET for security
        const authHeader = request.headers.get("authorization");
        const expectedToken = process.env.CRON_SECRET;

        if (!expectedToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" }
                },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" }
                },
                { status: 401 }
            );
        }

        // Process subscription renewals
        const result = await processSubscriptionRenewals();

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalProcessed: result.totalProcessed,
                    renewed: result.renewed,
                    remindersSent: result.remindersSent,
                    downgraded: result.downgraded,
                    failed: result.failed,
                },
                details: result.details,
            },
        });

    } catch (error) {
        console.error("Subscription renewal cron failed:", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Subscription renewal job failed",
                    details: error instanceof Error ? error.message : String(error)
                }
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for manual testing (also requires CRON_SECRET)
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        const expectedToken = process.env.CRON_SECRET;

        if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" }
                },
                { status: 401 }
            );
        }

        // For testing, return dry-run info
        return NextResponse.json({
            success: true,
            message: "Subscription renewal cron endpoint is ready",
            usage: {
                method: "POST",
                headers: {
                    Authorization: "Bearer YOUR_CRON_SECRET"
                },
                cronSchedule: "0 0 * * * (daily at midnight)",
                description: "Processes auto-renewal for subscriptions due within 3 days"
            }
        });

    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: { code: "INTERNAL_ERROR", message: "Failed to get cron info" }
            },
            { status: 500 }
        );
    }
}
