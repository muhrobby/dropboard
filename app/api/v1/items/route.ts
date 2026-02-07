import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  listItems,
  createItem,
} from "@/services/item-service";
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import {
  listItemsQuerySchema,
  createLinkSchema,
  createNoteSchema,
} from "@/lib/validations/item";
import { fetchLinkTitle } from "@/lib/link-title";
import { AppError, ForbiddenError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const queryResult = listItemsQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId") ?? "",
      type: searchParams.get("type") ?? undefined,
      pinned: searchParams.get("pinned") ?? undefined,
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
    });

    if (!queryResult.success) {
      const message = queryResult.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    await requireWorkspaceMembership(
      session.user.id,
      queryResult.data.workspaceId
    );

    const result = await listItems(queryResult.data);

    return NextResponse.json(
      { success: true, data: result.data, meta: result.meta },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return serverErrorResponse(error.message);
    }
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { type, workspaceId, ...data } = body;

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    if (!type || !["link", "note"].includes(type)) {
      return validationErrorResponse(
        "type must be 'link' or 'note'. Use /api/v1/files/upload for drops."
      );
    }

    await requireWorkspaceMembership(session.user.id, workspaceId);

    if (type === "link") {
      const result = createLinkSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues
          .map((i) => i.message)
          .join(", ");
        return validationErrorResponse(message);
      }

      // Auto-fetch title if not provided
      const title =
        result.data.title || (await fetchLinkTitle(result.data.content));

      const item = await createItem({
        workspaceId,
        createdBy: session.user.id,
        type: "link",
        title,
        content: result.data.content,
        note: result.data.note,
        tags: result.data.tags,
        isPinned: true,
      });

      return createdResponse(item);
    }

    if (type === "note") {
      const result = createNoteSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues
          .map((i) => i.message)
          .join(", ");
        return validationErrorResponse(message);
      }

      const item = await createItem({
        workspaceId,
        createdBy: session.user.id,
        type: "note",
        title: result.data.title,
        content: result.data.content,
        tags: result.data.tags,
        isPinned: true,
      });

      return createdResponse(item);
    }

    return validationErrorResponse("Invalid item type");
  } catch (error) {
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}

// Need NextResponse for the paginated response
import { NextResponse } from "next/server";
