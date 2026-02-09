import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { restoreItem, permanentDeleteItem } from "@/services/item-service";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
    successResponse,
    validationErrorResponse,
    forbiddenResponse,
    serverErrorResponse,
    unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import { z } from "zod/v4";

const batchSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(50),
});

// Batch restore items from trash
export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const parsed = batchSchema.safeParse(body);
        if (!parsed.success) {
            return validationErrorResponse("Invalid request body");
        }

        const { ids } = parsed.data;

        // Get items to check workspace membership
        const itemsToRestore = await db
            .select({ id: items.id, workspaceId: items.workspaceId })
            .from(items)
            .where(inArray(items.id, ids));

        if (itemsToRestore.length === 0) {
            return successResponse({ restored: 0 });
        }

        // Check workspace membership for all items (they should all be in the same workspace)
        const workspaceIds = [...new Set(itemsToRestore.map((item) => item.workspaceId))];
        for (const workspaceId of workspaceIds) {
            await requireWorkspaceMembership(session.user.id, workspaceId);
        }

        // Restore all items
        const results = await Promise.allSettled(
            itemsToRestore.map((item) => restoreItem(item.id, session.user.id))
        );

        const restored = results.filter((r) => r.status === "fulfilled").length;

        return successResponse({ restored, total: ids.length });
    } catch (error) {
        if (error instanceof ForbiddenError)
            return forbiddenResponse(error.message);
        if (error instanceof AppError) return unauthorizedResponse(error.message);
        return serverErrorResponse();
    }
}

// Batch permanently delete items
export async function DELETE(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const parsed = batchSchema.safeParse(body);
        if (!parsed.success) {
            return validationErrorResponse("Invalid request body");
        }

        const { ids } = parsed.data;

        // Get items to check workspace membership
        const itemsToDelete = await db
            .select({ id: items.id, workspaceId: items.workspaceId })
            .from(items)
            .where(inArray(items.id, ids));

        if (itemsToDelete.length === 0) {
            return successResponse({ deleted: 0, permanent: true });
        }

        // Check workspace membership for all items
        const workspaceIds = [...new Set(itemsToDelete.map((item) => item.workspaceId))];
        for (const workspaceId of workspaceIds) {
            await requireWorkspaceMembership(session.user.id, workspaceId);
        }

        // Permanently delete all items
        const results = await Promise.allSettled(
            itemsToDelete.map((item) => permanentDeleteItem(item.id))
        );

        const deleted = results.filter((r) => r.status === "fulfilled").length;

        return successResponse({ deleted, total: ids.length, permanent: true });
    } catch (error) {
        if (error instanceof ForbiddenError)
            return forbiddenResponse(error.message);
        if (error instanceof AppError) return unauthorizedResponse(error.message);
        return serverErrorResponse();
    }
}
