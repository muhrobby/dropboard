import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listTrashItems } from "@/services/item-service";
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import { z } from "zod/v4";

const querySchema = z.object({
  workspaceId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      workspaceId: searchParams.get("workspaceId"),
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    if (!parsed.success) {
      return validationErrorResponse("Invalid parameters");
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);

    const result = await listTrashItems(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse("Internal server error");
  }
}
