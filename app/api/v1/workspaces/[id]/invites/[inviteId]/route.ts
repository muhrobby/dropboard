import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { cancelInvite } from "@/services/invite-service";
import { requirePermission } from "@/middleware/rbac";
import { notFoundResponse, serverErrorResponse } from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId, inviteId } = await params;

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId
    );
    requirePermission(member.role, "invite_members");

    await cancelInvite(workspaceId, inviteId, session.user.id);

    return NextResponse.json(
      { success: true, data: { id: inviteId } },
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
