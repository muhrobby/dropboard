import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listCollections, createCollection } from "@/services/collection-service";
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import { z } from "zod";

const createCollectionSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(255).trim(),
  parentId: z.string().nullable().optional(),
});

// GET /api/v1/collections?workspaceId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";
    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);
    const data = await listCollections(workspaceId);
    return successResponse(data);
  } catch (error) {
    if (error instanceof ForbiddenError) return serverErrorResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// POST /api/v1/collections
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues.map((i) => i.message).join(", "));
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);
    const col = await createCollection({
      workspaceId: parsed.data.workspaceId,
      createdBy: session.user.id,
      name: parsed.data.name,
      parentId: parsed.data.parentId,
    });
    return createdResponse(col);
  } catch (error) {
    if (error instanceof ForbiddenError) return serverErrorResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
