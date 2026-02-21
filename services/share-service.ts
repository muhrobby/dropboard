import { db } from "@/db";
import { shares, items, fileAssets } from "@/db/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logActivity } from "./activity-service";
import { redis } from "@/lib/redis";

const EXPIRY_OPTIONS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  never: null,
} as const;

type ExpiryOption = keyof typeof EXPIRY_OPTIONS;

export async function createShare(
  itemId: string,
  userId: string,
  workspaceId: string,
  expiryOption: ExpiryOption = "7d",
) {
  // Check if item exists and user has access
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

  // Check if share already exists for this item
  const existingShare = await db.query.shares.findFirst({
    where: and(
      eq(shares.itemId, itemId),
      or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date())),
    ),
  });

  if (existingShare) {
    // Return existing share instead of creating new one
    return existingShare;
  }

  // Generate unique token
  const token = randomBytes(32).toString("hex");

  // Calculate expiry
  const expiryDays = EXPIRY_OPTIONS[expiryOption];
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    : null;

  const share = await db
    .insert(shares)
    .values({
      id: ulid(),
      itemId,
      token,
      createdBy: userId,
      expiresAt,
      createdAt: new Date(),
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

export async function getShareByToken(token: string) {
  const cacheKey = `share:token:${token}`;
  
  if (redis) {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Refresh DB data in background if needed, but for now just return cache
      const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      
      // Parse dates since JSON serialization loses them
      if (data.share.expiresAt) data.share.expiresAt = new Date(data.share.expiresAt);
      if (data.share.createdAt) data.share.createdAt = new Date(data.share.createdAt);
      if (data.item.expiresAt) data.item.expiresAt = new Date(data.item.expiresAt);
      if (data.item.createdAt) data.item.createdAt = new Date(data.item.createdAt);
      if (data.item.updatedAt) data.item.updatedAt = new Date(data.item.updatedAt);
      if (data.item.deletedAt) data.item.deletedAt = new Date(data.item.deletedAt);
      
      if (data.fileAsset) {
        if (data.fileAsset.createdAt) data.fileAsset.createdAt = new Date(data.fileAsset.createdAt);
        if (data.fileAsset.updatedAt) data.fileAsset.updatedAt = new Date(data.fileAsset.updatedAt);
      }
      
      // Still need to perform real-time checks for limits
      if (data.share.expiresAt && data.share.expiresAt < new Date()) {
        throw new ValidationError("Share link has expired");
      }
      if (data.item.expiresAt && data.item.expiresAt < new Date()) {
        throw new ValidationError("Shared item has expired");
      }
      
      // For maxDownloads we need real-time count.
      // To keep it simple but accurate, we will fetch the live item if there's a limit.
      if (data.item.maxDownloads !== null) {
        const liveItem = await db.query.items.findFirst({
          where: eq(items.id, data.item.id),
        });
        if (liveItem && liveItem.maxDownloads !== null && liveItem.downloadCount >= liveItem.maxDownloads) {
          throw new ValidationError("Shared item has reached its download limit");
        }
      }
      
      return data;
    }
  }

  const share = await db.query.shares.findFirst({
    where: eq(shares.token, token),
  });

  if (!share) {
    throw new NotFoundError("Share link not found or expired");
  }

  // Check expiry
  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new ValidationError("Share link has expired");
  }

  // Get item with file asset if exists
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, share.itemId), isNull(items.deletedAt)),
  });

  if (!item) {
    throw new NotFoundError("Shared item no longer exists");
  }

  // Check item expiry
  if (item.expiresAt && item.expiresAt < new Date()) {
    throw new ValidationError("Shared item has expired");
  }

  // Check item max downloads
  if (item.maxDownloads !== null && item.downloadCount >= item.maxDownloads) {
    throw new ValidationError("Shared item has reached its download limit");
  }

  // Get file asset if item is a drop
  let fileAsset = null;
  if (item.type === "drop" && item.fileAssetId) {
    fileAsset = await db.query.fileAssets.findFirst({
      where: eq(fileAssets.id, item.fileAssetId),
    });
  }

  const result = { share, item, fileAsset };

  // Cache for 1 minute
  if (redis) {
    // Avoid caching if max downloads is very close to being reached
    const shouldCache = item.maxDownloads === null || (item.maxDownloads - item.downloadCount > 5);
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

  return share;
}

export async function deleteShare(
  shareId: string,
  userId: string,
  workspaceId: string,
) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
  });

  if (!share) {
    throw new NotFoundError("Share not found");
  }

  // Verify user has access to the item
  const item = await db.query.items.findFirst({
    where: eq(items.id, share.itemId),
  });

  if (!item || item.workspaceId !== workspaceId) {
    throw new ForbiddenError("Access denied");
  }

  await db.delete(shares).where(eq(shares.id, shareId));

  logActivity({
    workspaceId,
    actorId: userId,
    action: "SHARE_REVOKED",
    targetType: "item",
    targetId: share.itemId,
  });
}

export async function incrementAccessCount(shareId: string) {
  await db
    .update(shares)
    .set({
      accessCount: db.$count(shares, eq(shares.id, shareId)),
    })
    .where(eq(shares.id, shareId));
}

// Simple increment without complex query
export async function recordShareAccess(shareId: string) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
  });

  if (share) {
    await db
      .update(shares)
      .set({ accessCount: share.accessCount + 1 })
      .where(eq(shares.id, shareId));
  }
}
