import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import { z } from "zod/v4";
import { DEFAULT_RETENTION_DAYS } from "@/lib/constants";

const batchActionSchema = z.object({
  action: z.enum(["pin", "unpin", "delete"]),
  ids: z.array(z.string().min(1)).min(1).max(50),
  workspaceId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const parsed = batchActionSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("Invalid batch action parameters");
    }

    const { action, ids, workspaceId } = parsed.data;

    await requireWorkspaceMembership(session.user.id, workspaceId);

    // Verify all items belong to this workspace
    const itemsToUpdate = await db
      .select({ id: items.id, workspaceId: items.workspaceId })
      .from(items)
      .where(and(inArray(items.id, ids), eq(items.workspaceId, workspaceId)));

    if (itemsToUpdate.length !== ids.length) {
      return forbiddenResponse("Some items do not belong to this workspace");
    }

    const now = new Date();
    let updated = 0;

    switch (action) {
      case "pin":
        await db
          .update(items)
          .set({ isPinned: true, expiresAt: null, updatedAt: now })
          .where(inArray(items.id, ids));
        updated = ids.length;
        break;

      case "unpin":
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + DEFAULT_RETENTION_DAYS);
        await db
          .update(items)
          .set({ isPinned: false, expiresAt, updatedAt: now })
          .where(inArray(items.id, ids));
        updated = ids.length;
        break;

      case "delete":
        // Soft delete
        await db
          .update(items)
          .set({ deletedAt: now, updatedAt: now })
          .where(inArray(items.id, ids));
        updated = ids.length;
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        updated,
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError)
      return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse("Internal server error");
  }
}
