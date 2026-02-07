import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { acceptInvite, getInviteByToken } from "@/services/invite-service";
import { notFoundResponse, createdResponse, serverErrorResponse } from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await requireAuth();
    const { token } = await params;

    const invite = await getInviteByToken(token);

    const member = await acceptInvite(token, session.user.id);

    return createdResponse(member);
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await getInviteByToken(token);

    return NextResponse.json(
      { success: true, data: invite },
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
