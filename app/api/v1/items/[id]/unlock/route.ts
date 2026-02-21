import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { getRawItem } from "@/services/item-service";
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import bcrypt from "bcrypt";
import { z } from "zod/v4";

const unlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();

    const result = unlockSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return validationErrorResponse(message);
    }

    const item = await getRawItem(id);

    await requireWorkspaceMembership(session.user.id, item.workspaceId);

    if (!item.passwordHash) {
      return validationErrorResponse("Item is not password protected");
    }

    const isValid = await bcrypt.compare(result.data.password, item.passwordHash);
    if (!isValid) {
      return unauthorizedResponse("Invalid password");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeItem } = item;

    return NextResponse.json(
      { success: true, data: { ...safeItem, isProtected: false } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return serverErrorResponse(error.message);
    }
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}
