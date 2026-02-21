import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getFileForDownload } from "@/services/file-service";
import { verifySignedToken } from "@/lib/file-storage";
import {
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/middleware/auth-guard";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/v1/files/[id]?token=xxx&expires=xxx — Signed file download
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const expiresStr = searchParams.get("expires");

    if (!token || !expiresStr) {
      return unauthorizedResponse("Missing signed URL parameters");
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) {
      return unauthorizedResponse("Invalid expires parameter");
    }

    // Verify the signed token
    if (!verifySignedToken(id, token, expires)) {
      return unauthorizedResponse("Invalid or expired download link");
    }

    // Lookup associated item to check and increment download limits
    const relatedItem = await db.query.items.findFirst({
      where: eq(items.fileAssetId, id),
    });

    if (relatedItem) {
      // Check if current user is the owner (so viewing it on the dashboard doesn't consume limits)
      let isOwner = false;
      try {
        const session = await getSession();
        if (session && session.user && session.user.id === relatedItem.createdBy) {
          isOwner = true;
        }
      } catch (err) {
        // Ignore session errors here as it might be a public request
      }

      if (!isOwner) {
        if (
          relatedItem.maxDownloads !== null &&
          relatedItem.downloadCount >= relatedItem.maxDownloads
        ) {
          return unauthorizedResponse("Maximum download limit reached for this file");
        }

        // Increment download count
        await db
          .update(items)
          .set({ downloadCount: sql`${items.downloadCount} + 1` })
          .where(eq(items.id, relatedItem.id));
      }
    }

    // Get file info
    const fileAsset = await getFileForDownload(id);

    // Read file from disk
    const fileBuffer = await readFile(fileAsset.absolutePath);

    // Safe MIME types that can be rendered inline in the browser without XSS risk.
    // Notice: SVG is intentionally EXCLUDED because it can contain malicious <script> tags.
    const safeInlineMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/ogg",
      "application/pdf",
    ]);

    const isSafeInline = safeInlineMimeTypes.has(fileAsset.mimeType);
    const dispositionType = isSafeInline ? "inline" : "attachment";
    
    // Fallback mime type for unsafe files to prevent sniffing
    const responseMimeType = isSafeInline ? fileAsset.mimeType : "application/octet-stream";

    // Return file as response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": responseMimeType,
        "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(fileAsset.originalName)}"`,
        "Content-Length": fileAsset.sizeBytes.toString(),
        "Cache-Control": "private, max-age=3600",
        // Extra security headers for file serving
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    return serverErrorResponse();
  }
}
