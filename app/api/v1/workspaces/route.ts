import { NextRequest } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import {
  listUserWorkspaces,
  createTeamWorkspace,
} from "@/services/workspace-service";
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createWorkspaceSchema } from "@/lib/validations/workspace";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireAuth();
    const workspaces = await listUserWorkspaces(session.user.id);
    return successResponse(workspaces);
  } catch (error) {
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const result = createWorkspaceSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => i.message)
        .join(", ");
      return validationErrorResponse(message);
    }

    const workspace = await createTeamWorkspace(
      session.user.id,
      result.data.name
    );
    return createdResponse(workspace);
  } catch (error) {
    if (error instanceof AppError) {
      return unauthorizedResponse(error.message);
    }
    return serverErrorResponse();
  }
}
