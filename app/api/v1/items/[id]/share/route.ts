import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  createShare,
  getShareByItemId,
  deleteShare,
} from "@/services/share-service";
import {
  createdResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;
    const body = await req.json().catch(() => ({}));

    // Get workspace from query or item lookup
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    await requireWorkspaceMembership(session.user.id, workspaceId);

    const expiryOption = body.expiryOption || "7d";
    const share = await createShare(
      itemId,
      session.user.id,
      workspaceId,
      expiryOption,
    );

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/share/${share.token}`;

    return createdResponse({
      ...share,
      shareUrl,
    });
  } catch (error) {
    console.error("Create share error:", error);
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse("Failed to create share link");
  }
}

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
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/share/${share.token}`;

    return NextResponse.json({
      success: true,
      data: { ...share, shareUrl },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}

export async function DELETE(
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
      return NextResponse.json({ success: true }, { status: 200 });
    }

    await deleteShare(share.id, session.user.id, workspaceId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
