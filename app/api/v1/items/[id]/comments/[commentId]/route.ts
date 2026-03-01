import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { deleteComment } from "@/services/comment-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string; commentId: string }> };

// DELETE /api/v1/items/[id]/comments/[commentId]?workspaceId=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";

    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);

    await deleteComment(commentId, workspaceId, session.user.id);

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
