import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  getCollection,
  updateCollection,
  deleteCollection,
} from "@/services/collection-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateCollectionSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(255).trim().optional(),
  parentId: z.string().nullable().optional(),
});

// PATCH /api/v1/collections/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);

    const col = await updateCollection(id, parsed.data.workspaceId, session.user.id, {
      name: parsed.data.name,
      parentId: parsed.data.parentId,
    });
    return successResponse(col);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// DELETE /api/v1/collections/[id]?workspaceId=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";
    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);

    // Verify collection exists and belongs to workspace before delete
    await getCollection(id, workspaceId);
    await deleteCollection(id, workspaceId, session.user.id);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
