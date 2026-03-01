import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { getItem } from "@/services/item-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { extractArticle } from "@/lib/article-extractor";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/items/[id]/read
 *
 * Fetches the article content from the item's URL using Readability.
 * Only works for items of type "link" that have a non-null `content` (the URL).
 * Requires auth + workspace membership.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const item = await getItem(id);
    await requireWorkspaceMembership(session.user.id, item.workspaceId);

    if (item.type !== "link") {
      return validationErrorResponse("Reader mode is only available for link items");
    }

    if (!item.content) {
      return validationErrorResponse("This link item has no URL");
    }

    const article = await extractArticle(item.content);

    return successResponse({
      itemId: id,
      url: item.content,
      ...article,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
