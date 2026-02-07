import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listInvites, createInvite } from "@/services/invite-service";
import { requirePermission } from "@/middleware/rbac";
import { createInviteSchema } from "@/lib/validations/invite";
import { createdResponse, validationErrorResponse, serverErrorResponse } from "@/lib/api-helpers";
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
    requirePermission(member.role, "invite_members");

    const invites = await listInvites(workspaceId);

    return NextResponse.json(
      { success: true, data: invites },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId } = await params;
    const body = await req.json();

    const validation = createInviteSchema.safeParse(body);
    if (!validation.success) {
      const message = validation.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId
    );
    requirePermission(member.role, "invite_members");

    const invite = await createInvite(
      workspaceId,
      session.user.id,
      validation.data
    );

    return createdResponse(invite);
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
