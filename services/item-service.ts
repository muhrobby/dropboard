import { db } from "@/db";
import { items, fileAssets } from "@/db/schema";
import { eq, and, desc, isNull, gt, sql, type SQL } from "drizzle-orm";
import { ulid } from "ulid";
import { NotFoundError, QuotaExceededError } from "@/lib/errors";
import { DEFAULT_RETENTION_DAYS, FREE_PINNED_LIMIT } from "@/lib/constants";
import { deleteFile } from "@/lib/file-storage";
import { buildSignedUrl } from "@/lib/file-storage";
import type { ItemType } from "@/types";
import { logActivity } from "./activity-service";
import { getUserTierLimits } from "@/lib/tier-guard";

function formatItemSecurely(row: { item: typeof items.$inferSelect; fileAsset: typeof fileAssets.$inferSelect | null }) {
  const isProtected = !!row.item.passwordHash;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeItem } = row.item;

  return {
    ...safeItem,
    content: isProtected ? null : safeItem.content,
    note: isProtected ? null : safeItem.note,
    isProtected,
    fileAsset: row.fileAsset
      ? {
          ...row.fileAsset,
          downloadUrl: isProtected ? null : buildSignedUrl(row.fileAsset.id),
        }
      : null,
  };
}

async function countPinnedItems(workspaceId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(and(eq(items.workspaceId, workspaceId), eq(items.isPinned, true)));
  return result[0]?.count ?? 0;
}

type LinkMetadataValue = {
  ogImage?: string | null;
  ogDescription?: string | null;
  faviconUrl?: string | null;
} | null;

type CreateItemData = {
  workspaceId: string;
  createdBy: string;
  type: ItemType;
  title: string;
  content?: string | null;
  note?: string | null;
  passwordHash?: string | null;
  tags?: string[];
  isPinned?: boolean;
  retentionDays?: number;
  maxDownloads?: number;
  fileAssetId?: string | null;
  collectionId?: string | null;
  linkMetadata?: LinkMetadataValue;
};

type ListItemsFilters = {
  workspaceId: string;
  type?: ItemType;
  pinned?: boolean;
  page: number;
  limit: number;
};

export async function createItem(data: CreateItemData) {
  const id = ulid();

  const limits = await getUserTierLimits(data.createdBy);

  let expiresAt: Date | null = null;
  let isPinned = data.isPinned ?? false;

  const willBePinned = isPinned || data.type === "link" || data.type === "note";
  if (willBePinned) {
    const pinnedCount = await countPinnedItems(data.workspaceId);
    if (pinnedCount >= FREE_PINNED_LIMIT) {
      throw new QuotaExceededError(
        `Pinned item limit reached (${FREE_PINNED_LIMIT}). Unpin some items to make room.`,
      );
    }
  }

  if (data.retentionDays !== undefined) {
    if (limits.retentionDays !== -1 && data.retentionDays > limits.retentionDays) {
      throw new QuotaExceededError(`Maximum retention days for your tier is ${limits.retentionDays}`);
    }
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.retentionDays);
  } else if (data.type === "drop" && !isPinned) {
    expiresAt = new Date();
    const defaultRetention = limits.retentionDays !== -1 ? limits.retentionDays : DEFAULT_RETENTION_DAYS;
    expiresAt.setDate(expiresAt.getDate() + defaultRetention);
  } else if (data.type === "link" || data.type === "note") {
    isPinned = true;
    expiresAt = null;
  }

  const maxDownloads = data.maxDownloads ?? null;

  const now = new Date();
  await db.insert(items).values({
    id,
    workspaceId: data.workspaceId,
    createdBy: data.createdBy,
    type: data.type,
    title: data.title,
    content: data.content ?? null,
    note: data.note ?? null,
    passwordHash: data.passwordHash ?? null,
    tags: data.tags ?? [],
    isPinned,
    expiresAt,
    maxDownloads,
    fileAssetId: data.fileAssetId ?? null,
    collectionId: data.collectionId ?? null,
    linkMetadata: data.linkMetadata ?? null,
    createdAt: now,
    updatedAt: now,
  });

  logActivity({
    workspaceId: data.workspaceId,
    actorId: data.createdBy,
    action: "ITEM_CREATED",
    targetType: data.type,
    targetId: id,
    metadata: { title: data.title },
  });

  return getItem(id);
}

