import { type NextRequest } from "next/server";
import { getPublicBoard } from "@/services/collection-service";
import { successResponse, notFoundResponse, serverErrorResponse } from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";

type RouteParams = { params: Promise<{ token: string }> };

// GET /api/v1/public/boards/[token] — no auth required
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token) return notFoundResponse("Board not found");
    const board = await getPublicBoard(token);
    return successResponse(board);
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse(error.message);
    return serverErrorResponse();
  }
}
