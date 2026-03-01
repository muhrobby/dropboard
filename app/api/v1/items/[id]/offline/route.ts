import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { getItem, setAvailableOffline } from "@/services/item-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/v1/items/[id]/offline — Mark item as available offline
export async function POST(_request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const existing = await getItem(id);
    await requireWorkspaceMembership(session.user.id, existing.workspaceId);
    if (existing.type !== "drop" || !existing.fileAssetId) {
      return validationErrorResponse("Only file drops can be made available offline");
    }
    const item = await setAvailableOffline(id, true);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// DELETE /api/v1/items/[id]/offline — Remove offline availability
export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const existing = await getItem(id);
    await requireWorkspaceMembership(session.user.id, existing.workspaceId);
    const item = await setAvailableOffline(id, false);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
