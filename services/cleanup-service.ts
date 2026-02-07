import { db } from "@/db";
import { items, fileAssets, workspaces } from "@/db/schema";
import { eq, lte, isNotNull, sql } from "drizzle-orm";
import { deleteFile } from "@/lib/file-storage";

type CleanupResult = {
  deletedItems: number;
  deletedFiles: number;
  freedBytes: number;
};

/**
 * Delete expired items and their associated file assets.
 * Updates workspace storage usage accordingly.
 */
export async function cleanupExpiredItems(): Promise<CleanupResult> {
  const now = new Date();
  let deletedItems = 0;
  let deletedFiles = 0;
  let freedBytes = 0;

  // Find all expired items
  const expiredItems = await db
    .select({
      item: items,
      fileAsset: fileAssets,
    })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(lte(items.expiresAt, now));

  if (expiredItems.length === 0) {
    return { deletedItems: 0, deletedFiles: 0, freedBytes: 0 };
  }

  // Group freed bytes by workspace for storage update
  const workspaceFreed: Record<string, number> = {};

  for (const row of expiredItems) {
    // Delete file from disk if exists
    if (row.fileAsset) {
      try {
        await deleteFile(row.fileAsset.storagePath);
        deletedFiles++;
        freedBytes += row.fileAsset.sizeBytes;

        const wsId = row.fileAsset.workspaceId;
        workspaceFreed[wsId] = (workspaceFreed[wsId] || 0) + row.fileAsset.sizeBytes;

        // Delete file asset record
        await db.delete(fileAssets).where(eq(fileAssets.id, row.fileAsset.id));
      } catch (err) {
        console.error(`Failed to delete file ${row.fileAsset.storagePath}:`, err);
      }
    }

    // Delete item
    await db.delete(items).where(eq(items.id, row.item.id));
    deletedItems++;
  }

  // Update workspace storage used
  for (const [wsId, bytes] of Object.entries(workspaceFreed)) {
    await db
      .update(workspaces)
      .set({
        storageUsedBytes: sql`GREATEST(0, ${workspaces.storageUsedBytes} - ${bytes})`,
      })
      .where(eq(workspaces.id, wsId));
  }

  return { deletedItems, deletedFiles, freedBytes };
}
