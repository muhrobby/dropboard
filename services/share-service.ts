import { db } from "@/db";
import { shares, items, fileAssets } from "@/db/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logActivity } from "./activity-service";

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

  // Get file asset if item is a drop
  let fileAsset = null;
  if (item.type === "drop" && item.fileAssetId) {
    fileAsset = await db.query.fileAssets.findFirst({
      where: eq(fileAssets.id, item.fileAssetId),
    });
  }

  return { share, item, fileAsset };
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
