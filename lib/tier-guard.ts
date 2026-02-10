import { db } from "@/db";
import { pricingTiers, subscriptions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export interface TierLimits {
    maxWorkspaces: number;
    maxTeamWorkspaces: number;
    maxTeamMembers: number;
    storageLimitBytes: number;
    maxFileSizeBytes: number;
    retentionDays: number;
    maxWebhooks: number;
    hasPrioritySupport: boolean;
    hasCustomBranding: boolean;
    hasSso: boolean;
}

export interface TierCheckResult {
    allowed: boolean;
    limit: number;
    current: number;
    tierName: string;
    upgradeRequired?: boolean;
}

/**
 * Get user's current tier with limits
 */
export async function getUserTier(userId: string) {
    const subscription = await db.query.subscriptions.findFirst({
        where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active")
        ),
        orderBy: [desc(subscriptions.updatedAt)],
        with: {
            tier: true,
        },
    });

    // Default to free tier if no subscription
    if (!subscription) {
        const freeTier = await db.query.pricingTiers.findFirst({
            where: eq(pricingTiers.name, "free"),
        });
        return freeTier;
    }

    return subscription.tier;
}

/**
 * Get tier limits for a user
 */
export async function getUserTierLimits(userId: string): Promise<TierLimits> {
    const tier = await getUserTier(userId);

    if (!tier) {
        // Fallback defaults (free tier)
        return {
            maxWorkspaces: 1,
            maxTeamWorkspaces: 0,
            maxTeamMembers: 0,
            storageLimitBytes: 2 * 1024 * 1024 * 1024, // 2GB
            maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
            retentionDays: 7,
            maxWebhooks: 0,
            hasPrioritySupport: false,
            hasCustomBranding: false,
            hasSso: false,
        };
    }

    return {
        maxWorkspaces: tier.maxWorkspaces || 1,
        maxTeamWorkspaces: tier.maxTeamWorkspaces || 0,
        maxTeamMembers: tier.maxTeamMembers || 0,
        storageLimitBytes: tier.storageLimitBytes || 2 * 1024 * 1024 * 1024,
        maxFileSizeBytes: tier.maxFileSizeBytes || 10 * 1024 * 1024,
        retentionDays: tier.retentionDays || 7,
        maxWebhooks: tier.maxWebhooks || 0,
        hasPrioritySupport: tier.hasPrioritySupport || false,
        hasCustomBranding: tier.hasCustomBranding || false,
        hasSso: tier.hasSso || false,
    };
}

/**
 * Check if user can create more workspaces
 */
export async function canCreateWorkspace(
    userId: string,
    currentWorkspaceCount: number,
    isTeamWorkspace: boolean
): Promise<TierCheckResult> {
    const tier = await getUserTier(userId);
    const limits = await getUserTierLimits(userId);

    if (isTeamWorkspace) {
        // Count team workspaces
        const allowed = limits.maxTeamWorkspaces === -1 ||
            (limits.maxTeamWorkspaces > 0 && currentWorkspaceCount < limits.maxTeamWorkspaces);
        return {
            allowed,
            limit: limits.maxTeamWorkspaces === -1 ? Infinity : limits.maxTeamWorkspaces,
            current: currentWorkspaceCount,
            tierName: tier?.displayName || "Free",
            upgradeRequired: !allowed,
        };
    }

    // Personal workspaces
    const totalLimit = limits.maxWorkspaces;
    const allowed = totalLimit === -1 ||
        (totalLimit > 0 && currentWorkspaceCount < totalLimit);
    return {
        allowed,
        limit: totalLimit === -1 ? Infinity : totalLimit,
        current: currentWorkspaceCount,
        tierName: tier?.displayName || "Free",
        upgradeRequired: !allowed,
    };
}

/**
 * Check if user can invite team members
 */
export async function canInviteTeamMember(
    userId: string,
    currentMemberCount: number
): Promise<TierCheckResult> {
    const tier = await getUserTier(userId);
    const limits = await getUserTierLimits(userId);

    const allowed = limits.maxTeamMembers > 0 && currentMemberCount < limits.maxTeamMembers;
    return {
        allowed,
        limit: limits.maxTeamMembers,
        current: currentMemberCount,
        tierName: tier?.displayName || "Free",
        upgradeRequired: !allowed,
    };
}

/**
 * Check storage usage
 */
export async function canUploadFile(
    userId: string,
    currentStorageBytes: number,
    fileSizeBytes: number
): Promise<TierCheckResult & { maxFileSize: number }> {
    const tier = await getUserTier(userId);
    const limits = await getUserTierLimits(userId);

    const withinStorage = currentStorageBytes + fileSizeBytes <= limits.storageLimitBytes;
    const withinFileSize = fileSizeBytes <= limits.maxFileSizeBytes;
    const allowed = withinStorage && withinFileSize;

    return {
        allowed,
        limit: limits.storageLimitBytes,
        current: currentStorageBytes,
        maxFileSize: limits.maxFileSizeBytes,
        tierName: tier?.displayName || "Free",
        upgradeRequired: !allowed,
    };
}

/**
 * Check webhook limit
 */
export async function canCreateWebhook(
    userId: string,
    currentWebhookCount: number
): Promise<TierCheckResult> {
    const tier = await getUserTier(userId);
    const limits = await getUserTierLimits(userId);

    const allowed = limits.maxWebhooks > 0 &&
        (limits.maxWebhooks === -1 || currentWebhookCount < limits.maxWebhooks);

    return {
        allowed,
        limit: limits.maxWebhooks === -1 ? Infinity : limits.maxWebhooks,
        current: currentWebhookCount,
        tierName: tier?.displayName || "Free",
        upgradeRequired: !allowed,
    };
}

/**
 * Check if feature is available for user's tier
 */
export async function hasFeature(
    userId: string,
    feature: "priority_support" | "custom_branding" | "sso"
): Promise<boolean> {
    const limits = await getUserTierLimits(userId);

    switch (feature) {
        case "priority_support":
            return limits.hasPrioritySupport;
        case "custom_branding":
            return limits.hasCustomBranding;
        case "sso":
            return limits.hasSso;
        default:
            return false;
    }
}