export async function listItems(filters: ListItemsFilters) {
  const conditions: SQL[] = [
    eq(items.workspaceId, filters.workspaceId),
    // Exclude deleted items
    isNull(items.deletedAt),
    // Exclude expired items
    sql`(${items.expiresAt} IS NULL OR ${items.expiresAt} > NOW())`,
  ];

  if (filters.type) {
    conditions.push(eq(items.type, filters.type));
  }

  if (filters.pinned !== undefined) {
    conditions.push(eq(items.isPinned, filters.pinned));
  }

  const where = and(...conditions);
  const offset = (filters.page - 1) * filters.limit;

  const [data, countResult] = await Promise.all([
    db
      .select({
        item: items,
        fileAsset: fileAssets,
      })
      .from(items)
      .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
      .where(where)
      .orderBy(desc(items.createdAt))
      .limit(filters.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  const safeItems = data.map(formatItemSecurely);

  return {
    data: safeItems,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
}

export async function getRawItem(id: string) {
  const result = await db
    .select({
      item: items,
      fileAsset: fileAssets,
    })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(eq(items.id, id))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError("Item not found");
  }

  const row = result[0];
  return {
    ...row.item,
    fileAsset: row.fileAsset
      ? {
          ...row.fileAsset,
          downloadUrl: buildSignedUrl(row.fileAsset.id),
        }
      : null,
  };
}

export async function getItem(id: string) {
  const result = await db
    .select({
      item: items,
      fileAsset: fileAssets,
    })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(and(eq(items.id, id), isNull(items.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError("Item not found");
  }

  return formatItemSecurely(result[0]);
}

export async function updateItem(
  id: string,
  data: {
    title?: string;
    note?: string | null;
    content?: string;
    tags?: string[];
    collectionId?: string | null;
  },
) {
  // Verify exists
  await getItem(id);

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.collectionId !== undefined) updateData.collectionId = data.collectionId;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(items).set(updateData).where(eq(items.id, id));
  }

  return getItem(id);
}

export async function deleteItem(id: string, actorId?: string) {
  const item = await getItem(id);

  // Soft delete: set deletedAt timestamp
  await db
    .update(items)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(items.id, id));

  logActivity({
    workspaceId: item.workspaceId,
    actorId: actorId || item.createdBy,
    action: "ITEM_DELETED",
    targetType: item.type,
    targetId: id,
    metadata: { title: item.title },
  });
}

export async function restoreItem(id: string, actorId?: string) {
  // Get item including deleted ones
  const result = await db
    .select({ item: items, fileAsset: fileAssets })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(eq(items.id, id))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError("Item not found");
  }

  const item = result[0].item;

  if (!item.deletedAt) {
    throw new NotFoundError("Item is not in trash");
  }

  // Restore: clear deletedAt
  await db
    .update(items)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(items.id, id));

  logActivity({
    workspaceId: item.workspaceId,
    actorId: actorId || item.createdBy,
    action: "ITEM_CREATED", // Using ITEM_CREATED as "restored" event
    targetType: item.type,
    targetId: id,
    metadata: { title: item.title, restored: true },
  });

  return getItem(id);
}

export async function listTrashItems(filters: {
  workspaceId: string;
  page: number;
  limit: number;
}) {
  const offset = (filters.page - 1) * filters.limit;

  const [data, countResult] = await Promise.all([
    db
      .select({ item: items, fileAsset: fileAssets })
      .from(items)
      .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
      .where(
        and(
          eq(items.workspaceId, filters.workspaceId),
          sql`${items.deletedAt} IS NOT NULL`,
        ),
      )
      .orderBy(desc(items.deletedAt))
      .limit(filters.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(
        and(
          eq(items.workspaceId, filters.workspaceId),
          sql`${items.deletedAt} IS NOT NULL`,
        ),
      ),
  ]);

  const total = countResult[0]?.count ?? 0;

  const safeItems = data.map(formatItemSecurely);

  return {
    data: safeItems,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
}

export async function permanentDeleteItem(id: string) {
  // Get item including deleted ones
  const result = await db
    .select({ item: items, fileAsset: fileAssets })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(eq(items.id, id))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError("Item not found");
  }

  const item = result[0];

  // Delete associated file asset and file from disk
  if (item.fileAsset) {
    await deleteFile(item.fileAsset.storagePath);
    await db.delete(fileAssets).where(eq(fileAssets.id, item.fileAsset.id));
  }

  await db.delete(items).where(eq(items.id, id));
}

export async function pinItem(id: string) {
  const item = await getItem(id);

  // Check pinned quota before pinning
  if (!item.isPinned) {
    const pinnedCount = await countPinnedItems(item.workspaceId);
    if (pinnedCount >= FREE_PINNED_LIMIT) {
      throw new QuotaExceededError(
        `Pinned item limit reached (${FREE_PINNED_LIMIT}). Unpin some items to make room.`,
      );
    }
  }

  await db
    .update(items)
    .set({ isPinned: true, expiresAt: null })
    .where(eq(items.id, id));

  logActivity({
    workspaceId: item.workspaceId,
    actorId: item.createdBy,
    action: "ITEM_PINNED",
    targetType: item.type,
    targetId: id,
    metadata: { title: item.title },
  });

  return getItem(id);
}

export async function setAvailableOffline(id: string, availableOffline: boolean) {
  const item = await getItem(id);
  await db
    .update(items)
    .set({ availableOffline, updatedAt: new Date() })
    .where(eq(items.id, id));
  return getItem(id);
}

export async function unpinItem(id: string) {
  const item = await getItem(id);

  // Only drops can be unpinned (links/notes are always pinned)
  if (item.type !== "drop") {
    return getItem(id);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_RETENTION_DAYS);

  await db
    .update(items)
    .set({ isPinned: false, expiresAt })
    .where(eq(items.id, id));

  logActivity({
    workspaceId: item.workspaceId,
    actorId: item.createdBy,
    action: "ITEM_UNPINNED",
    targetType: item.type,
    targetId: id,
    metadata: { title: item.title },
  });

  return getItem(id);
}
