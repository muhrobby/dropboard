import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { requirePermission } from "@/middleware/rbac";
import { sendTeamInviteEmail } from "@/lib/email";
import { getInviteByToken } from "@/services/invite-service";
import {
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { db } from "@/db";
import { workspaces, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId, inviteId } = await params;
    const body = await req.json();

    if (!body.email) {
      return validationErrorResponse("Email is required");
    }

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId,
    );
    requirePermission(member.role, "invite_members");

    // Get workspace name
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      return serverErrorResponse("Workspace not found");
    }

    // Get inviter name
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    // Get invite details
    const invite = await db.query.invites.findFirst({
      where: eq((await import("@/db/schema")).invites.id, inviteId),
    });

    if (!invite) {
      return serverErrorResponse("Invite not found");
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/invite/${invite.token}`;

    // Send email
    await sendTeamInviteEmail({
      to: body.email,
      inviteUrl,
      workspaceName: workspace.name,
      inviterName: inviter?.name || "A team member",
      role: invite.role,
    });

    return NextResponse.json(
      { success: true, message: "Invite email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Send invite email error:", error);
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse("Failed to send invite email");
  }
}
