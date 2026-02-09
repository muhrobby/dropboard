import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { getUserTierLimits, getUserTier } from "@/lib/tier-guard";
import { listUserWorkspaces } from "@/services/workspace-service";
import { formatBytes } from "@/lib/utils";

export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const [tier, limits, workspaces] = await Promise.all([
            getUserTier(userId),
            getUserTierLimits(userId),
            listUserWorkspaces(userId),
        ]);

        // Calculate total storage used by user (only count workspaces they own)
        const storageUsed = workspaces.reduce((acc, ws) => {
            if (ws.role === 'owner') {
                return acc + (ws.storageUsedBytes || 0);
            }
            return acc;
        }, 0);

        // Format features list based on limits
        const features = [
            `${limits.maxWorkspaces} Workspace Personal`,
            limits.maxTeamWorkspaces > 0 ? `${limits.maxTeamWorkspaces} Workspace Team` : null,
            `${formatBytes(limits.storageLimitBytes)} Storage`,
            `Upload max ${formatBytes(limits.maxFileSizeBytes)}/file`,
            `${limits.retentionDays} hari file retention`,
            limits.hasPrioritySupport ? "Priority Support" : null,
            limits.hasCustomBranding ? "Custom Branding" : null,
        ].filter(Boolean) as string[];

        return NextResponse.json({
            data: {
                plan: tier?.displayName || "Free",
                status: "active", // Simplified: assuming active if tier exists or default free
                expiresAt: "Unlimited", // Simplified: real implementation would check subscription table
                autoRenewal: false,
                features,
                usage: {
                    storageUsed,
                    storageLimit: limits.storageLimitBytes,
                    storagePercent: Math.min(100, Math.round((storageUsed / limits.storageLimitBytes) * 100)),
                }
            }
        });

    } catch (error) {
        console.error("Error fetching subscription:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription details" },
            { status: 500 }
        );
    }
}
