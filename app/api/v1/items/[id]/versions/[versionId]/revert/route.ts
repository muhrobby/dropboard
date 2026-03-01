import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { revertToVersion } from "@/services/version-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

// POST /api/v1/items/[id]/versions/[versionId]/revert
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: itemId, versionId } = await params;

    const body = await request.json();
    const workspaceId: string = body?.workspaceId ?? "";

    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);

    await revertToVersion(itemId, versionId, workspaceId, session.user.id);

    return successResponse({ reverted: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
