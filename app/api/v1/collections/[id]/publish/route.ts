import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { publishCollection, unpublishCollection } from "@/services/collection-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { z } from "zod/v4";

type RouteParams = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  workspaceId: z.string().min(1),
});

// PUT /api/v1/collections/[id]/publish — publish a collection as a public board
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues.map((i) => i.message).join(", "));
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);
    const col = await publishCollection(id, parsed.data.workspaceId, session.user.id);
    return successResponse(col);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// DELETE /api/v1/collections/[id]/publish?workspaceId=xxx — unpublish
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";
    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);
    const col = await unpublishCollection(id, workspaceId, session.user.id);
    return successResponse(col);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
