import { db } from "@/db";
import { shares, items, fileAssets, shareAnalytics } from "@/db/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logActivity } from "./activity-service";
import { redis } from "@/lib/redis";
import bcrypt from "bcrypt";

const EXPIRY_OPTIONS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  never: null,
} as const;

type ExpiryOption = keyof typeof EXPIRY_OPTIONS;

export type CreateShareOptions = {
  expiryOption?: ExpiryOption;
  password?: string;
  maxViews?: number | null;
  burnAfterReading?: boolean;
};

export async function createShare(
  itemId: string,
  userId: string,
  workspaceId: string,
  options: CreateShareOptions | ExpiryOption = "7d",
) {
  // Support legacy string argument (backward compatibility)
  const opts: CreateShareOptions =
    typeof options === "string" ? { expiryOption: options } : options;

  const {
    expiryOption = "7d",
    password,
    maxViews = null,
    burnAfterReading = false,
  } = opts;

  // Check if item exists and belongs to workspace
  const item = await db.query.items.findFirst({
    where: and(
      eq(items.id, itemId),
      eq(items.workspaceId, workspaceId),
      isNull(items.deletedAt),
    ),
  });

  if (!item) {
    throw new NotFoundError("Item not found");
  }

  // Check if an active share already exists
  const existingShare = await db.query.shares.findFirst({
    where: and(
      eq(shares.itemId, itemId),
      or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date())),
    ),
  });

  if (existingShare) {
    return existingShare;
  }

  // Generate unique token
  const token = randomBytes(32).toString("hex");

  // Calculate expiry
  const expiryDays = EXPIRY_OPTIONS[expiryOption];
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    : null;

  // Hash password if provided
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const share = await db
    .insert(shares)
    .values({
      itemId,
      token,
      createdBy: userId,
      expiresAt,
      passwordHash,
      maxViews,
      burnAfterReading,
    })
    .returning();

  logActivity({
    workspaceId,
    actorId: userId,
    action: "SHARE_CREATED",
    targetType: "item",
    targetId: itemId,
    metadata: { expiryOption },
  });

  return share[0];
}

export async function updateShare(
  shareId: string,
  userId: string,
  workspaceId: string,
  updates: {
    password?: string | null;
    maxViews?: number | null;
    burnAfterReading?: boolean;
    expiryOption?: ExpiryOption;
  },
) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
  });

  if (!share) throw new NotFoundError("Share not found");

  const item = await db.query.items.findFirst({
    where: eq(items.id, share.itemId),
  });

  if (!item || item.workspaceId !== workspaceId) {
    throw new ForbiddenError("Access denied");
  }

  type ShareUpdate = {
    passwordHash?: string | null;
    maxViews?: number | null;
    burnAfterReading?: boolean;
    expiresAt?: Date | null;
  };
  const patch: ShareUpdate = {};

  if ("password" in updates) {
    patch.passwordHash = updates.password
      ? await bcrypt.hash(updates.password, 10)
      : null;
  }
  if ("maxViews" in updates) patch.maxViews = updates.maxViews ?? null;
  if ("burnAfterReading" in updates)
    patch.burnAfterReading = updates.burnAfterReading;
  if (updates.expiryOption) {
    const days = EXPIRY_OPTIONS[updates.expiryOption];
    patch.expiresAt = days
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;
  }

  const updated = await db
    .update(shares)
    .set(patch)
    .where(eq(shares.id, shareId))
    .returning();

  // Invalidate cache
  if (redis) {
    await redis.del(`share:token:${share.token}`);
  }

  return updated[0];
}

