import { db } from "@/db";
import { items, fileAssets, itemVersions } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { buildSignedUrl } from "@/lib/file-storage";
import { uploadFile } from "@/services/file-service";
import { logActivity } from "@/services/activity-service";

/**
 * Format a version row with a signed download URL for its file asset.
 */
function formatVersion(row: {
  version: typeof itemVersions.$inferSelect;
  fileAsset: typeof fileAssets.$inferSelect | null;
}) {
  return {
    ...row.version,
    createdAt: row.version.createdAt.toISOString(),
    fileAsset: row.fileAsset
      ? {
          ...row.fileAsset,
          downloadUrl: buildSignedUrl(row.fileAsset.id),
          createdAt: row.fileAsset.createdAt.toISOString(),
        }
      : null,
  };
}

/**
 * List all versions for an item, ordered from newest to oldest.
 */
export async function listVersions(itemId: string, workspaceId: string) {
  const rows = await db
    .select({
      version: itemVersions,
      fileAsset: fileAssets,
    })
    .from(itemVersions)
    .leftJoin(fileAssets, eq(itemVersions.fileAssetId, fileAssets.id))
    .where(
      and(
        eq(itemVersions.itemId, itemId),
        eq(itemVersions.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(itemVersions.versionNumber));

  return rows.map(formatVersion);
}

/**
 * Upload a new version of an item.
 *
 * Flow:
 * 1. Resolve the current item and its file asset.
 * 2. Determine the next version number.
 * 3. Snapshot the current fileAssetId into item_versions.
 * 4. Upload the new file via uploadFile().
 * 5. Update items.fileAssetId to the new file asset.
 * 6. Log activity.
 */
export async function uploadNewVersion(
  itemId: string,
  workspaceId: string,
  userId: string,
  file: File,
  label?: string,
): Promise<ReturnType<typeof formatVersion>> {
  // Fetch current item (must not be deleted)
  const itemResult = await db
    .select({ item: items })
    .from(items)
    .where(and(eq(items.id, itemId), isNull(items.deletedAt)))
    .limit(1);

  if (itemResult.length === 0) {
    throw new NotFoundError("Item not found");
  }

  const item = itemResult[0].item;

  if (item.workspaceId !== workspaceId) {
    throw new ForbiddenError("Item does not belong to this workspace");
  }

  // Count existing snapshots to compute next versionNumber
  const existingVersions = await db
    .select({ version: itemVersions })
    .from(itemVersions)
    .where(eq(itemVersions.itemId, itemId));

  // versionNumber of the snapshot we are about to create = existingVersions.length + 1
  // (snapshot of the *current* version before replacing it)
  const nextSnapshotNumber = existingVersions.length + 1;

  // Upload new file asset
  const { fileAssetId: newFileAssetId } = await uploadFile(workspaceId, userId, file);

  const now = new Date();

  // Snapshot the current fileAssetId (if any) into item_versions
  if (item.fileAssetId) {
    await db.insert(itemVersions).values({
      itemId,
      workspaceId,
      fileAssetId: item.fileAssetId,
      createdBy: userId,
      versionNumber: nextSnapshotNumber,
      label: label ?? null,
      createdAt: now,
    });
  }

  // Update item to point at the new file asset
  await db
    .update(items)
    .set({ fileAssetId: newFileAssetId, updatedAt: now })
    .where(eq(items.id, itemId));

  logActivity({
    workspaceId,
    actorId: userId,
    action: "ITEM_VERSION_UPLOADED",
    targetType: "drop",
    targetId: itemId,
    metadata: { versionNumber: nextSnapshotNumber + 1, label },
  });

  // Return the newly created version snapshot
  const newVersionRows = await db
    .select({ version: itemVersions, fileAsset: fileAssets })
    .from(itemVersions)
    .leftJoin(fileAssets, eq(itemVersions.fileAssetId, fileAssets.id))
    .where(
      and(
        eq(itemVersions.itemId, itemId),
        eq(itemVersions.versionNumber, nextSnapshotNumber),
      ),
    )
    .limit(1);

  if (newVersionRows.length === 0) {
    // If there was no previous fileAssetId, return a minimal response
    const newAsset = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.id, newFileAssetId))
      .limit(1);

    return {
      id: "",
      itemId,
      workspaceId,
      fileAssetId: newFileAssetId,
      createdBy: userId,
      versionNumber: nextSnapshotNumber,
      label: label ?? null,
      createdAt: now.toISOString(),
      fileAsset: newAsset[0]
        ? {
            ...newAsset[0],
            downloadUrl: buildSignedUrl(newAsset[0].id),
            createdAt: newAsset[0].createdAt.toISOString(),
          }
        : null,
    };
  }

  return formatVersion(newVersionRows[0]);
}

/**
 * Revert an item to a specific past version.
 *
 * Flow:
 * 1. Validate that the version belongs to this item/workspace.
 * 2. Snapshot the *current* fileAssetId into item_versions.
 * 3. Set items.fileAssetId to the version's fileAssetId.
 * 4. Log activity.
 */
export async function revertToVersion(
  itemId: string,
  versionId: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  // Fetch the target version
  const versionRows = await db
    .select({ version: itemVersions })
    .from(itemVersions)
    .where(
      and(
        eq(itemVersions.id, versionId),
        eq(itemVersions.itemId, itemId),
        eq(itemVersions.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (versionRows.length === 0) {
    throw new NotFoundError("Version not found");
  }

  const targetVersion = versionRows[0].version;

  // Fetch current item
  const itemRows = await db
    .select({ item: items })
    .from(items)
    .where(and(eq(items.id, itemId), isNull(items.deletedAt)))
    .limit(1);

  if (itemRows.length === 0) {
    throw new NotFoundError("Item not found");
  }

  const item = itemRows[0].item;

  // Count existing snapshots for the new snapshot number
  const existingVersions = await db
    .select({ version: itemVersions })
    .from(itemVersions)
    .where(eq(itemVersions.itemId, itemId));

  const nextSnapshotNumber = existingVersions.length + 1;

  const now = new Date();

  // Snapshot the current fileAssetId before reverting
  if (item.fileAssetId) {
    await db.insert(itemVersions).values({
      itemId,
      workspaceId,
      fileAssetId: item.fileAssetId,
      createdBy: userId,
      versionNumber: nextSnapshotNumber,
      label: null,
      createdAt: now,
    });
  }

  // Revert item to target version's file asset
  await db
    .update(items)
    .set({ fileAssetId: targetVersion.fileAssetId, updatedAt: now })
    .where(eq(items.id, itemId));

  logActivity({
    workspaceId,
    actorId: userId,
    action: "ITEM_REVERTED",
    targetType: "drop",
    targetId: itemId,
    metadata: { revertedToVersionNumber: targetVersion.versionNumber },
  });
}
