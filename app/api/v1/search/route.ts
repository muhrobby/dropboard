import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { searchItems } from "@/services/search-service";
import { searchQuerySchema } from "@/lib/validations/search";
import {
  validationErrorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get("q"),
      workspaceId: searchParams.get("workspaceId"),
      type: searchParams.get("type") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    if (!parsed.success) {
      return validationErrorResponse("Invalid search parameters");
    }

    await requireWorkspaceMembership(session.user.id, parsed.data.workspaceId);

    const result = await searchItems(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return serverErrorResponse(error.message);
    }
    return serverErrorResponse("Internal server error");
  }
}
