import { type NextRequest, NextResponse } from "next/server";
import { getShareByToken, recordShareAccess, hashIp } from "@/services/share-service";
import { AppError } from "@/lib/errors";
import { buildSignedUrl } from "@/lib/file-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { share, item, fileAsset } = await getShareByToken(token);

    // Collect analytics metadata (privacy-preserving)
    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const ipHash = rawIp !== "unknown" ? hashIp(rawIp) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;
    const referer = req.headers.get("referer")?.slice(0, 512) ?? null;

    // Record access (fire-and-forget on analytics write; awaited for counter bump)
    await recordShareAccess(share.id, { ipHash: ipHash ?? undefined, userAgent: userAgent ?? undefined, referer: referer ?? undefined });

    // Share-level password protection takes precedence over item-level
    const isProtected = !!(share.passwordHash ?? item.passwordHash);

    // Generate signed URL for file if it's a drop and NOT protected
    let fileAssetWithUrl = null;
    if (fileAsset) {
      const downloadUrl = isProtected ? null : buildSignedUrl(fileAsset.id);
      fileAssetWithUrl = {
        id: fileAsset.id,
        originalName: fileAsset.originalName,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.sizeBytes,
        downloadUrl,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        share: {
          id: share.id,
          token: share.token,
          expiresAt: share.expiresAt,
          accessCount: share.accessCount + 1, // Include this access
          maxViews: share.maxViews,
          burnAfterReading: share.burnAfterReading,
          createdAt: share.createdAt,
        },
        item: {
          id: item.id,
          type: item.type,
          title: item.title,
          content: isProtected ? null : item.content,
          note: isProtected ? null : item.note,
          tags: item.tags,
          isProtected,
          createdAt: item.createdAt,
        },
        fileAsset: fileAssetWithUrl,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error("Get share error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get share" } },
      { status: 500 }
    );
  }
}
