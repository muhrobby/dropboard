import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listActivity } from "@/services/activity-service";
import { requirePermission } from "@/middleware/rbac";
import { serverErrorResponse } from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const workspaceId = searchParams.get("workspaceId") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "workspaceId is required" } },
        { status: 400 }
      );
    }

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId
    );
    requirePermission(member.role, "view_activity");

    const result = await listActivity(workspaceId, { page, limit });

    return NextResponse.json(
      { success: true, data: result.logs, meta: result.meta },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
