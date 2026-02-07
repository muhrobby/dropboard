import { type NextRequest, NextResponse } from "next/server";
import { getShareByToken, recordShareAccess } from "@/services/share-service";
import { AppError } from "@/lib/errors";
import { buildSignedUrl } from "@/lib/file-storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { share, item, fileAsset } = await getShareByToken(token);

    // Record access
    await recordShareAccess(share.id);

    // Generate signed URL for file if it's a drop
    let fileAssetWithUrl = null;
    if (fileAsset) {
      const downloadUrl = buildSignedUrl(fileAsset.id);
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
          createdAt: share.createdAt,
        },
        item: {
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          note: item.note,
          tags: item.tags,
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
