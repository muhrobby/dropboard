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

    // Get file info
    const fileAsset = await getFileForDownload(id);

    // Read file from disk
    const fileBuffer = await readFile(fileAsset.absolutePath);

    // Return file as response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileAsset.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileAsset.originalName)}"`,
        "Content-Length": fileAsset.sizeBytes.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    return serverErrorResponse();
  }
}
