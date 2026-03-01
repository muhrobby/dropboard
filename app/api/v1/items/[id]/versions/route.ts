import { type NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { listVersions, uploadNewVersion } from "@/services/version-service";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { AppError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/v1/items/[id]/versions?workspaceId=xxx
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";

    if (!workspaceId) return validationErrorResponse("workspaceId is required");

    await requireWorkspaceMembership(session.user.id, workspaceId);

    const versions = await listVersions(itemId, workspaceId);
    return successResponse(versions);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}

// POST /api/v1/items/[id]/versions  (multipart/form-data: file + workspaceId + label?)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: itemId } = await params;

    const formData = await request.formData();
    const workspaceId = formData.get("workspaceId");
    const file = formData.get("file");
    const label = formData.get("label");

    if (!workspaceId || typeof workspaceId !== "string") {
      return validationErrorResponse("workspaceId is required");
    }
    if (!file || !(file instanceof File)) {
      return validationErrorResponse("file is required");
    }

    await requireWorkspaceMembership(session.user.id, workspaceId);

    const version = await uploadNewVersion(
      itemId,
      workspaceId,
      session.user.id,
      file,
      label && typeof label === "string" ? label : undefined,
    );

    return successResponse(version);
  } catch (error) {
    if (error instanceof ValidationError) return validationErrorResponse(error.message);
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
