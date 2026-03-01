import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { getShareByItemId } from "@/services/share-service";
import { getShareAnalytics } from "@/services/share-analytics-service";
import { successResponse, serverErrorResponse, validationErrorResponse } from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    await requireWorkspaceMembership(session.user.id, workspaceId);

    const share = await getShareByItemId(itemId);
    if (!share) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No active share found" } },
        { status: 404 },
      );
    }

    const analytics = await getShareAnalytics(share.id, workspaceId);
    return successResponse(analytics);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 },
      );
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: 403 },
      );
    }
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
