import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  createShare,
  getShareByItemId,
  updateShare,
  deleteShare,
} from "@/services/share-service";
import {
  createdResponse,
  serverErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { z } from "zod/v4";

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

    const share = await createShare(itemId, session.user.id, workspaceId, {
      expiryOption: body.expiryOption || "7d",
      password: body.password ?? undefined,
      maxViews: body.maxViews ?? null,
      burnAfterReading: body.burnAfterReading ?? false,
    });

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
      data: {
        ...share,
        shareUrl,
        isPasswordProtected: !!share.passwordHash,
      },
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

const patchShareSchema = z.object({
  password: z.string().nullable().optional(),
  maxViews: z.number().int().positive().nullable().optional(),
  burnAfterReading: z.boolean().optional(),
  expiryOption: z.enum(["1d", "7d", "30d", "never"]).optional(),
});

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const parsed = patchShareSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const share = await getShareByItemId(itemId);
    if (!share) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No active share found" } },
        { status: 404 },
      );
    }

    const updated = await updateShare(share.id, session.user.id, workspaceId, parsed.data);

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/share/${updated.token}`;

    return successResponse({
      ...updated,
      shareUrl,
      isPasswordProtected: !!updated.passwordHash,
    });
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
