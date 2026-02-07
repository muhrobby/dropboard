import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { uploadFile } from "@/services/file-service";
import { createItem } from "@/services/item-service";
import { createDropSchema } from "@/lib/validations/item";
import { isOcrSupported, queueOcr } from "@/services/ocr-service";
import {
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import {
  AppError,
  ForbiddenError,
  ValidationError,
  QuotaExceededError,
} from "@/lib/errors";
import { getClientIP, rateLimiters, RateLimitError } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Security: Apply rate limit untuk file upload
    // Mencegah flood attack dan abuse
    const ip = getClientIP(request);
    try {
      rateLimiters.upload(ip);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: error.message,
              retryAfter: Math.ceil((error.retryAfter - Date.now()) / 1000),
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil((error.retryAfter - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      throw error;
    }

    const session = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string | null;
    const title = (formData.get("title") as string) || "";
    const note = (formData.get("note") as string) || "";
    const tagsRaw = formData.get("tags") as string | null;
    const isPinnedRaw = formData.get("isPinned") as string | null;

    if (!file) {
      return validationErrorResponse("file is required");
    }

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    await requireWorkspaceMembership(session.user.id, workspaceId);

    // Parse tags from comma-separated string or JSON array
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    const isPinned = isPinnedRaw === "true";

    // Validate drop metadata
    const metaResult = createDropSchema.safeParse({
      title: title || file.name,
      note: note || undefined,
      tags,
      isPinned,
    });

    if (!metaResult.success) {
      const message = metaResult.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    // Upload file
    const uploadResult = await uploadFile(workspaceId, session.user.id, file);

    // Create item
    const item = await createItem({
      workspaceId,
      createdBy: session.user.id,
      type: "drop",
      title: metaResult.data.title,
      note: metaResult.data.note,
      tags: metaResult.data.tags,
      isPinned: metaResult.data.isPinned,
      fileAssetId: uploadResult.fileAssetId,
    });

    // Queue OCR for supported image types
    if (isOcrSupported(file.type)) {
      // Fire and forget - don't block upload response
      queueOcr(item.id).catch((err) => {
        console.error("Failed to queue OCR:", err);
      });
    }

    return createdResponse(item);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error.message);
    }
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 413 }
      );
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 403 }
      );
    }
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}
