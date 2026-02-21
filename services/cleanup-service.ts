/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { items, fileAssets, workspaces } from "@/db/schema";
import { eq, and, lte, or, sql, isNotNull } from "drizzle-orm";
import { deleteFile } from "@/lib/file-storage";

type CleanupResult = {
  deletedItems: number;
  deletedFiles: number;
  freedBytes: number;
};

/**
 * Delete expired items and their associated file assets.
 * Uses a two-phase commit approach: only deletes DB records if the physical
 * file was successfully deleted or didn't exist (ENOENT) to prevent storage leaks.
 * Updates workspace storage usage accordingly.
 */
export async function cleanupExpiredItems(): Promise<CleanupResult> {
  const now = new Date();
  let deletedItems = 0;
  let deletedFiles = 0;
  let freedBytes = 0;

  // Find all expired items or items that reached maxDownloads that are not pinned
  const expiredItems = await db
    .select({
      item: items,
      fileAsset: fileAssets,
    })
    .from(items)
    .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
    .where(
      and(
        eq(items.isPinned, false),
        or(
          lte(items.expiresAt, now),
          and(
            isNotNull(items.maxDownloads),
            sql`${items.downloadCount} >= ${items.maxDownloads}`
          )
        )
      )
    );

  if (expiredItems.length === 0) {
    return { deletedItems: 0, deletedFiles: 0, freedBytes: 0 };
  }

  // Group freed bytes by workspace for storage update
  const workspaceFreed: Record<string, number> = {};

  for (const row of expiredItems) {
    let fileDeletedSuccessfully = false;

    // Phase 1: Attempt physical file deletion FIRST
    if (row.fileAsset) {
      try {
        await deleteFile(row.fileAsset.storagePath);
        fileDeletedSuccessfully = true;
        deletedFiles++;
        freedBytes += row.fileAsset.sizeBytes;

        const wsId = row.fileAsset.workspaceId;
        workspaceFreed[wsId] = (workspaceFreed[wsId] || 0) + row.fileAsset.sizeBytes;
      } catch (err: any) {
        // If file doesn't exist (ENOENT), we can still proceed to delete DB row
        if (err.code === "ENOENT" || err.message?.includes("ENOENT")) {
          fileDeletedSuccessfully = true;
          // We consider it "freed" since the DB thought it was there
          const wsId = row.fileAsset.workspaceId;
          workspaceFreed[wsId] = (workspaceFreed[wsId] || 0) + row.fileAsset.sizeBytes;
        } else {
          console.error(`[Cleanup] Failed to delete file ${row.fileAsset.storagePath}:`, err);
        }
      }
    } else {
      // If there's no file asset attached, we can safely delete the item
      fileDeletedSuccessfully = true;
    }

    // Phase 2: Conditional DB Deletion (only if Phase 1 succeeded)
    if (fileDeletedSuccessfully) {
      // Delete item first to respect foreign key constraints
      await db.delete(items).where(eq(items.id, row.item.id));
      deletedItems++;

      // Then delete file asset record if it exists
      if (row.fileAsset) {
        await db.delete(fileAssets).where(eq(fileAssets.id, row.fileAsset.id));
      }
    }
  }

  // Phase 3: Update workspace storage used
  for (const [wsId, bytes] of Object.entries(workspaceFreed)) {
    if (bytes > 0) {
      await db
        .update(workspaces)
        .set({
          storageUsedBytes: sql`GREATEST(0, ${workspaces.storageUsedBytes} - ${bytes})`,
        })
        .where(eq(workspaces.id, wsId));
    }
  }

  return { deletedItems, deletedFiles, freedBytes };
}
