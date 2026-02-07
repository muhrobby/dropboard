import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  updateMemberRole,
  removeMember,
} from "@/services/workspace-service";
import { updateMemberRoleSchema } from "@/lib/validations/invite";
import {
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId, userId } = await params;
    const body = await req.json();

    const validation = updateMemberRoleSchema.safeParse(body);
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

    const updatedMember = await updateMemberRole(
      workspaceId,
      userId,
      session.user.id,
      validation.data.role
    );

    return NextResponse.json(
      { success: true, data: updatedMember },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: workspaceId, userId } = await params;

    const member = await requireWorkspaceMembership(
      session.user.id,
      workspaceId
    );

    await removeMember(workspaceId, userId, session.user.id);

    return NextResponse.json(
      { success: true, data: { userId } },
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
