import { createHmac } from "crypto";
import { mkdir, writeFile, unlink, access } from "fs/promises";
import path from "path";
import { ulid } from "ulid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Security: SIGNED_URL_SECRET harus didefinisikan di environment variables
// Jangan gunakan fallback default karena ini adalah critical security issue
const SIGNED_URL_SECRET = (() => {
  const secret = process.env.SIGNED_URL_SECRET;
  if (!secret) {
    throw new Error(
      "SIGNED_URL_SECRET environment variable is required. " +
      "Please set it in your .env.local file with a strong random value (min 32 chars). " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  return secret;
})();

/**
 * Validate workspace ID to prevent path traversal attacks.
 * ULID format: 26 characters, Crockford base32 encoding
 * Pattern: [0-9A-HJKMNP-TV-Z]{26}
 */
function isValidWorkspaceId(workspaceId: string): boolean {
  // ULID regex: exactly 26 characters from Crockford base32 alphabet
  const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  return ULID_PATTERN.test(workspaceId);
}

/**
 * Sanitize and validate workspace directory path.
 * Prevents path traversal attacks like "../" or absolute paths.
 */
function getSafeWorkspacePath(workspaceId: string): string {
  if (!isValidWorkspaceId(workspaceId)) {
    throw new Error(
      "Invalid workspace ID format. " +
      "Workspace ID must be a valid ULID (26 alphanumeric characters)."
    );
  }

  const dirPath = path.join(UPLOADS_DIR, workspaceId);

  // Resolve to get absolute path and normalize ".." segments
  const resolvedPath = path.resolve(dirPath);

  // Ensure the resolved path is within UPLOADS_DIR
  const uploadsDirResolved = path.resolve(UPLOADS_DIR);

  if (!resolvedPath.startsWith(uploadsDirResolved)) {
    throw new Error(
      "Security violation: Attempted path traversal detected. " +
      "Workspace path must be within uploads directory."
    );
  }

  return resolvedPath;
}

/**
 * Ensure the upload directory for a workspace exists.
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save a file buffer to disk.
 * Returns { storedName, storagePath }.
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  workspaceId: string
): Promise<{ storedName: string; storagePath: string }> {
  // Security: Validate workspaceId to prevent path traversal
  const safeDirPath = getSafeWorkspacePath(workspaceId);

  const ext = path.extname(originalName);
  const storedName = `${ulid()}${ext}`;
  const filePath = path.join(safeDirPath, storedName);

  await ensureDir(safeDirPath);
  await writeFile(filePath, buffer);

  // Relative path from project root (still uses original workspaceId as it's validated)
  const storagePath = path.join("uploads", workspaceId, storedName);

  return { storedName, storagePath };
}

/**
 * Delete a file from disk by its storage path.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), storagePath);
  try {
    await unlink(fullPath);
  } catch {
    // File may already be deleted
  }
}

/**
 * Get the absolute file path from a storage path.
 */
export function getAbsolutePath(storagePath: string): string {
  return path.join(process.cwd(), storagePath);
}

/**
 * Generate a signed URL token for file download.
 * Token = HMAC-SHA256(secret, fileAssetId:expires)
 */
export function generateSignedToken(
  fileAssetId: string,
  expiresInSeconds: number = 3600
): { token: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const data = `${fileAssetId}:${expires}`;
  const token = createHmac("sha256", SIGNED_URL_SECRET)
    .update(data)
    .digest("hex");

  return { token, expires };
}

/**
 * Verify a signed URL token.
 */
export function verifySignedToken(
  fileAssetId: string,
  token: string,
  expires: number
): boolean {
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) return false;

  // Verify HMAC
  const data = `${fileAssetId}:${expires}`;
  const expectedToken = createHmac("sha256", SIGNED_URL_SECRET)
    .update(data)
    .digest("hex");

  return token === expectedToken;
}

/**
 * Build a signed download URL path.
 */
export function buildSignedUrl(
  fileAssetId: string,
  expiresInSeconds: number = 3600
): string {
  const { token, expires } = generateSignedToken(fileAssetId, expiresInSeconds);
  return `/api/v1/files/${fileAssetId}?token=${token}&expires=${expires}`;
}
