import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listMembers } from "@/services/workspace-service";
import { notFoundResponse, serverErrorResponse } from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId
    );

    const members = await listMembers(workspaceId);

    return NextResponse.json(
      { success: true, data: members },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      if (error.name === "NotFoundError") {
        return notFoundResponse(error.message);
      }
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
