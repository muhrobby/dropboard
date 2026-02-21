import { type NextRequest, NextResponse } from "next/server";
import { getShareByToken } from "@/services/share-service";
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ValidationError, NotFoundError } from "@/lib/errors";
import { buildSignedUrl } from "@/lib/file-storage";
import bcrypt from "bcrypt";
import { z } from "zod/v4";

const unlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    const result = unlockSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return validationErrorResponse(message);
    }

    const { share, item, fileAsset } = await getShareByToken(token);

    if (!item.passwordHash) {
      return validationErrorResponse("Item is not password protected");
    }

    const isValid = await bcrypt.compare(result.data.password, item.passwordHash);
    if (!isValid) {
      return unauthorizedResponse("Invalid password");
    }

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
          createdAt: share.createdAt,
        },
        item: {
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          note: item.note,
          tags: item.tags,
          isProtected: false,
          createdAt: item.createdAt,
        },
        fileAsset: fileAssetWithUrl,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error.message);
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error("Unlock share error:", error);
    return serverErrorResponse();
  }
}
