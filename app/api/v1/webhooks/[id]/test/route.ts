import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { testWebhook } from "@/services/webhook-service";
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    const result = await testWebhook(id, workspaceId);

    return successResponse({
      success: result.success,
      status: result.responseStatus,
      duration: result.duration,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse();
  }
}
