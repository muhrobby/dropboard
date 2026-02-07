import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  getItem,
  updateItem,
  deleteItem,
} from "@/services/item-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { updateItemSchema } from "@/lib/validations/item";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const item = await getItem(id);
    await requireWorkspaceMembership(session.user.id, item.workspaceId);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const existing = await getItem(id);
    await requireWorkspaceMembership(session.user.id, existing.workspaceId);

    const body = await request.json();
    const result = updateItemSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    const item = await updateItem(id, result.data);
    return successResponse(item);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const item = await getItem(id);
    await requireWorkspaceMembership(session.user.id, item.workspaceId);
    await deleteItem(id);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
