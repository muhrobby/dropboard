import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "@/services/workspace-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await requireWorkspaceMembership(session.user.id, id);
    const workspace = await getWorkspace(id);
    return successResponse(workspace);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await requireWorkspaceMembership(session.user.id, id);

    const body = await request.json();
    const result = updateWorkspaceSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    const workspace = await updateWorkspace(id, session.user.id, result.data);
    return successResponse(workspace);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await requireWorkspaceMembership(session.user.id, id);
    await deleteWorkspace(id, session.user.id);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
