import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { getItem, pinItem, unpinItem } from "@/services/item-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/v1/items/[id]/pin — Pin item
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const existing = await getItem(id);
    await requireWorkspaceMembership(session.user.id, existing.workspaceId);
    const item = await pinItem(id);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// DELETE /api/v1/items/[id]/pin — Unpin item
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const existing = await getItem(id);
    await requireWorkspaceMembership(session.user.id, existing.workspaceId);
    const item = await unpinItem(id);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