export async function getShareByToken(token: string) {
  const cacheKey = `share:token:${token}`;

  if (redis) {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      const data =
        typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;

      // Parse dates since JSON serialization loses them
      if (data.share.expiresAt) data.share.expiresAt = new Date(data.share.expiresAt);
      if (data.share.createdAt) data.share.createdAt = new Date(data.share.createdAt);
      if (data.item.expiresAt) data.item.expiresAt = new Date(data.item.expiresAt);
      if (data.item.createdAt) data.item.createdAt = new Date(data.item.createdAt);
      if (data.item.updatedAt) data.item.updatedAt = new Date(data.item.updatedAt);
      if (data.item.deletedAt) data.item.deletedAt = new Date(data.item.deletedAt);
      if (data.fileAsset) {
        if (data.fileAsset.createdAt)
          data.fileAsset.createdAt = new Date(data.fileAsset.createdAt);
      }

      if (data.share.expiresAt && data.share.expiresAt < new Date()) {
        throw new ValidationError("Share link has expired");
      }
      if (data.item.expiresAt && data.item.expiresAt < new Date()) {
        throw new ValidationError("Shared item has expired");
      }
      if (data.item.maxDownloads !== null) {
        const liveItem = await db.query.items.findFirst({
          where: eq(items.id, data.item.id),
        });
        if (
          liveItem &&
          liveItem.maxDownloads !== null &&
          liveItem.downloadCount >= liveItem.maxDownloads
        ) {
          throw new ValidationError("Shared item has reached its download limit");
        }
      }

      return data;
    }
  }

  const share = await db.query.shares.findFirst({
    where: eq(shares.token, token),
  });

  if (!share) throw new NotFoundError("Share link not found or expired");

  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new ValidationError("Share link has expired");
  }

  const item = await db.query.items.findFirst({
    where: and(eq(items.id, share.itemId), isNull(items.deletedAt)),
  });

  if (!item) throw new NotFoundError("Shared item no longer exists");

  if (item.expiresAt && item.expiresAt < new Date()) {
    throw new ValidationError("Shared item has expired");
  }

  if (item.maxDownloads !== null && item.downloadCount >= item.maxDownloads) {
    throw new ValidationError("Shared item has reached its download limit");
  }

  // Check max views (share-level)
  if (share.maxViews !== null && share.accessCount >= share.maxViews) {
    throw new ValidationError("This share link has reached its maximum view limit");
  }

  let fileAsset = null;
  if (item.type === "drop" && item.fileAssetId) {
    fileAsset = await db.query.fileAssets.findFirst({
      where: eq(fileAssets.id, item.fileAssetId),
    });
  }

  const result = { share, item, fileAsset };

  // Cache for 1 minute — skip if burn-after-reading or close to limits
  if (redis) {
    const shouldCache =
      !share.burnAfterReading &&
      (item.maxDownloads === null || item.maxDownloads - item.downloadCount > 5) &&
      (share.maxViews === null || share.maxViews - share.accessCount > 5);
    if (shouldCache) {
      await redis.setex(cacheKey, 60, JSON.stringify(result));
    }
  }

  return result;
}

export async function getShareByItemId(itemId: string) {
  const share = await db.query.shares.findFirst({
    where: and(
      eq(shares.itemId, itemId),
      or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date())),
    ),
  });
  return share ?? null;
}

export async function deleteShare(
  shareId: string,
  userId: string,
  workspaceId: string,
) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
  });

  if (!share) throw new NotFoundError("Share not found");

  const item = await db.query.items.findFirst({
    where: eq(items.id, share.itemId),
  });

  if (!item || item.workspaceId !== workspaceId) {
    throw new ForbiddenError("Access denied");
  }

  await db.delete(shares).where(eq(shares.id, shareId));

  // Invalidate cache
  if (redis) {
    await redis.del(`share:token:${share.token}`);
  }

  logActivity({
    workspaceId,
    actorId: userId,
    action: "SHARE_REVOKED",
    targetType: "item",
    targetId: share.itemId,
  });
}

/** Record a view: bump aggregate counter AND write an analytics row. */
export async function recordShareAccess(
  shareId: string,
  meta?: { ipHash?: string; userAgent?: string; referer?: string },
) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
  });

  if (!share) return;

  // Bump aggregate counter
  await db
    .update(shares)
    .set({ accessCount: share.accessCount + 1 })
    .where(eq(shares.id, shareId));

  // Write analytics row (fire-and-forget — never throw)
  db.insert(shareAnalytics)
    .values({
      shareId,
      ipHash: meta?.ipHash ?? null,
      userAgent: meta?.userAgent ?? null,
      referer: meta?.referer ?? null,
    })
    .catch(() => undefined);

  // If burn-after-reading delete the share after recording the access
  if (share.burnAfterReading) {
    db.delete(shares)
      .where(eq(shares.id, shareId))
      .catch(() => undefined);
    if (redis) {
      redis.del(`share:token:${share.token}`).catch(() => undefined);
    }
  }
}

/** Kept for backward compatibility — now delegates to recordShareAccess */
export async function incrementAccessCount(shareId: string) {
  await recordShareAccess(shareId);
}

/** Hash an IP address for anonymous analytics storage */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
