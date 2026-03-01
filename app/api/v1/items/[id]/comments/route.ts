import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listComments, createComment } from "@/services/comment-service";
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

const createCommentSchema = z.object({
  workspaceId: z.string().min(1),
  body: z.string().min(1).max(10000).trim(),
});

// GET /api/v1/items/[id]/comments?workspaceId=xxx
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";

    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);

    const comments = await listComments(itemId, workspaceId);
    return successResponse(comments);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// POST /api/v1/items/[id]/comments
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);

    const comment = await createComment({
      itemId,
      workspaceId: parsed.data.workspaceId,
      authorId: session.user.id,
      body: parsed.data.body,
    });

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
