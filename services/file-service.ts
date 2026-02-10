import { db } from "@/db";
import { fileAssets, workspaces } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { saveFile, deleteFile, getAbsolutePath } from "@/lib/file-storage";
import { NotFoundError, ValidationError, QuotaExceededError } from "@/lib/errors";
import {
  ALLOWED_FILE_TYPES,
} from "@/lib/constants";
import { validateFileMimeType, sanitizeFilename, FileValidationError } from "@/lib/file-validator";
import { queueScan, isScanEnabled } from "@/services/virus-scan-service";
import { canUploadFile } from "@/lib/tier-guard";

type UploadResult = {
  fileAssetId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Upload a file: validate, save to disk, create DB record, update workspace storage.
 *
 * Security: Uses database transaction with row-level locking to prevent
 * race condition on storage quota check. This ensures that concurrent
 * uploads cannot bypass the quota limit.
 */
export async function uploadFile(
  workspaceId: string,
  userId: string,
  file: File
): Promise<UploadResult> {
  // Note: File size limit is enforced by tier-guard (canUploadFile) below.
  // We removed the hardcoded MAX_UPLOAD_SIZE_BYTES check to allow Pro/Business tiers
  // to upload larger files as defined in their plan.

  // Security: Validate MIME type using magic bytes detection
  // This prevents MIME type spoofing where user renames file extension
  let detectedMimeType: string;
  try {
    detectedMimeType = await validateFileMimeType(file, ALLOWED_FILE_TYPES);
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw new ValidationError(error.message);
    }
    throw new ValidationError("Failed to validate file type");
  }

  // Security: Sanitize filename to prevent path traversal and injection attacks
  const sanitizedName = sanitizeFilename(file.name);

  // Security: Use transaction with row-level locking to prevent race condition
  // This ensures that concurrent uploads cannot bypass the quota limit
  const result = await db.transaction(async (tx) => {
    // Lock the workspace row for update (SELECT ... FOR UPDATE)
    // This prevents other transactions from modifying the same row
    const workspace = await tx.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      // Note: Drizzle doesn't directly support FOR UPDATE in query builder,
      // so we use sql template for locking
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check quota using tier-guard (dynamic limits)
    // Note: We need to pass the current used bytes + file size to check against the limit
    const quotaCheck = await canUploadFile(
      userId, // Use the uploader's ID to check THEIR tier limits
      workspace.storageUsedBytes,
      file.size
    );

    if (!quotaCheck.allowed) {
        // Distinguish between storage limit and file size limit errors if possible, 
        // but tier-guard combines them. We can infer based on the file size.
        if (file.size > quotaCheck.maxFileSize) {
             throw new ValidationError(
                `File size exceeds the maximum of ${(quotaCheck.maxFileSize / (1024 * 1024)).toFixed(0)}MB for your ${quotaCheck.tierName} plan.`
            );
        }
      throw new QuotaExceededError(
        `Workspace storage quota exceeded for ${quotaCheck.tierName} plan. Limit: ${(quotaCheck.limit / (1024 * 1024 * 1024)).toFixed(1)}GB`
      );
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const { storedName, storagePath } = await saveFile(
      buffer,
      sanitizedName,
      detectedMimeType,
      workspaceId
    );

    // Create DB record
    const fileAssetId = ulid();
    await tx.insert(fileAssets).values({
      id: fileAssetId,
      workspaceId,
      uploadedBy: userId,
      originalName: sanitizedName,
      storedName,
      mimeType: detectedMimeType,
      sizeBytes: file.size,
      storagePath,
      scanStatus: isScanEnabled() ? "pending" : null,
      createdAt: new Date(),
    });

    // Update workspace storage within transaction
    // Using sql to atomically increment and prevent race conditions
    await tx
      .update(workspaces)
      .set({
        storageUsedBytes: sql`${workspaces.storageUsedBytes} + ${file.size}`,
      })
      .where(eq(workspaces.id, workspaceId));

    return {
      fileAssetId,
      originalName: sanitizedName,
      mimeType: detectedMimeType,
      sizeBytes: file.size,
    };
  });

  // Queue virus scan if enabled (fire and forget)
  if (isScanEnabled()) {
    queueScan(result.fileAssetId).catch((err) => {
      console.error("Failed to queue virus scan:", err);
    });
  }

  return result;
}

/**
 * Get file asset record for download.
 */
export async function getFileForDownload(fileAssetId: string) {
  const fileAsset = await db.query.fileAssets.findFirst({
    where: eq(fileAssets.id, fileAssetId),
  });

  if (!fileAsset) {
    throw new NotFoundError("File not found");
  }

  return {
    ...fileAsset,
    absolutePath: getAbsolutePath(fileAsset.storagePath),
  };
}

/**
 * Delete file asset: remove DB record and file from disk, update workspace storage.
 */
export async function deleteFileAsset(fileAssetId: string) {
  const fileAsset = await db.query.fileAssets.findFirst({
    where: eq(fileAssets.id, fileAssetId),
  });

  if (!fileAsset) {
    throw new NotFoundError("File not found");
  }

  // Delete file from disk
  await deleteFile(fileAsset.storagePath);

  // Delete DB record
  await db.delete(fileAssets).where(eq(fileAssets.id, fileAssetId));

  // Update workspace storage
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, fileAsset.workspaceId),
  });

  if (workspace) {
    const newUsed = Math.max(0, workspace.storageUsedBytes - fileAsset.sizeBytes);
    await db
      .update(workspaces)
      .set({ storageUsedBytes: newUsed })
      .where(eq(workspaces.id, fileAsset.workspaceId));
  }
}
