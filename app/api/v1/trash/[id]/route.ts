import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { restoreItem, permanentDeleteItem } from "@/services/item-service";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

// Restore item from trash
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get item to check workspace membership
    const [item] = await db
      .select({ workspaceId: items.workspaceId })
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    if (!item) {
      return notFoundResponse("Item not found");
    }

    await requireWorkspaceMembership(session.user.id, item.workspaceId);

    const restored = await restoreItem(id, session.user.id);
    return successResponse(restored);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// Permanently delete item
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get item to check workspace membership
    const [item] = await db
      .select({ workspaceId: items.workspaceId })
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    if (!item) {
      return notFoundResponse("Item not found");
    }

    await requireWorkspaceMembership(session.user.id, item.workspaceId);

    await permanentDeleteItem(id);
    return successResponse({ deleted: true, permanent: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
